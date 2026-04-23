import { auth } from '@clerk/nextjs/server';
import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { analyzeResumeWithGroq, normalizeResumeInsights } from '@/lib/resume-analysis';
import { extractResumeText } from '@/lib/resume-parser';

const MAX_JOB_DESCRIPTION_LENGTH = 8000;

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

function normalizeJobDescription(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, MAX_JOB_DESCRIPTION_LENGTH);
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

    const hasAnalyzedResume =
      typeof doc.resumeHash === 'string' && doc.resumeHash.length > 0 && Boolean(doc.insights);

    if (!hasAnalyzedResume) {
      return NextResponse.json({
        insights: null,
        metadata: {
          fileName: doc.fileName,
          fileType: doc.fileType,
          updatedAt: doc.updatedAt,
          jobDescription: normalizeJobDescription(doc.jobDescription),
        },
      });
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
        jobDescription: normalizeJobDescription(doc.jobDescription),
      },
    });
  } catch (error) {
    const normalized = normalizeApiError(error);
    return NextResponse.json({ error: normalized.message }, { status: normalized.status });
  }
}

export async function PATCH(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      jobDescription?: unknown;
    };
    const normalizedJobDescription = normalizeJobDescription(body.jobDescription);
    const now = new Date();
    const db = await getMongoDb();

    await db.collection('resumeInsights').updateOne(
      { userId },
      {
        $set: {
          userId,
          jobDescription: normalizedJobDescription,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );

    return NextResponse.json({
      message: 'Job description saved.',
      jobDescription: normalizedJobDescription,
      updatedAt: now.toISOString(),
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
    const jobDescriptionRaw = formData.get('jobDescription');
    const hasJobDescriptionInRequest = typeof jobDescriptionRaw === 'string';
    const normalizedJobDescriptionFromRequest = normalizeJobDescription(jobDescriptionRaw);

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
          jobDescription: 1,
        },
      },
    );
    const existingJobDescription = normalizeJobDescription(existing?.jobDescription);
    const jobDescriptionToPersist = hasJobDescriptionInRequest
      ? normalizedJobDescriptionFromRequest
      : existingJobDescription;

    if (existing?.resumeHash === resumeHash && existing?.insights) {
      const normalizedInsights = normalizeResumeInsights(existing.insights);
      const shouldUpdateJobDescription = jobDescriptionToPersist !== existingJobDescription;
      let updatedAt = existing.updatedAt;

      if (
        JSON.stringify(existing.insights) !== JSON.stringify(normalizedInsights) ||
        shouldUpdateJobDescription
      ) {
        const now = new Date();
        await db.collection('resumeInsights').updateOne(
          { userId },
          {
            $set: {
              insights: normalizedInsights,
              jobDescription: jobDescriptionToPersist,
              updatedAt: now,
            },
          },
        );

        updatedAt = now;
      }

      return NextResponse.json({
        insights: normalizedInsights,
        updatedAt,
        jobDescription: jobDescriptionToPersist,
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
          jobDescription: jobDescriptionToPersist,
          updatedAt: now,
          model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );

    return NextResponse.json({
      insights,
      updatedAt: now.toISOString(),
      jobDescription: jobDescriptionToPersist,
    });
  } catch (error) {
    const normalized = normalizeApiError(error);
    return NextResponse.json({ error: normalized.message }, { status: normalized.status });
  }
}
