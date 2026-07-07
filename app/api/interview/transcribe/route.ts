import { auth } from '@clerk/nextjs/server';
import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';

// Explicitly define node runtime environment for executing high-resource file parsing
export const runtime = 'nodejs';

/**
 * Normalizes networking/API connection errors and returns clean diagnostic HTTP status codes/messages.
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
        'Audio transcription service is unavailable. Check GROQ_API_KEY and network access.',
    };
  }

  return { status: 500, message };
}

/**
 * POST handler for /api/interview/transcribe
 * Receives the recorded voice audio file as multipart form data from the client,
 * connects to Groq's speech-to-text service (Whisper), and returns the transcribed text.
 */
export async function POST(request: Request) {
  // 1. Authenticate user request
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Load API key from environment variables
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing GROQ_API_KEY in environment variables.' },
        { status: 500 },
      );
    }

    // 3. Extract the audio file from standard multipart Form Data
    const formData = await request.formData();
    const audio = formData.get('audio');

    if (!(audio instanceof File)) {
      return NextResponse.json({ error: 'audio file is required.' }, { status: 400 });
    }

    // 4. Initialize Groq SDK client
    const groq = new Groq({ apiKey });
    
    // 5. Call Groq audio transcription service using the OpenAI Whisper large v3 turbo model
    const transcription = await groq.audio.transcriptions.create({
      file: audio,
      model: 'whisper-large-v3-turbo',
    });

    // 6. Return transcription text back to client
    return NextResponse.json({ text: transcription.text ?? '' });
  } catch (error) {
    // 7. Gracefully catch and normalize API errors (like bad keys or timeout issues)
    const normalized = normalizeApiError(error);
    return NextResponse.json({ error: normalized.message }, { status: normalized.status });
  }
}