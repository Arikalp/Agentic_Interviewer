import { auth } from '@clerk/nextjs/server';
import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

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
        'Audio transcription service is unavailable. Check GROQ_API_KEY and network access.',
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
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing GROQ_API_KEY in environment variables.' },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const audio = formData.get('audio');

    if (!(audio instanceof File)) {
      return NextResponse.json({ error: 'audio file is required.' }, { status: 400 });
    }

    const groq = new Groq({ apiKey });
    const transcription = await groq.audio.transcriptions.create({
      file: audio,
      model: 'whisper-large-v3-turbo',
    });

    return NextResponse.json({ text: transcription.text ?? '' });
  } catch (error) {
    const normalized = normalizeApiError(error);
    return NextResponse.json({ error: normalized.message }, { status: normalized.status });
  }
}