import { auth } from '@clerk/nextjs/server';
import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { analyzeResumeWithGroq, normalizeResumeInsights } from '@/lib/resume-analysis';
import { extractResumeText } from '@/lib/resume-parser';

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
        `Database connection failed. Check MongoDB URI, Atlas network access, and DNS settings. Details: ${message}`,
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
    const doc = await db.collection('resumeInsights').findOne({ userId });

    if (!doc) {
      return NextResponse.json({ insights: null });
    }

    const normalizedInsights = normalizeResumeInsights(doc.insights);

    if (JSON.stringify(doc.insights) !== JSON.stringify(normalizedInsights)) {
      await db.collection('resumeInsights').updateOne(
        { userId },
        {
          $set: {
            insights: normalizedInsights,
            updatedAt: new Date(),
          },
        },
      );
    }

    return NextResponse.json({
      insights: normalizedInsights,
      metadata: {
        fileName: doc.fileName,
        fileType: doc.fileType,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (error) {
    const normalized = normalizeApiError(error);
    return NextResponse.json({ error: normalized.message }, { status: normalized.status });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const resumeFile = formData.get('resume');

    if (!(resumeFile instanceof File)) {
      return NextResponse.json({ error: 'Resume file is required.' }, { status: 400 });
    }

    const { text, detectedType } = await extractResumeText(resumeFile);

    if (text.length < 80) {
      return NextResponse.json(
        {
          error:
            'Resume text extraction failed or content is too short. Please upload a clearer resume.',
        },
        { status: 400 },
      );
    }

    const resumeHash = createHash('sha256').update(text).digest('hex');
    const db = await getMongoDb();
    const existing = await db.collection('resumeInsights').findOne(
      { userId },
      {
        projection: {
          resumeHash: 1,
          insights: 1,
          updatedAt: 1,
        },
      },
    );

    if (existing?.resumeHash === resumeHash && existing?.insights) {
      const normalizedInsights = normalizeResumeInsights(existing.insights);

      if (JSON.stringify(existing.insights) !== JSON.stringify(normalizedInsights)) {
        await db.collection('resumeInsights').updateOne(
          { userId },
          {
            $set: {
              insights: normalizedInsights,
              updatedAt: new Date(),
            },
          },
        );
      }

      return NextResponse.json({
        insights: normalizedInsights,
        updatedAt: existing.updatedAt,
        reused: true,
        message: 'Resume unchanged. Reused existing analysis to save cost.',
      });
    }

    const insights = normalizeResumeInsights(await analyzeResumeWithGroq(text));

    const now = new Date();

    await db.collection('resumeInsights').updateOne(
      { userId },
      {
        $set: {
          userId,
          resumeHash,
          fileName: resumeFile.name,
          fileType: detectedType,
          insights,
          updatedAt: now,
          model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );

    return NextResponse.json({ insights, updatedAt: now.toISOString() });
  } catch (error) {
    const normalized = normalizeApiError(error);
    return NextResponse.json({ error: normalized.message }, { status: normalized.status });
  }
}
