import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import {
  ensureIntroQuestionFirst,
  type InterviewDifficulty,
  type InterviewQuestion,
  type ResumeInsights,
  generateInterviewQuestionsWithGroq,
} from '@/lib/resume-analysis';

function normalizeDifficulty(value: unknown): InterviewDifficulty {
  if (value === 'easy' || value === 'medium' || value === 'hard') {
    return value;
  }

  return 'medium';
}

function normalizeApiError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unexpected server error.';

  if (
    message.includes('ECONNREFUSED') ||
    message.includes('ENOTFOUND') ||
    message.includes('querySrv') ||
    message.includes('tlsv1 alert internal error')
  ) {
    return {
      status: 503,
      message:
        'Database connection failed. Check MongoDB URI, Atlas network access, and DNS settings.',
    };
  }

  return { status: 500, message };
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      questionCount?: number;
      difficulty?: unknown;
    };
    const questionCount =
      typeof body.questionCount === 'number'
        ? Math.max(3, Math.min(10, Math.round(body.questionCount)))
        : 6;
    const difficulty = normalizeDifficulty(body.difficulty);

    const db = await getMongoDb();
    const resumeDoc = await db.collection('resumeInsights').findOne({ userId });

    if (!resumeDoc?.insights || !resumeDoc?.resumeHash) {
      return NextResponse.json(
        {
          error: 'Please upload and analyze your resume first from the Profile page.',
        },
        { status: 400 },
      );
    }

    const existingQuestionDoc = await db.collection('interviewQuestions').findOne({ userId });
    const existingQuestions = existingQuestionDoc?.questions;

    if (
      existingQuestionDoc?.resumeHash === resumeDoc.resumeHash &&
      ((existingQuestionDoc?.difficulty as InterviewDifficulty | undefined) ?? 'medium') ===
        difficulty &&
      Array.isArray(existingQuestions) &&
      existingQuestions.length >= questionCount
    ) {
      const introFirstQuestions = ensureIntroQuestionFirst(
        existingQuestions as InterviewQuestion[],
        questionCount,
      );

      return NextResponse.json({
        questions: introFirstQuestions,
        reused: true,
        difficulty,
      });
    }

    const generatedQuestions = await generateInterviewQuestionsWithGroq(
      resumeDoc.insights as ResumeInsights,
      questionCount,
      difficulty,
    );
    const questions = ensureIntroQuestionFirst(generatedQuestions, questionCount);

    const now = new Date();

    await db.collection('interviewQuestions').updateOne(
      { userId },
      {
        $set: {
          userId,
          resumeHash: resumeDoc.resumeHash,
          difficulty,
          questions,
          updatedAt: now,
          model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );

    return NextResponse.json({ questions, reused: false, difficulty });
  } catch (error) {
    const normalized = normalizeApiError(error);
    return NextResponse.json({ error: normalized.message }, { status: normalized.status });
  }
}
