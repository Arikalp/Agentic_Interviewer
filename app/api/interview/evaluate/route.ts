import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import type { BehaviorMetrics } from '@/lib/behavior-metrics';
import {
  type ResumeInsights,
  evaluateAnswerWithGroq,
} from '@/lib/resume-analysis';

// Interface representing the expected JSON request body for the evaluate API
type EvaluateBody = {
  currentQuestion?: string;
  userAnswer?: string;
  behaviorMetrics?: BehaviorMetrics | null;
};

/**
 * Normalizes various system and database errors into clean HTTP status codes and user-friendly messages.
 * Specifically checks for MongoDB connection errors to return a 503 Service Unavailable with helpful diagnostics.
 */
function normalizeApiError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unexpected server error.';

  // If the error message suggests MongoDB is unreachable or misconfigured
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

  // Fallback for general server-side errors
  return { status: 500, message };
}

/**
 * POST handler for /api/interview/evaluate
 * Authenticates the user, validates input, retrieves resume details, requests AI scoring/evaluation
 * of the user's answer, logs the response with behavior metrics in MongoDB, and returns the evaluation.
 */
export async function POST(request: Request) {
  // 1. Authenticate the request using Clerk session tokens
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Parse and validate the incoming request body
    const body = (await request.json()) as EvaluateBody;
    const currentQuestion = body.currentQuestion?.trim();
    const userAnswer = body.userAnswer?.trim();
    const behaviorMetrics = body.behaviorMetrics ?? null;

    if (!currentQuestion || !userAnswer) {
      return NextResponse.json(
        { error: 'currentQuestion and userAnswer are required.' },
        { status: 400 },
      );
    }

    // 3. Establish MongoDB database connection
    const db = await getMongoDb();
    
    // 4. Retrieve the candidate's parsed resume insights from MongoDB.
    // The resume insights are necessary because the AI evaluator compares candidate responses 
    // against their resume background (projects, skills, experience) for authenticity and detail.
    const resumeDoc = await db.collection('resumeInsights').findOne({ userId });

    if (!resumeDoc?.insights) {
      return NextResponse.json(
        {
          error: 'Please upload and analyze your resume first from the Profile page.',
        },
        { status: 400 },
      );
    }

    // 5. Ask the language model (via Groq) to evaluate the candidate's answer.
    // The model analyzes correctness, depth, relevance, and provides specific feedback
    // alongside a potential follow-up question.
    const evaluation = await evaluateAnswerWithGroq({
      currentQuestion,
      userAnswer,
      resumeInsights: resumeDoc.insights as ResumeInsights,
    });

    // 6. Record and persist the question, the answer, the AI feedback evaluation, 
    // and the facial/behavior metrics (from browser face analysis) into the database.
    const now = new Date();
    await db.collection('interviewAnswerEvaluations').insertOne({
      userId,
      currentQuestion,
      userAnswer,
      evaluation,
      behaviorMetrics,
      createdAt: now,
    });

    // 7. Send back the evaluation containing scores and AI feedback
    return NextResponse.json({ evaluation });
  } catch (error) {
    // 8. Catch, normalize, and log any unexpected server/DB errors
    const normalized = normalizeApiError(error);
    return NextResponse.json({ error: normalized.message }, { status: normalized.status });
  }
}
