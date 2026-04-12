'use client';

import { useMemo, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  FileText,
  Target,
  TrendingUp,
  Upload,
} from 'lucide-react';

type InterviewSession = {
  id: string;
  role: string;
  date: string;
  score: number;
  highlights: string[];
  improveOn: string;
};

const mockInterviewSessions: InterviewSession[] = [
  {
    id: 'sess-101',
    role: 'Frontend Developer',
    date: 'Mar 25, 2026',
    score: 82,
    highlights: ['Clear project explanation', 'Good problem-solving approach'],
    improveOn: 'Explain time complexity more confidently.',
  },
  {
    id: 'sess-102',
    role: 'Full Stack Engineer',
    date: 'Apr 03, 2026',
    score: 76,
    highlights: ['Strong API design basics', 'Good communication'],
    improveOn: 'Add more depth on database indexing and scaling.',
  },
  {
    id: 'sess-103',
    role: 'Software Engineer',
    date: 'Apr 10, 2026',
    score: 88,
    highlights: ['Structured answers', 'Confident system-thinking'],
    improveOn: 'Use more quantified examples from past projects.',
  },
];

const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  return `${(kb / 1024).toFixed(2)} MB`;
}

export default function ProfilePage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [selectedResume, setSelectedResume] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');

  if (isLoaded && !isSignedIn) {
    redirect('/');
  }

  const averageScore = useMemo(() => {
    const total = mockInterviewSessions.reduce((sum, session) => sum + session.score, 0);
    return Math.round(total / mockInterviewSessions.length);
  }, []);

  const topSuggestions = useMemo(() => {
    return [
      'Practice one behavioral answer daily using the STAR method.',
      'For technical questions, start with trade-offs before implementation details.',
      'Track metrics from your projects so your examples are outcome-focused.',
    ];
  }, []);

  const onResumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setSelectedResume(null);
      setUploadError('');
      return;
    }

    if (file.size > MAX_RESUME_SIZE_BYTES) {
      setSelectedResume(null);
      setUploadError('Resume must be 5 MB or smaller. Please choose a smaller file.');
      event.target.value = '';
      return;
    }

    setSelectedResume(file);
    setUploadError('');
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="text-white">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="mb-3 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold text-white">Your Profile</h1>
            <p className="mt-2 text-zinc-400">
              Review your interview progress, insights, and keep your resume ready.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-zinc-800 bg-linear-to-br from-[#1a1a1a] to-[#0f0f0f] p-6 lg:col-span-1">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f97316]/20 text-[#f97316]">
                <BadgeCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">User Details</h2>
                <p className="text-sm text-zinc-500">Your account information</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="rounded-xl border border-zinc-800 bg-black/20 p-3">
                <p className="text-zinc-500">Name</p>
                <p className="font-medium text-white">{user?.fullName || 'Not set'}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-black/20 p-3">
                <p className="text-zinc-500">Email</p>
                <p className="font-medium text-white">
                  {user?.primaryEmailAddress?.emailAddress || 'Not set'}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-black/20 p-3">
                <p className="text-zinc-500">Average Interview Score</p>
                <p className="font-medium text-white">{averageScore}/100</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-linear-to-br from-[#1a1a1a] to-[#0f0f0f] p-6 lg:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f97316]/20 text-[#f97316]">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Previous Interview Sessions</h2>
                <p className="text-sm text-zinc-500">Track your past performance</p>
              </div>
            </div>

            <div className="space-y-4">
              {mockInterviewSessions.map((session) => (
                <article
                  key={session.id}
                  className="rounded-xl border border-zinc-800 bg-black/20 p-4 transition-colors hover:border-[#f97316]/40"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-white">{session.role}</h3>
                    <span className="rounded-full bg-[#f97316]/15 px-3 py-1 text-xs font-medium text-[#fb923c]">
                      Score: {session.score}/100
                    </span>
                  </div>

                  <p className="mb-3 text-sm text-zinc-500">{session.date}</p>

                  <div className="mb-3">
                    <p className="mb-2 text-sm font-medium text-zinc-300">Highlights</p>
                    <ul className="space-y-1 text-sm text-zinc-400">
                      {session.highlights.map((point) => (
                        <li key={point}>• {point}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
                    Improve next time: {session.improveOn}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-zinc-800 bg-linear-to-br from-[#1a1a1a] to-[#0f0f0f] p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Suggestions For Next Interview</h2>
                <p className="text-sm text-zinc-500">Personalized improvement checklist</p>
              </div>
            </div>

            <div className="space-y-3">
              {topSuggestions.map((suggestion, index) => (
                <div
                  key={suggestion}
                  className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-black/20 p-3"
                >
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#f97316]/15 text-xs font-semibold text-[#fb923c]">
                    {index + 1}
                  </div>
                  <p className="text-sm text-zinc-300">{suggestion}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-lg border border-zinc-800 bg-black/20 p-3 text-sm text-zinc-400">
              <p className="mb-1 flex items-center gap-2 text-zinc-300">
                <Target className="h-4 w-4 text-[#f97316]" />
                Focus metric
              </p>
              Aim for a 90+ consistency score by practicing two timed mock rounds this week.
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-linear-to-br from-[#1a1a1a] to-[#0f0f0f] p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Resume Upload</h2>
                <p className="text-sm text-zinc-500">Upload a resume file up to 5 MB</p>
              </div>
            </div>

            <label
              htmlFor="resume-upload"
              className="mb-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-black/20 px-4 py-8 text-center transition-colors hover:border-[#f97316]/50"
            >
              <FileText className="h-8 w-8 text-zinc-400" />
              <p className="text-sm text-zinc-300">Click to select your resume</p>
              <p className="text-xs text-zinc-500">Accepted formats: PDF, DOC, DOCX</p>
            </label>

            <input
              id="resume-upload"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={onResumeChange}
              className="hidden"
            />

            {uploadError ? (
              <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">
                {uploadError}
              </p>
            ) : null}

            {selectedResume ? (
              <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                <p className="font-medium">File selected successfully</p>
                <p className="mt-1">
                  {selectedResume.name} ({formatFileSize(selectedResume.size)})
                </p>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No resume selected yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
