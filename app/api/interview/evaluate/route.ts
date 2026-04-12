import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import {
  type ResumeInsights,
  evaluateAnswerWithGroq,
} from '@/lib/resume-analysis';

type EvaluateBody = {
  currentQuestion?: string;
  userAnswer?: string;
};

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
    const body = (await request.json()) as EvaluateBody;
    const currentQuestion = body.currentQuestion?.trim();
    const userAnswer = body.userAnswer?.trim();

    if (!currentQuestion || !userAnswer) {
      return NextResponse.json(
        { error: 'currentQuestion and userAnswer are required.' },
        { status: 400 },
      );
    }

    const db = await getMongoDb();
    const resumeDoc = await db.collection('resumeInsights').findOne({ userId });

    if (!resumeDoc?.insights) {
      return NextResponse.json(
        {
          error: 'Please upload and analyze your resume first from the Profile page.',
        },
        { status: 400 },
      );
    }

    const evaluation = await evaluateAnswerWithGroq({
      currentQuestion,
      userAnswer,
      resumeInsights: resumeDoc.insights as ResumeInsights,
    });

    const now = new Date();
    await db.collection('interviewAnswerEvaluations').insertOne({
      userId,
      currentQuestion,
      userAnswer,
      evaluation,
      createdAt: now,
    });

    return NextResponse.json({ evaluation });
  } catch (error) {
    const normalized = normalizeApiError(error);
    return NextResponse.json({ error: normalized.message }, { status: normalized.status });
  }
}
