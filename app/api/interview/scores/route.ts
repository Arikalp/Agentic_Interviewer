import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';

type SessionAccumulator = {
  id: string;
  date: string;
  timestamp: number;
  scores: number[];
  questions: string[];
  averageScore: number;
  strengths: Set<string>;
  improvementAreas: Set<string>;
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

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getMongoDb();

    // Fetch all interview evaluations for this user, sorted by most recent first
    const evaluations = await db
      .collection('interviewAnswerEvaluations')
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    // Group by session (approximate by createdAt within 30 seconds)
    const sessions: SessionAccumulator[] = [];

    let currentSession: SessionAccumulator | null = null;

    for (const evalRecord of evaluations as any[]) {
      const evalDate = new Date(evalRecord.createdAt);
      const evalTimestamp = evalDate.getTime();
      const evalScore = evalRecord.evaluation?.score || 0;

      // Group evaluations from same interview session (within 30 seconds)
      if (!currentSession || Math.abs(currentSession.timestamp - evalTimestamp) > 30000) {
        if (currentSession) {
          // Calculate average score for previous session
          currentSession.averageScore =
            currentSession.scores.length > 0
              ? Math.round(currentSession.scores.reduce((a, b) => a + b, 0) / currentSession.scores.length)
              : 0;
          sessions.push(currentSession);
        }

        currentSession = {
          id: `sess-${evalTimestamp}`,
          date: evalDate.toLocaleString(),
          timestamp: evalTimestamp,
          scores: [evalScore],
          questions: [evalRecord.currentQuestion || ''],
          averageScore: evalScore,
          strengths: new Set(),
          improvementAreas: new Set(),
        };
      } else {
        currentSession.scores.push(evalScore);
        currentSession.questions.push(evalRecord.currentQuestion || '');
        if (evalRecord.evaluation?.strengths) {
          evalRecord.evaluation.strengths.forEach((s: string) => currentSession!.strengths.add(s));
        }
        if (evalRecord.evaluation?.improvementAreas) {
          evalRecord.evaluation.improvementAreas.forEach((a: string) =>
            currentSession!.improvementAreas.add(a),
          );
        }
      }
    }

    // Add final session
    if (currentSession) {
      currentSession.averageScore =
        currentSession.scores.length > 0
          ? Math.round(
              currentSession.scores.reduce((a, b) => a + b, 0) / currentSession.scores.length,
            )
          : 0;
      sessions.push(currentSession);
    }

    // Convert Sets to Arrays and format response
    const formattedSessions = sessions.map((session) => ({
      id: session.id,
      date: session.date,
      score: session.averageScore,
      questionsCount: session.questions.length,
      strengths: Array.from(session.strengths).slice(0, 3),
      improvementAreas: Array.from(session.improvementAreas).slice(0, 2),
    }));

    // Calculate overall average
    const overallAverage =
      sessions.length > 0
        ? Math.round(sessions.reduce((sum, s) => sum + s.averageScore, 0) / sessions.length)
        : 0;

    return NextResponse.json({
      sessions: formattedSessions,
      overallAverage,
      totalInterviews: sessions.length,
    });
  } catch (error) {
    const normalized = normalizeApiError(error);
    return NextResponse.json({ error: normalized.message }, { status: normalized.status });
  }
}
