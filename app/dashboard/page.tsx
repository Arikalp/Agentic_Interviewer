'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CalendarClock,
  ChartNoAxesCombined,
  CheckCircle2,
  Clock3,
  FileText,
  Sparkles,
} from 'lucide-react';

const sessions = [
  { date: 'Apr 10, 2026', role: 'Software Engineer', score: 88 },
  { date: 'Apr 03, 2026', role: 'Full Stack Engineer', score: 76 },
  { date: 'Mar 25, 2026', role: 'Frontend Developer', score: 82 },
];

const strengths = ['Structured communication', 'Clear project storytelling', 'Problem decomposition'];

export default function DashboardPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace('/');
    }
  }, [isLoaded, isSignedIn, router]);

  const averageScore = useMemo(() => {
    const total = sessions.reduce((sum, session) => sum + session.score, 0);
    return Math.round(total / sessions.length);
  }, []);

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
                <button className="rounded-full bg-linear-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:shadow-[0_0_24px_rgba(249,115,22,0.4)]">
                  Start New Interview
                </button>
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
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
                <p className="text-xs text-zinc-500">Average Score</p>
                <p className="mt-2 text-2xl font-bold text-white">{averageScore}%</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
                <p className="text-xs text-zinc-500">Sessions Done</p>
                <p className="mt-2 text-2xl font-bold text-white">{sessions.length}</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
                <p className="text-xs text-zinc-500">Last Session</p>
                <p className="mt-2 text-sm font-semibold text-zinc-200">{sessions[0]?.date}</p>
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
            <p className="text-sm text-zinc-400">Your recent scores show upward progress in clarity and structure.</p>
            <div className="mt-4 h-2 rounded-full bg-zinc-800">
              <div className="h-full w-[78%] rounded-full bg-linear-to-r from-orange-500 to-amber-400" />
            </div>
            <p className="mt-2 text-xs text-zinc-500">Readiness index: 78%</p>
          </article>

          <article className="rounded-2xl border border-zinc-800 bg-linear-to-br from-[#1a1a1a] to-[#0f0f0f] p-6">
            <div className="mb-4 flex items-center gap-2 text-[#fb923c]">
              <CalendarClock className="h-5 w-5" />
              <h2 className="text-base font-semibold text-white">Next Recommended Session</h2>
            </div>
            <p className="text-sm text-zinc-300">System Design Drill</p>
            <p className="mt-1 text-sm text-zinc-500">Tomorrow • 35 minutes</p>
            <button className="mt-4 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white">
              Schedule Round
            </button>
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
              {sessions.map((session) => (
                <div key={session.date} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black/20 p-4">
                  <div>
                    <p className="font-medium text-white">{session.role}</p>
                    <p className="text-xs text-zinc-500">{session.date}</p>
                  </div>
                  <span className="rounded-full bg-orange-500/15 px-3 py-1 text-xs font-semibold text-orange-300">
                    {session.score}/100
                  </span>
                </div>
              ))}
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
