'use client';

import { useUser } from '@clerk/nextjs';
import { LoaderCircle, Mic, MicOff, Radio, Square, Video, VideoOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

type InterviewQuestion = {
  question: string;
  skillFocus: string;
};

type AnswerEvaluation = {
  score: number;
  strengths: string[];
  improvementAreas: string[];
  feedbackSummary: string;
  followUpQuestion: string;
};

type EvaluatedAnswer = {
  question: string;
  answer: string;
  evaluation: AnswerEvaluation;
};

export default function InterviewPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);

  const [permissionError, setPermissionError] = useState('');
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);

  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionError, setQuestionError] = useState('');
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [countdownValue, setCountdownValue] = useState(5);
  const [showCountdown, setShowCountdown] = useState(true);
  const [interviewStarted, setInterviewStarted] = useState(false);

  const [answerText, setAnswerText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState('');
  const [recordedAudioMimeType, setRecordedAudioMimeType] = useState('audio/webm');
  const [evaluatedAnswers, setEvaluatedAnswers] = useState<EvaluatedAnswer[]>([]);
  const [isEvaluatingAnswer, setIsEvaluatingAnswer] = useState(false);
  const [evaluationError, setEvaluationError] = useState('');

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace('/');
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    setCountdownValue(5);
    setShowCountdown(true);
    setInterviewStarted(false);

    const intervalId = setInterval(() => {
      setCountdownValue((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          setShowCountdown(false);
          setInterviewStarted(true);
          return 1;
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isLoaded, isSignedIn]);

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

    if (isLoaded && isSignedIn && interviewStarted) {
      setupMedia();
      loadQuestions();
    }

    return () => {
      mounted = false;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isLoaded, isSignedIn, interviewStarted]);

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

  const startAnswerCapture = () => {
    const stream = streamRef.current;
    if (!stream) {
      setEvaluationError('Media stream is not available. Please allow camera and microphone.');
      return;
    }

    setEvaluationError('');
    setRecordedAudioUrl('');
    setAnswerText('');

    if (typeof MediaRecorder === 'undefined') {
      setEvaluationError('Audio recording is not supported in this browser.');
      return;
    }

    recordedChunksRef.current = [];
    const audioTracks = stream.getAudioTracks();
    const audioOnlyStream = audioTracks.length > 0 ? new MediaStream(audioTracks) : null;

    if (!audioOnlyStream) {
      setEvaluationError('Microphone audio is not available. Please allow microphone access.');
      return;
    }

    const preferredMimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
    ];

    const supportedMimeType = preferredMimeTypes.find((type) => MediaRecorder.isTypeSupported(type));

    let recorder: MediaRecorder;
    try {
      recorder = supportedMimeType
        ? new MediaRecorder(audioOnlyStream, { mimeType: supportedMimeType })
        : new MediaRecorder(audioOnlyStream);
    } catch {
      setEvaluationError(
        'Could not initialize microphone recording on this device/browser. Try Chrome or Edge and allow mic access.',
      );
      return;
    }

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blobType = recorder.mimeType || supportedMimeType || 'audio/webm';
      const audioBlob = new Blob(recordedChunksRef.current, { type: blobType });
      if (audioBlob.size > 0) {
        const nextUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(nextUrl);
        setRecordedAudioMimeType(blobType);

        const formData = new FormData();
        const fileExtension = blobType.includes('mp4')
          ? 'mp4'
          : blobType.includes('ogg')
            ? 'ogg'
            : 'webm';
        formData.append('audio', audioBlob, `answer.${fileExtension}`);

        setIsTranscribing(true);
        fetch('/api/interview/transcribe', {
          method: 'POST',
          body: formData,
        })
          .then(async (response) => {
            const data = (await response.json().catch(() => ({}))) as { text?: string; error?: string };

            if (!response.ok) {
              throw new Error(data?.error || 'Failed to transcribe audio.');
            }

            const transcript = data.text?.trim() || '';
            if (transcript) {
              setAnswerText((prev) => {
                const existing = prev.trim();
                return existing.length > 0 ? `${existing} ${transcript}` : transcript;
              });
            }
          })
          .catch((error) => {
            const message =
              error instanceof Error ? error.message : 'Failed to transcribe audio.';
            setEvaluationError(message);
          })
          .finally(() => {
            setIsTranscribing(false);
          });
      }
    };

    recorder.onerror = () => {
      setEvaluationError(
        'Recording failed. Please check microphone permissions and try again.',
      );
      setIsRecording(false);
      setIsTranscribing(false);
    };

    mediaRecorderRef.current = recorder;
    try {
      recorder.start();
      setIsRecording(true);
    } catch {
      setEvaluationError(
        'Failed to start recording. Your browser may not support this recording format.',
      );
      return;
    }

  };

  const stopAnswerCapture = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
  };

  const submitAnswerForScoring = async () => {
    if (!currentQuestion) {
      return;
    }

    if (!answerText.trim()) {
      setEvaluationError('Please record or type an answer before submitting.');
      return;
    }

    try {
      setIsEvaluatingAnswer(true);
      setEvaluationError('');

      const response = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentQuestion: currentQuestion.question,
          userAnswer: answerText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to evaluate answer.');
      }

      const evaluation = data.evaluation as AnswerEvaluation;

      setEvaluatedAnswers((prev) => [
        {
          question: currentQuestion.question,
          answer: answerText,
          evaluation,
        },
        ...prev,
      ]);

      if (evaluation.followUpQuestion?.trim()) {
        setQuestions((prev) => {
          const exists = prev.some(
            (q) => q.question.trim().toLowerCase() === evaluation.followUpQuestion.trim().toLowerCase(),
          );

          if (exists) {
            return prev;
          }

          const next = [...prev];
          next.splice(currentQuestionIndex + 1, 0, {
            question: evaluation.followUpQuestion,
            skillFocus: 'Follow-up depth',
          });
          return next;
        });
      }

      setCurrentQuestionIndex((prev) => Math.min(prev + 1, Math.max(questions.length, 1)));
      setAnswerText('');
      setRecordedAudioUrl('');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to evaluate answer right now.';
      setEvaluationError(message);
    } finally {
      setIsEvaluatingAnswer(false);
    }
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
      {showCountdown ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center">
            <p className="mb-4 text-sm uppercase tracking-wider text-zinc-400">Interview starts in</p>
            <div
              key={countdownValue}
              className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-orange-400/40 bg-orange-500/20 text-5xl font-bold text-orange-300 animate-pulse-glow"
            >
              {countdownValue}
            </div>
          </div>
        </div>
      ) : null}

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

            <div className="mt-4 rounded-xl border border-zinc-800 bg-black/20 p-4">
              <p className="mb-3 text-sm font-medium text-zinc-200">Voice Answer Capture</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={startAnswerCapture}
                  disabled={isRecording}
                  className="inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Radio className="h-4 w-4" />
                  Start Recording
                </button>
                <button
                  onClick={stopAnswerCapture}
                  disabled={!isRecording}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Square className="h-4 w-4" />
                  Stop Recording
                </button>
              </div>

              <p className="mt-2 text-xs text-zinc-500">
                {isRecording
                  ? 'Recording in progress. Whisper transcription starts after you stop.'
                  : 'Use recording or type answer manually before submit.'}
                {isTranscribing ? ' Transcribing with Whisper...' : ' Whisper transcription ready.'}
              </p>

              {recordedAudioUrl ? (
                <audio controls className="mt-3 w-full">
                  <source src={recordedAudioUrl} type={recordedAudioMimeType} />
                </audio>
              ) : null}
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

                <div className="mt-4 rounded-xl border border-zinc-800 bg-black/20 p-4">
                  <p className="mb-2 text-sm font-medium text-zinc-200">Your Answer (transcript/editable)</p>
                  <textarea
                    value={answerText}
                    onChange={(event) => setAnswerText(event.target.value)}
                    rows={5}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none transition focus:border-orange-400"
                    placeholder="Speak or type your answer here..."
                  />
                  <button
                    onClick={submitAnswerForScoring}
                    disabled={isEvaluatingAnswer}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isEvaluatingAnswer ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    {isEvaluatingAnswer ? 'Scoring Answer...' : 'Submit & Score Answer'}
                  </button>
                </div>
              </>
            ) : null}

            {evaluationError ? (
              <p className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">
                {evaluationError}
              </p>
            ) : null}

            {evaluatedAnswers.length > 0 ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm font-semibold text-zinc-200">Answer Scores</p>
                {evaluatedAnswers.slice(0, 4).map((entry, index) => (
                  <div
                    key={`${entry.question}-${index}`}
                    className="rounded-xl border border-zinc-800 bg-black/20 p-3"
                  >
                    <p className="text-xs text-zinc-500">Question</p>
                    <p className="text-sm text-zinc-200">{entry.question}</p>
                    <p className="mt-2 text-xs text-zinc-500">Score</p>
                    <p className="text-lg font-semibold text-orange-300">{entry.evaluation.score}/100</p>
                    <p className="mt-2 text-xs text-zinc-500">Feedback</p>
                    <p className="text-sm text-zinc-300">{entry.evaluation.feedbackSummary}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
