import { auth } from '@clerk/nextjs/server';
import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { analyzeResumeWithGroq, normalizeResumeInsights } from '@/lib/resume-analysis';
import { extractResumeText } from '@/lib/resume-parser';

// Maximum length of job description string allowed to be processed to prevent LLM prompt overflows
const MAX_JOB_DESCRIPTION_LENGTH = 8000;

/**
 * Normalizes DB connection errors and returns appropriate HTTP responses.
 */
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

/**
 * Helper to safely sanitize and trim job description inputs, capping length at MAX_JOB_DESCRIPTION_LENGTH.
 */
function normalizeJobDescription(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, MAX_JOB_DESCRIPTION_LENGTH);
}

/**
 * GET handler for /api/resume
 * Retrieves the currently logged-in user's resume insights and associated metadata (e.g., file name, last updated, target job description).
 * Ensures structural consistency of stored insights using `normalizeResumeInsights` and syncs them back if changed.
 */
export async function GET() {
  // 1. Authenticate user
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Fetch connection and retrieve user document from resumeInsights collection
    const db = await getMongoDb();
    const doc = await db.collection('resumeInsights').findOne({ userId });

    if (!doc) {
      return NextResponse.json({ insights: null });
    }

    // 3. Verify if user has already gone through full resume analysis (has hash and valid insights)
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

    // 4. Ensure that the retrieved insights match the current frontend UI structure expectations (normalizes fields)
    const normalizedInsights = normalizeResumeInsights(doc.insights);

    // 5. If the normalized layout differs from what was stored in DB, update DB to synchronize schemas
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

    // 6. Return the normalized insights along with files & job description metadata
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

/**
 * PATCH handler for /api/resume
 * Allows updating only the job description associated with the user's interview context.
 * Performs an upsert so that the user profile document is initialized if it does not yet exist.
 */
export async function PATCH(request: Request) {
  // 1. Authenticate user
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Parse job description input
    const body = (await request.json().catch(() => ({}))) as {
      jobDescription?: unknown;
    };
    const normalizedJobDescription = normalizeJobDescription(body.jobDescription);
    const now = new Date();
    
    // 3. Connect to database
    const db = await getMongoDb();

    // 4. Upsert the job description in the database for this specific userId
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

/**
 * POST handler for /api/resume
 * Handles uploading the resume file (PDF or text) and extracting text.
 * Calculates a SHA-256 hash of the extracted text. If the hash matches an already analyzed resume 
 * for the user, it skips expensive Llama/Groq AI processing and directly returns the cached insights.
 * Otherwise, calls the Groq AI service to extract structured metrics/experiences and updates the DB.
 */
export async function POST(request: Request) {
  // 1. Authenticate user
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Retrieve multi-part form data containing the file and job description
    const formData = await request.formData();
    const resumeFile = formData.get('resume');
    const jobDescriptionRaw = formData.get('jobDescription');
    const hasJobDescriptionInRequest = typeof jobDescriptionRaw === 'string';
    const normalizedJobDescriptionFromRequest = normalizeJobDescription(jobDescriptionRaw);

    if (!(resumeFile instanceof File)) {
      return NextResponse.json({ error: 'Resume file is required.' }, { status: 400 });
    }

    // 3. Parse and extract plain text from the uploaded PDF/document file
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

    // 4. Compute a content hash so we can detect unchanged resumes and
    // avoid re-calling the language model (saving API quota and cost).
    const resumeHash = createHash('sha256').update(text).digest('hex');
    const db = await getMongoDb();
    
    // 5. Look up current stored records to verify if we can reuse an existing analysis
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

    // 6. If the resume hash matches the existing one, skip LLM calls and return the saved data
    if (existing?.resumeHash === resumeHash && existing?.insights) {
      const normalizedInsights = normalizeResumeInsights(existing.insights);
      const shouldUpdateJobDescription = jobDescriptionToPersist !== existingJobDescription;
      let updatedAt = existing.updatedAt;

      // Update stored insights structure or job description if they have changed
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

    // 7. If the resume has changed, invoke Groq model to extract professional insights from raw text
    const insights = normalizeResumeInsights(await analyzeResumeWithGroq(text));

    const now = new Date();

    // 8. Upsert the new insights, fileName, fileType, hash, and metadata in the resumeInsights collection
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

    // 9. Return the fresh resume analysis structure
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
