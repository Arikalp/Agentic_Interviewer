'use client';

import { useUser } from '@clerk/nextjs';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

type InterviewQuestion = {
  question: string;
  skillFocus: string;
};

export default function InterviewPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [permissionError, setPermissionError] = useState('');
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);

  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionError, setQuestionError] = useState('');
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace('/');
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    let mounted = true;

    async function setupMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        setIsCameraOn(stream.getVideoTracks().some((track) => track.enabled));
        setIsMicOn(stream.getAudioTracks().some((track) => track.enabled));
      } catch {
        setPermissionError(
          'Camera and microphone permission is required to start interview mode. Please allow access and refresh.',
        );
      }
    }

    async function loadQuestions() {
      try {
        setIsLoadingQuestions(true);
        const response = await fetch('/api/interview/questions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ questionCount: 6 }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load interview questions.');
        }

        setQuestions((data.questions as InterviewQuestion[]) || []);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to load interview questions.';
        setQuestionError(message);
      } finally {
        setIsLoadingQuestions(false);
      }
    }

    if (isLoaded && isSignedIn) {
      setupMedia();
      loadQuestions();
    }

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isLoaded, isSignedIn]);

  const currentQuestion = useMemo(
    () => questions[currentQuestionIndex] || null,
    [questions, currentQuestionIndex],
  );

  const goToNextQuestion = () => {
    setCurrentQuestionIndex((prev) => Math.min(prev + 1, Math.max(questions.length - 1, 0)));
  };

  const goToPreviousQuestion = () => {
    setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0));
  };

  const toggleCamera = () => {
    const stream = streamRef.current;
    if (!stream) {
      return;
    }

    const videoTracks = stream.getVideoTracks();
    for (const track of videoTracks) {
      track.enabled = !track.enabled;
    }

    setIsCameraOn(videoTracks.some((track) => track.enabled));
  };

  const toggleMic = () => {
    const stream = streamRef.current;
    if (!stream) {
      return;
    }

    const audioTracks = stream.getAudioTracks();
    for (const track of audioTracks) {
      track.enabled = !track.enabled;
    }

    setIsMicOn(audioTracks.some((track) => track.enabled));
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="text-white">Loading interview room...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-white">Live Interview</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
          <section className="rounded-2xl border border-zinc-800 bg-[#101010] p-5">
            <p className="mb-3 text-sm text-zinc-400">Your camera feed (mic + camera required)</p>

            <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="aspect-video w-full object-cover"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={toggleCamera}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500"
              >
                {isCameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                {isCameraOn ? 'Camera On' : 'Camera Off'}
              </button>

              <button
                onClick={toggleMic}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500"
              >
                {isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                {isMicOn ? 'Mic On' : 'Mic Off'}
              </button>
            </div>

            {permissionError ? (
              <p className="mt-3 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">
                {permissionError}
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-linear-to-br from-[#1a1a1a] to-[#0f0f0f] p-6">
            <p className="mb-2 text-xs uppercase tracking-wider text-[#fb923c]">Groq Interviewer</p>

            {isLoadingQuestions ? (
              <p className="text-sm text-zinc-400">Generating resume-based interview questions...</p>
            ) : null}

            {questionError ? (
              <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">
                {questionError}
              </p>
            ) : null}

            {!isLoadingQuestions && !questionError && currentQuestion ? (
              <>
                <div className="mb-4 rounded-xl border border-zinc-800 bg-black/20 p-4">
                  <p className="mb-2 text-xs text-zinc-500">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </p>
                  <p className="text-base font-medium text-white">{currentQuestion.question}</p>
                  <p className="mt-3 text-xs text-zinc-400">Focus: {currentQuestion.skillFocus}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={goToPreviousQuestion}
                    disabled={currentQuestionIndex === 0}
                    className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={goToNextQuestion}
                    disabled={currentQuestionIndex >= questions.length - 1}
                    className="rounded-lg bg-linear-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next Question
                  </button>
                </div>
              </>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
