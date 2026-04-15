'use client';

import { useUser } from '@clerk/nextjs';
import { LoaderCircle, Mic, MicOff, Video, VideoOff, Volume2, VolumeX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

type InterviewQuestion = {
  question: string;
  skillFocus: string;
};

type InterviewDifficulty = 'easy' | 'medium' | 'hard';

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

type InterviewPhase =
  | 'booting'
  | 'ready'
  | 'recording'
  | 'transcribing'
  | 'scoring'
  | 'review'
  | 'complete';

const MIN_ANSWER_WINDOW_MS = 20000;
const MAX_ANSWER_WINDOW_MS = 120000;
const REVIEW_DELAY_MS = 1600;
const QUESTION_SPEECH_RATE = 1;

function computeDynamicAnswerWindowMs(input: {
  question: InterviewQuestion;
  difficulty: InterviewDifficulty;
}): number {
  const rawQuestion = input.question.question || '';
  const wordCount = rawQuestion
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  // Base time + per-word budget. Harder rounds get more buffer.
  const baseMsByDifficulty: Record<InterviewDifficulty, number> = {
    easy: 20000,
    medium: 28000,
    hard: 36000,
  };

  const perWordMsByDifficulty: Record<InterviewDifficulty, number> = {
    easy: 700,
    medium: 900,
    hard: 1100,
  };

  const introBonusMs =
    input.question.skillFocus.toLowerCase().includes('introduction') ||
    rawQuestion.toLowerCase().includes('tell me about yourself')
      ? 10000
      : 0;

  const computed =
    baseMsByDifficulty[input.difficulty] +
    wordCount * perWordMsByDifficulty[input.difficulty] +
    introBonusMs;

  return Math.max(MIN_ANSWER_WINDOW_MS, Math.min(MAX_ANSWER_WINDOW_MS, computed));
}

export default function InterviewPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reviewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const [permissionError, setPermissionError] = useState('');
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(true);
  const [hasConfirmedStart, setHasConfirmedStart] = useState(false);

  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionError, setQuestionError] = useState('');
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [countdownValue, setCountdownValue] = useState(5);
  const [showCountdown, setShowCountdown] = useState(true);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [phase, setPhase] = useState<InterviewPhase>('booting');

  const [answerText, setAnswerText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState('');
  const [recordedAudioMimeType, setRecordedAudioMimeType] = useState('audio/webm');
  const [evaluatedAnswers, setEvaluatedAnswers] = useState<EvaluatedAnswer[]>([]);
  const [isEvaluatingAnswer, setIsEvaluatingAnswer] = useState(false);
  const [evaluationError, setEvaluationError] = useState('');
  const [isQuestionVoiceOn, setIsQuestionVoiceOn] = useState(true);
  const [selectedDifficulty, setSelectedDifficulty] = useState<InterviewDifficulty>('medium');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const value = new URLSearchParams(window.location.search).get('difficulty');

    if (value === 'easy' || value === 'medium' || value === 'hard') {
      setSelectedDifficulty(value);
      return;
    }

    setSelectedDifficulty('medium');
  }, []);

  const waitForSpeechVoices = async (): Promise<void> => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }

    const voices = window.speechSynthesis.getVoices();

    if (voices.length > 0) {
      return;
    }

    await new Promise<void>((resolve) => {
      const onVoicesChanged = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
        clearTimeout(timeoutId);
        resolve();
      };

      const timeoutId = setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
        resolve();
      }, 1200);

      window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
    });
  };

  const clearPendingTimers = () => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    if (reviewTimeoutRef.current) {
      clearTimeout(reviewTimeoutRef.current);
      reviewTimeoutRef.current = null;
    }
  };

  const stopQuestionSpeech = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }

    speechUtteranceRef.current = null;
    window.speechSynthesis.cancel();
  };

  const speakQuestion = async (text: string): Promise<void> => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !isQuestionVoiceOn) {
      return;
    }

    await waitForSpeechVoices();

    await new Promise<void>((resolve) => {
      stopQuestionSpeech();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = QUESTION_SPEECH_RATE;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onend = () => {
        speechUtteranceRef.current = null;
        resolve();
      };
      utterance.onerror = () => {
        speechUtteranceRef.current = null;
        resolve();
      };

      speechUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    });
  };

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace('/auth/login');
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !hasConfirmedStart) {
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
  }, [isLoaded, isSignedIn, hasConfirmedStart]);

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
        setMediaReady(true);
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
          body: JSON.stringify({ questionCount: 6, difficulty: selectedDifficulty }),
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
      clearPendingTimers();

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isLoaded, isSignedIn, interviewStarted, selectedDifficulty]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !interviewStarted) {
      return;
    }

    if (mediaReady && !isLoadingQuestions && questions.length > 0 && !questionError) {
      setPhase('ready');
      return;
    }

    if (questionError) {
      setPhase('complete');
    }
  }, [isLoaded, isSignedIn, interviewStarted, mediaReady, isLoadingQuestions, questions.length, questionError]);

  useEffect(() => {
    return () => {
      clearPendingTimers();
      stopQuestionSpeech();

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const currentQuestion = useMemo(
    () => questions[currentQuestionIndex] || null,
    [questions, currentQuestionIndex],
  );

  const currentAnswerWindowMs = useMemo(() => {
    if (!currentQuestion) {
      return MIN_ANSWER_WINDOW_MS;
    }

    return computeDynamicAnswerWindowMs({
      question: currentQuestion,
      difficulty: selectedDifficulty,
    });
  }, [currentQuestion, selectedDifficulty]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !interviewStarted) {
      return;
    }

    if (!isLoadingQuestions && !questionError && questions.length > 0 && currentQuestionIndex >= questions.length) {
      clearPendingTimers();
      setPhase('complete');
    }
  }, [
    isLoaded,
    isSignedIn,
    interviewStarted,
    isLoadingQuestions,
    questionError,
    questions.length,
    currentQuestionIndex,
  ]);

  useEffect(() => {
    if (phase !== 'ready' || !currentQuestion || !streamRef.current) {
      return;
    }

    let cancelled = false;

    const startQuestionFlow = async () => {
      await speakQuestion(currentQuestion.question);

      if (cancelled) {
        return;
      }

      setEvaluationError('');
      setRecordedAudioUrl('');
      setRecordedAudioMimeType('audio/webm');
      setAnswerText('');
      setIsTranscribing(false);

      const stream = streamRef.current;
      if (!stream) {
        setEvaluationError('Microphone stream is not available. Please refresh and try again.');
        setPhase('complete');
        return;
      }

      const audioTracks = stream.getAudioTracks();
      const audioOnlyStream = audioTracks.length > 0 ? new MediaStream(audioTracks) : null;

      if (!audioOnlyStream) {
        setEvaluationError('Microphone audio is not available. Please allow microphone access.');
        setPhase('complete');
        return;
      }

      if (typeof MediaRecorder === 'undefined') {
        setEvaluationError('Audio recording is not supported in this browser.');
        setPhase('complete');
        return;
      }

      recordedChunksRef.current = [];
      const preferredMimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ];

      const supportedMimeType = preferredMimeTypes.find((type) =>
        MediaRecorder.isTypeSupported(type),
      );

      let recorder: MediaRecorder;
      try {
        recorder = supportedMimeType
          ? new MediaRecorder(audioOnlyStream, { mimeType: supportedMimeType })
          : new MediaRecorder(audioOnlyStream);
      } catch {
        setEvaluationError(
          'Could not initialize microphone recording on this device/browser. Try Chrome or Edge and allow mic access.',
        );
        setPhase('complete');
        return;
      }

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = async () => {
      clearPendingTimers();
      setIsRecording(false);

      const blobType = recorder.mimeType || supportedMimeType || 'audio/webm';
      const audioBlob = new Blob(recordedChunksRef.current, { type: blobType });

      if (audioBlob.size <= 0) {
        setEvaluationError('No audio was captured for this question.');
        setPhase('review');
        reviewTimeoutRef.current = setTimeout(() => {
          setCurrentQuestionIndex((prev) => prev + 1);
          setPhase('ready');
        }, REVIEW_DELAY_MS);
        return;
      }

      const nextUrl = URL.createObjectURL(audioBlob);
      setRecordedAudioUrl(nextUrl);
      setRecordedAudioMimeType(blobType);
      setIsTranscribing(true);
      setPhase('transcribing');

      const formData = new FormData();
      const fileExtension = blobType.includes('mp4')
        ? 'mp4'
        : blobType.includes('ogg')
          ? 'ogg'
          : 'webm';
      formData.append('audio', audioBlob, `answer.${fileExtension}`);

      let transcript = '';

      try {
        const response = await fetch('/api/interview/transcribe', {
          method: 'POST',
          body: formData,
        });

        const data = (await response.json().catch(() => ({}))) as {
          text?: string;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to transcribe audio.');
        }

        transcript = data.text?.trim() || '';
        setAnswerText(transcript);
      } catch (error) {
        transcript = 'Transcription unavailable.';
        setAnswerText(transcript);
        setEvaluationError(
          error instanceof Error ? error.message : 'Failed to transcribe audio.',
        );
      } finally {
        setIsTranscribing(false);
      }

      setPhase('scoring');
      setIsEvaluatingAnswer(true);

      const answerToScore = transcript.trim() || 'Transcription unavailable.';

      try {
        const response = await fetch('/api/interview/evaluate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            currentQuestion: currentQuestion.question,
            userAnswer: answerToScore,
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
            answer: answerToScore,
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
      } catch (error) {
        setEvaluationError(
          error instanceof Error ? error.message : 'Unable to evaluate answer right now.',
        );
      } finally {
        setIsEvaluatingAnswer(false);
      }

      setPhase('review');
      reviewTimeoutRef.current = setTimeout(() => {
        setCurrentQuestionIndex((prev) => prev + 1);
        setPhase('ready');
      }, REVIEW_DELAY_MS);
    };

      mediaRecorderRef.current = recorder;

      try {
        recorder.start();
        setIsRecording(true);
        setPhase('recording');
      } catch {
        setEvaluationError(
          'Failed to start recording. Your browser may not support this recording format.',
        );
        setPhase('complete');
        return;
      }

      recordingTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, currentAnswerWindowMs);
    };

    void startQuestionFlow();

    return () => {
      cancelled = true;
      stopQuestionSpeech();
    };
  }, [phase, currentQuestion, currentQuestionIndex, isQuestionVoiceOn, currentAnswerWindowMs]);

  useEffect(() => {
    if (isQuestionVoiceOn) {
      return;
    }

    stopQuestionSpeech();
  }, [isQuestionVoiceOn]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="text-white">Loading interview room...</div>
      </div>
    );
  }

  const phaseLabel =
    phase === 'booting'
      ? 'Preparing'
      : phase === 'ready'
        ? 'Auto flow armed'
        : phase === 'recording'
          ? 'Recording'
          : phase === 'transcribing'
            ? 'Transcribing'
            : phase === 'scoring'
              ? 'Scoring'
              : phase === 'review'
                ? 'Advancing'
                : 'Complete';

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-8 sm:px-6 lg:px-8">
      {showConfirmation && !hasConfirmedStart ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="rounded-2xl border border-white/10 bg-black p-8 max-w-md">
            <h2 className="text-2xl font-bold text-white mb-4">Ready to start?</h2>
            <p className="text-zinc-400 mb-6">
              Make sure your camera and microphone are properly positioned. Each question has a dynamic answer window based on difficulty and complexity.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setHasConfirmedStart(true);
                }}
                className="flex-1 rounded-lg bg-linear-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:shadow-lg hover:shadow-orange-500/50"
              >
                Start Interview
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showCountdown && !showConfirmation ? (
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
          <div>
            <h1 className="text-3xl font-bold text-white">Live Interview</h1>
            <p className="mt-1 text-sm text-zinc-400">
              The interview runs automatically from question to transcription to scoring.
            </p>
            <p className="mt-1 text-xs uppercase tracking-wider text-orange-300">
              Difficulty: {selectedDifficulty}
            </p>
          </div>
          {!showConfirmation ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsQuestionVoiceOn((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white"
              >
                {isQuestionVoiceOn ? (
                  <Volume2 className="h-4 w-4 text-orange-300" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
                Question Voice {isQuestionVoiceOn ? 'On' : 'Off'}
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white"
              >
                Back to Dashboard
              </button>
            </div>
          ) : null}
        </div>

        {hasConfirmedStart && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
          <section className="rounded-2xl border border-zinc-800 bg-[#101010] p-5">
            <p className="mb-3 text-sm text-zinc-400">Your camera feed and automatic microphone capture</p>

            <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="aspect-video w-full object-cover"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-3 py-1.5">
                {isCameraOn ? <Video className="h-3.5 w-3.5 text-orange-300" /> : <VideoOff className="h-3.5 w-3.5" />}
                Camera {isCameraOn ? 'On' : 'Off'}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-3 py-1.5">
                {isMicOn ? <Mic className="h-3.5 w-3.5 text-orange-300" /> : <MicOff className="h-3.5 w-3.5" />}
                Mic {isMicOn ? 'On' : 'Off'}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-3 py-1.5 text-orange-300">
                {phase === 'recording' || phase === 'transcribing' || phase === 'scoring' ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                {phaseLabel}
              </span>
            </div>

            <div className="mt-4 rounded-xl border border-zinc-800 bg-black/20 p-4">
              <p className="mb-3 text-sm font-medium text-zinc-200">Automatic answer pipeline</p>
              <p className="text-xs text-zinc-500">
                Each question gets a dynamic recording window (about {Math.round(currentAnswerWindowMs / 1000)} seconds for the current prompt), then
                Whisper transcribes it and the evaluator scores it automatically.
              </p>
              <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-sm text-zinc-200">
                {answerText ? answerText : 'Transcript will appear here automatically.'}
              </div>
              <div className="mt-3 text-xs text-zinc-500">
                {isRecording
                  ? 'Recording answer now...'
                  : isTranscribing
                    ? 'Transcribing with Whisper...'
                    : isEvaluatingAnswer
                      ? 'Scoring answer...'
                      : phase === 'review'
                        ? 'Advancing to the next question...'
                        : phase === 'complete'
                          ? 'Interview complete.'
                          : 'Ready for the next automatic run.'}
              </div>

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
            <p className="mb-2 text-xs uppercase tracking-wider text-[#fb923c]">Intervo</p>

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

                <div className="rounded-xl border border-zinc-800 bg-black/20 p-4">
                  <p className="mb-2 text-sm font-medium text-zinc-200">Current evaluation status</p>
                  <p className="text-sm text-zinc-400">
                    {phase === 'ready'
                      ? 'Starting automatically.'
                      : phase === 'recording'
                        ? 'Capturing your answer.'
                        : phase === 'transcribing'
                          ? 'Whisper is transcribing the audio.'
                          : phase === 'scoring'
                            ? 'Answer evaluation is running.'
                            : phase === 'review'
                              ? 'Waiting before the next question.'
                              : phase === 'complete'
                                ? 'Interview complete.'
                                : 'Preparing the interview.'}
                  </p>
                </div>
              </>
            ) : phase === 'complete' ? (
              <div className="rounded-xl border border-zinc-800 bg-black/20 p-4 text-sm text-zinc-300">
                The automated interview is finished. Review the scores on the left and return to the
                dashboard when you are done.
              </div>
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
        )}

        {isLoadingQuestions || questionError || permissionError ? null : (
          <p className="mt-6 text-center text-sm text-zinc-500">
            The system will move through the full interview automatically without additional input.
          </p>
        )}
      </div>
    </div>
  );
}
