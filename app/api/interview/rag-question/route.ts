import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { runInterviewRAG } from '@/langgraph/graph';
import { createInitialInterviewState } from '@/models/InterviewState';
import type { InterviewState } from '@/models/InterviewState';

/**
 * POST /api/interview/rag-question
 *
 * Generates the next adaptive interview question using the full RAG pipeline:
 *   - Resume vector search (resume_chunks)
 *   - Conversation memory vector search (conversation_memory_chunks)
 *   - Recent memory direct fetch
 *   - Planner heuristics
 *   - Groq question generation
 *   - Conversation turn storage
 *
 * Request body:
 * {
 *   sessionId: string;          // current interview session ID
 *   currentQuestion: string;    // the question the candidate just answered
 *   latestAnswer: string;       // the candidate's transcribed answer
 *   interviewState?: InterviewState; // optional — omit on the first turn
 * }
 *
 * Response:
 * {
 *   generatedQuestion: string;
 *   updatedInterviewState: InterviewState;
 * }
 */
export async function POST(request: Request) {
  // 1. Authenticate
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Parse body
    const body = (await request.json()) as {
      sessionId?: string;
      currentQuestion?: string;
      latestAnswer?: string;
      interviewState?: InterviewState;
    };

    const sessionId = body.sessionId?.trim();
    const currentQuestion = body.currentQuestion?.trim() ?? '';
    const latestAnswer = body.latestAnswer?.trim() ?? '';

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required.' }, { status: 400 });
    }

    // 3. Verify the user has an analyzed resume
    const db = await getMongoDb();
    const resumeDoc = await db.collection('resumeInsights').findOne(
      { userId },
      { projection: { insights: 1 } },
    );

    if (!resumeDoc?.insights) {
      return NextResponse.json(
        { error: 'Please upload and analyze your resume first from the Profile page.' },
        { status: 400 },
      );
    }

    // 4. Resolve interview state — use provided state or create a fresh one
    const interviewState: InterviewState =
      body.interviewState ?? createInitialInterviewState(userId, sessionId);

    // 5. Run the full LangGraph RAG pipeline
    const { generatedQuestion, updatedInterviewState } = await runInterviewRAG({
      userId,
      sessionId,
      currentQuestion,
      latestAnswer,
      interviewState,
    });

    // 6. Return the generated question and updated state
    return NextResponse.json({
      generatedQuestion,
      updatedInterviewState,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected error generating question.';
    console.error('[RAG Question API]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
