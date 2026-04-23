'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CalendarClock,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Sparkles,
} from 'lucide-react';

type InterviewDifficulty = 'easy' | 'medium' | 'hard';

type InterviewSession = {
  id: string;
  date: string;
  score: number;
  strengths: string[];
  improvementAreas: string[];
  questionsCount: number;
};

const strengths = ['Structured communication', 'Clear project storytelling', 'Problem decomposition'];

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function DashboardPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [overallAverage, setOverallAverage] = useState(0);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionsError, setSessionsError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDifficulty, setSelectedDifficulty] = useState<InterviewDifficulty>('medium');
  const itemsPerPage = 5;

  const recommendedDifficulty = useMemo<InterviewDifficulty>(() => {
    if (overallAverage >= 80) {
      return 'hard';
    }

    return 'medium';
  }, [overallAverage]);

  const readinessIndex = useMemo(() => {
    if (sessions.length === 0) {
      return 0;
    }

    const recentSessions = sessions.slice(0, 5);
    const recentAverage =
      recentSessions.reduce((sum, session) => sum + session.score, 0) / recentSessions.length;
    const previousSessions = sessions.slice(5, 10);

    if (previousSessions.length === 0) {
      return clampScore(recentAverage || overallAverage);
    }

    const previousAverage =
      previousSessions.reduce((sum, session) => sum + session.score, 0) / previousSessions.length;
    const trendBoost = (recentAverage - previousAverage) * 0.5;

    return clampScore(recentAverage + trendBoost);
  }, [overallAverage, sessions]);

  const performanceSnapshotMessage = useMemo(() => {
    if (loadingSessions) {
      return 'Analyzing your latest interview performance...';
    }

    if (sessionsError) {
      return 'Performance insights will appear once your scores are available.';
    }

    if (sessions.length === 0) {
      return 'Complete your first mock interview to unlock personalized performance insights.';
    }

    if (sessions.length < 2) {
      return 'Strong start. Continue practicing to build a reliable progress trend.';
    }

    const recentWindow = sessions.slice(0, 3);
    const previousWindow = sessions.slice(3, 6);

    if (previousWindow.length === 0) {
      return 'Your latest sessions show steady preparation momentum.';
    }

    const recentAverage =
      recentWindow.reduce((sum, session) => sum + session.score, 0) / recentWindow.length;
    const previousAverage =
      previousWindow.reduce((sum, session) => sum + session.score, 0) / previousWindow.length;
    const delta = recentAverage - previousAverage;

    if (delta >= 4) {
      return 'Your recent scores show upward progress in clarity and structure.';
    }

    if (delta <= -4) {
      return 'Recent scores dipped slightly. Focus on concise storytelling and examples next round.';
    }

    return 'Your recent scores are stable. Sharpening examples can push your scores higher.';
  }, [loadingSessions, sessionsError, sessions]);

  const readinessBarWidthClass = useMemo(() => {
    const roundedToStep = Math.round(readinessIndex / 5) * 5;
    const clampedStep = Math.max(0, Math.min(100, roundedToStep));
    const widthByStep: Record<number, string> = {
      0: 'w-0',
      5: 'w-[5%]',
      10: 'w-[10%]',
      15: 'w-[15%]',
      20: 'w-[20%]',
      25: 'w-[25%]',
      30: 'w-[30%]',
      35: 'w-[35%]',
      40: 'w-[40%]',
      45: 'w-[45%]',
      50: 'w-[50%]',
      55: 'w-[55%]',
      60: 'w-[60%]',
      65: 'w-[65%]',
      70: 'w-[70%]',
      75: 'w-[75%]',
      80: 'w-[80%]',
      85: 'w-[85%]',
      90: 'w-[90%]',
      95: 'w-[95%]',
      100: 'w-full',
    };

    return widthByStep[clampedStep] || 'w-0';
  }, [readinessIndex]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace('/auth/login');
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    async function loadInterviewScores() {
      if (!isLoaded || !isSignedIn) {
        return;
      }

      try {
        setLoadingSessions(true);
        const response = await fetch('/api/interview/scores');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load interview scores.');
        }

        setSessions(data.sessions || []);
        setOverallAverage(data.overallAverage || 0);
        setSessionsError('');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load interview scores.';
        setSessionsError(message);
      } finally {
        setLoadingSessions(false);
      }
    }

    loadInterviewScores();
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-linear-to-br from-[#181818] via-[#131313] to-[#0c0c0c] p-8 sm:p-10">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#f97316]/20 blur-3xl" />
          <div className="absolute -bottom-20 left-20 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="relative z-10 grid grid-cols-1 gap-8 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#f97316]/30 bg-[#f97316]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#fb923c]">
                <Sparkles className="h-3.5 w-3.5" />
                Interview Command Center
              </p>
              <h1 className="text-3xl font-bold text-white sm:text-4xl">
                Welcome back, {user?.firstName || 'User'}
              </h1>
              <p className="mt-3 max-w-2xl text-zinc-400">
                Track your readiness, review past rounds, and sharpen weak areas with AI-driven feedback.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={{
                    pathname: '/interview',
                    query: { difficulty: selectedDifficulty },
                  }}
                  className="rounded-full bg-linear-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:shadow-[0_0_24px_rgba(249,115,22,0.4)]"
                >
                  Start New Interview
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-white"
                >
                  Home Page
                </Link>
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-white"
                >
                  Open Profile
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Interview Difficulty
                </p>
                <div className="inline-flex rounded-full border border-zinc-700 bg-black/30 p-1">
                  {(['easy', 'medium', 'hard'] as InterviewDifficulty[]).map((level) => {
                    const isActive = selectedDifficulty === level;

                    return (
                      <button
                        key={level}
                        onClick={() => setSelectedDifficulty(level)}
                        className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                          isActive
                            ? 'bg-orange-500 text-white'
                            : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                        }`}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
                <p className="text-xs text-zinc-500">Average Score</p>
                <p className="mt-2 text-2xl font-bold text-white">{overallAverage}%</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
                <p className="text-xs text-zinc-500">Sessions Done</p>
                <p className="mt-2 text-2xl font-bold text-white">{sessions.length}</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
                <p className="text-xs text-zinc-500">Last Session</p>
                <p className="mt-2 text-sm font-semibold text-zinc-200">
                  {loadingSessions ? 'Loading...' : sessions.length > 0 ? sessions[0]?.date : 'No sessions yet'}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
                <p className="text-xs text-zinc-500">Consistency Goal</p>
                <p className="mt-2 text-sm font-semibold text-emerald-300">90% Target</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <article className="rounded-2xl border border-zinc-800 bg-linear-to-br from-[#1a1a1a] to-[#0f0f0f] p-6">
            <div className="mb-4 flex items-center gap-2 text-[#fb923c]">
              <ChartNoAxesCombined className="h-5 w-5" />
              <h2 className="text-base font-semibold text-white">Performance Snapshot</h2>
            </div>
            <p className="text-sm text-zinc-400">{performanceSnapshotMessage}</p>
            <div className="mt-4 h-2 rounded-full bg-zinc-800">
              <div
                className={`h-full rounded-full bg-linear-to-r from-orange-500 to-amber-400 transition-all duration-500 ${readinessBarWidthClass}`}
              />
            </div>
            <p className="mt-2 text-xs text-zinc-500">Readiness index: {readinessIndex}%</p>
          </article>

          <article className="rounded-2xl border border-zinc-800 bg-linear-to-br from-[#1a1a1a] to-[#0f0f0f] p-6">
            <div className="mb-4 flex items-center gap-2 text-[#fb923c]">
              <CalendarClock className="h-5 w-5" />
              <h2 className="text-base font-semibold text-white">Next Recommended Session</h2>
            </div>
            <p className="text-sm text-zinc-300">
              Go for <span className="font-semibold capitalize text-white">{recommendedDifficulty} difficulty</span> now.
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {recommendedDifficulty === 'hard'
                ? 'Your recent performance suggests you are ready for advanced depth and tougher follow-ups.'
                : 'Build momentum with practical, balanced questions before moving to advanced rounds.'}
            </p>
            <Link
              href={{
                pathname: '/interview',
                query: { difficulty: recommendedDifficulty },
              }}
              className="mt-4 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white"
            >
              Go for {recommendedDifficulty} now
            </Link>
          </article>

          <article className="rounded-2xl border border-zinc-800 bg-linear-to-br from-[#1a1a1a] to-[#0f0f0f] p-6">
            <div className="mb-4 flex items-center gap-2 text-[#fb923c]">
              <FileText className="h-5 w-5" />
              <h2 className="text-base font-semibold text-white">Profile & Resume</h2>
            </div>
            <p className="text-sm text-zinc-400">Keep your profile updated so feedback stays role-specific.</p>
            <Link
              href="/profile"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#fb923c] transition hover:text-orange-300"
            >
              Manage profile
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </article>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-zinc-800 bg-[#101010] p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Recent Interview Activity</h2>
            <div className="space-y-4">
              {loadingSessions ? (
                <p className="text-sm text-zinc-400">Loading interview history...</p>
              ) : sessionsError ? (
                <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">
                  {sessionsError}
                </p>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-zinc-400">
                  No interviews yet. Start your first interview to see results here!
                </p>
              ) : (
                <>
                  {sessions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((session) => (
                    <div key={session.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black/20 p-4">
                      <div>
                        <p className="font-medium text-white">Interview Session</p>
                        <p className="text-xs text-zinc-500">{session.date}</p>
                        <p className="text-xs text-zinc-600">{session.questionsCount} questions answered</p>
                      </div>
                      <span className="rounded-full bg-orange-500/15 px-3 py-1 text-xs font-semibold text-orange-300">
                        {session.score}/100
                      </span>
                    </div>
                  ))}
                  
                  {Math.ceil(sessions.length / itemsPerPage) > 1 && (
                    <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-4">
                      <span className="text-xs text-zinc-500">
                        Page {currentPage} of {Math.ceil(sessions.length / itemsPerPage)} • Total: {sessions.length} sessions
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage((prev) => Math.min(Math.ceil(sessions.length / itemsPerPage), prev + 1))}
                          disabled={currentPage >= Math.ceil(sessions.length / itemsPerPage)}
                          className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-zinc-800 bg-[#101010] p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">What You Are Doing Well</h2>
            <div className="space-y-3">
              {strengths.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-black/20 p-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
                  <p className="text-sm text-zinc-300">{item}</p>
                </div>
              ))}
              <div className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-black/20 p-3">
                <Clock3 className="mt-0.5 h-4 w-4 text-amber-300" />
                <p className="text-sm text-zinc-300">
                  Improve pacing in coding rounds by speaking your approach in the first 60 seconds.
                </p>
              </div>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
