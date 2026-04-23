'use client';

import { useEffect, useMemo, useState } from 'react';
import { SignOutButton, useClerk, useUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  Target,
  TrendingUp,
  Upload,
} from 'lucide-react';

type InterviewSession = {
  id: string;
  date: string;
  score: number;
  strengths: string[];
  improvementAreas: string[];
  questionsCount: number;
};

type ResumeInsights = {
  summary: string;
  skills: string[];
  strengths: string[];
  improvementAreas: string[];
  suggestedRoles: string[];
  interviewFocus: string[];
  estimatedExperienceYears: number;
  atsScore: number;
};

const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_JOB_DESCRIPTION_LENGTH = 8000;

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
  const { openUserProfile } = useClerk();
  const { isLoaded, isSignedIn, user } = useUser();
  const [selectedResume, setSelectedResume] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [analysisError, setAnalysisError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [resumeInsights, setResumeInsights] = useState<ResumeInsights | null>(null);
  const [insightsUpdatedAt, setInsightsUpdatedAt] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [interviewSessions, setInterviewSessions] = useState<InterviewSession[]>([]);
  const [loadingInterviews, setLoadingInterviews] = useState(true);
  const [overallAverage, setOverallAverage] = useState(0);
  const [interviewsError, setInterviewsError] = useState('');
  const [currentSessionPage, setCurrentSessionPage] = useState(1);
  const [jobDescription, setJobDescription] = useState('');
  const [isSavingJobDescription, setIsSavingJobDescription] = useState(false);
  const [jobDescriptionError, setJobDescriptionError] = useState('');
  const [jobDescriptionMessage, setJobDescriptionMessage] = useState('');
  const sessionsPerPage = 5;

  if (isLoaded && !isSignedIn) {
    redirect('/auth/login');
  }

  const averageScore = overallAverage;
  const atsScore = resumeInsights?.atsScore ?? 0;
  const atsWidthClass =
    atsScore >= 95
      ? 'w-full'
      : atsScore >= 90
        ? 'w-11/12'
        : atsScore >= 80
          ? 'w-10/12'
          : atsScore >= 70
            ? 'w-9/12'
            : atsScore >= 60
              ? 'w-8/12'
              : atsScore >= 50
                ? 'w-7/12'
                : atsScore >= 40
                  ? 'w-6/12'
                  : atsScore >= 30
                    ? 'w-5/12'
                    : atsScore >= 20
                      ? 'w-4/12'
                      : atsScore >= 10
                        ? 'w-3/12'
                        : atsScore > 0
                          ? 'w-2/12'
                          : 'w-0';

  const topSuggestions = useMemo(() => {
    if (resumeInsights?.interviewFocus && resumeInsights.interviewFocus.length > 0) {
      return resumeInsights.interviewFocus;
    }

    return [
      'Practice one behavioral answer daily using the STAR method.',
      'For technical questions, start with trade-offs before implementation details.',
      'Track metrics from your projects so your examples are outcome-focused.',
    ];
  }, [resumeInsights]);

  useEffect(() => {
    async function loadInsights() {
      if (!isLoaded || !isSignedIn) {
        return;
      }

      try {
        setLoadingInsights(true);
        const response = await fetch('/api/resume');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load resume insights.');
        }

        if (data?.insights) {
          setResumeInsights(data.insights as ResumeInsights);
          setInsightsUpdatedAt(data?.metadata?.updatedAt || null);
        }

        setJobDescription(
          typeof data?.metadata?.jobDescription === 'string' ? data.metadata.jobDescription : '',
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to load existing resume insights.';
        setAnalysisError(message);
      } finally {
        setLoadingInsights(false);
      }
    }

    loadInsights();
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    async function loadInterviewScores() {
      if (!isLoaded || !isSignedIn) {
        return;
      }

      try {
        setLoadingInterviews(true);
        const response = await fetch('/api/interview/scores');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load interview scores.');
        }

        setInterviewSessions(data.sessions || []);
        setOverallAverage(data.overallAverage || 0);
        setInterviewsError('');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load interview scores.';
        setInterviewsError(message);
      } finally {
        setLoadingInterviews(false);
      }
    }

    loadInterviewScores();
  }, [isLoaded, isSignedIn]);

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
    setAnalysisError('');
  };

  const onAnalyzeResume = async () => {
    if (!selectedResume) {
      setAnalysisError('Please select a resume before analyzing.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setAnalysisError('');
      setJobDescriptionError('');

      const formData = new FormData();
      const normalizedJobDescription = jobDescription.trim().slice(0, MAX_JOB_DESCRIPTION_LENGTH);
      formData.append('resume', selectedResume);
      formData.append('jobDescription', normalizedJobDescription);

      const response = await fetch('/api/resume', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Resume analysis failed.');
      }

      setResumeInsights(data.insights as ResumeInsights);
      setInsightsUpdatedAt(data.updatedAt || null);
      setJobDescription(
        typeof data?.jobDescription === 'string' ? data.jobDescription : normalizedJobDescription,
      );
      setJobDescriptionMessage(
        normalizedJobDescription
          ? 'Job description saved and used for interview question generation.'
          : 'No job description saved. Questions will be based on your resume only.',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to analyze resume.';
      setAnalysisError(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onSaveJobDescription = async () => {
    try {
      setIsSavingJobDescription(true);
      setJobDescriptionError('');
      setJobDescriptionMessage('');

      const normalizedJobDescription = jobDescription.trim().slice(0, MAX_JOB_DESCRIPTION_LENGTH);

      const response = await fetch('/api/resume', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobDescription: normalizedJobDescription }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to save job description.');
      }

      setJobDescription(
        typeof data?.jobDescription === 'string' ? data.jobDescription : normalizedJobDescription,
      );
      setInsightsUpdatedAt(data?.updatedAt || insightsUpdatedAt);
      setJobDescriptionMessage(
        normalizedJobDescription
          ? 'Job description saved. Interview questions will align with this role.'
          : 'Job description cleared. Questions will be based on your resume only.',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save job description.';
      setJobDescriptionError(message);
    } finally {
      setIsSavingJobDescription(false);
    }
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
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => openUserProfile()}
              className="rounded-full border border-zinc-700 bg-zinc-900/60 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white"
            >
              Manage Account
            </button>
            <SignOutButton redirectUrl="/">
              <button className="rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20">
                Logout
              </button>
            </SignOutButton>
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
              <div className="rounded-xl border border-zinc-800 bg-black/20 p-3">
                <p className="text-zinc-500">Estimated Experience</p>
                <p className="font-medium text-white">
                  {resumeInsights ? `${resumeInsights.estimatedExperienceYears} years` : 'Analyze resume'}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-black/20 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-zinc-500">Resume ATS Score</p>
                  <p className="font-semibold text-white">
                    {resumeInsights ? `${atsScore}/100` : 'Analyze resume'}
                  </p>
                </div>
                <div className="h-2 rounded-full bg-zinc-800">
                  <div
                    className={`h-2 rounded-full bg-linear-to-r from-emerald-500 to-teal-400 transition-all ${resumeInsights ? atsWidthClass : 'w-0'}`}
                  />
                </div>
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
              {loadingInterviews ? (
                <p className="text-sm text-zinc-400">Loading interview history...</p>
              ) : interviewsError ? (
                <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">
                  {interviewsError}
                </p>
              ) : interviewSessions.length === 0 ? (
                <p className="text-sm text-zinc-400">
                  No interviews yet. Start your first interview to see scores here!
                </p>
              ) : (
                <>
                  {interviewSessions.slice((currentSessionPage - 1) * sessionsPerPage, currentSessionPage * sessionsPerPage).map((session) => (
                    <article
                      key={session.id}
                      className="rounded-xl border border-zinc-800 bg-black/20 p-4 transition-colors hover:border-[#f97316]/40"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm text-zinc-400">{session.date}</p>
                          <p className="text-xs text-zinc-500">{session.questionsCount} questions answered</p>
                        </div>
                        <span className="rounded-full bg-[#f97316]/15 px-3 py-1 text-xs font-medium text-[#fb923c]">
                          Score: {session.score}/100
                        </span>
                      </div>

                      {session.strengths.length > 0 ? (
                        <div className="mb-3">
                          <p className="mb-2 text-sm font-medium text-zinc-300">Strengths</p>
                          <ul className="space-y-1 text-sm text-zinc-400">
                            {session.strengths.map((point) => (
                              <li key={point}>• {point}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {session.improvementAreas.length > 0 ? (
                        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
                          <p className="font-medium mb-1">Areas to improve:</p>
                          <ul className="space-y-1 text-sm">
                            {session.improvementAreas.map((area) => (
                              <li key={area}>• {area}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </article>
                  ))}
                  
                  {Math.ceil(interviewSessions.length / sessionsPerPage) > 1 && (
                    <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-4">
                      <span className="text-xs text-zinc-500">
                        Page {currentSessionPage} of {Math.ceil(interviewSessions.length / sessionsPerPage)} • Total: {interviewSessions.length} sessions
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentSessionPage((prev) => Math.max(1, prev - 1))}
                          disabled={currentSessionPage === 1}
                          className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentSessionPage((prev) => Math.min(Math.ceil(interviewSessions.length / sessionsPerPage), prev + 1))}
                          disabled={currentSessionPage >= Math.ceil(interviewSessions.length / sessionsPerPage)}
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
                <h2 className="text-xl font-semibold text-white">Resume + Job Description</h2>
                <p className="text-sm text-zinc-500">Save target role context and upload a resume file up to 5 MB</p>
              </div>
            </div>

            <div className="mb-4 rounded-xl border border-zinc-800 bg-black/20 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                  <BriefcaseBusiness className="h-4 w-4 text-[#fb923c]" />
                  Job Description (Optional)
                </p>
                <span className="text-xs text-zinc-500">
                  {jobDescription.length}/{MAX_JOB_DESCRIPTION_LENGTH}
                </span>
              </div>

              <textarea
                value={jobDescription}
                onChange={(event) => {
                  setJobDescription(event.target.value.slice(0, MAX_JOB_DESCRIPTION_LENGTH));
                  setJobDescriptionError('');
                  setJobDescriptionMessage('');
                }}
                rows={6}
                placeholder="Paste the job description here (responsibilities, required skills, role expectations)."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-200 outline-hidden transition focus:border-[#f97316]/60"
              />

              <p className="mt-2 text-xs text-zinc-500">
                If provided, interview questions are tailored to this job description. If empty, questions are generated from resume insights only.
              </p>

              <button
                onClick={onSaveJobDescription}
                disabled={isSavingJobDescription}
                className="mt-3 rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingJobDescription ? 'Saving Job Description...' : 'Save Job Description'}
              </button>

              {jobDescriptionError ? (
                <p className="mt-3 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">
                  {jobDescriptionError}
                </p>
              ) : null}

              {jobDescriptionMessage ? (
                <p className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                  {jobDescriptionMessage}
                </p>
              ) : null}
            </div>

            <label
              htmlFor="resume-upload"
              className="mb-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-black/20 px-4 py-8 text-center transition-colors hover:border-[#f97316]/50"
            >
              <FileText className="h-8 w-8 text-zinc-400" />
              <p className="text-sm text-zinc-300">Click to select your resume</p>
              <p className="text-xs text-zinc-500">Accepted formats: PDF, DOCX, TXT</p>
            </label>

            <input
              id="resume-upload"
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={onResumeChange}
              className="hidden"
            />

            <button
              onClick={onAnalyzeResume}
              disabled={!selectedResume || isAnalyzing}
              className="mb-3 w-full rounded-lg bg-linear-to-r from-orange-500 to-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isAnalyzing ? 'Analyzing Resume...' : 'Analyze Resume'}
            </button>

            {uploadError ? (
              <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">
                {uploadError}
              </p>
            ) : null}

            {analysisError ? (
              <p className="mb-3 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">
                {analysisError}
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

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-linear-to-br from-[#151515] to-[#0f0f0f] p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">AI Resume Insights</h2>
            {insightsUpdatedAt ? (
              <span className="text-xs text-zinc-500">
                Updated: {new Date(insightsUpdatedAt).toLocaleString()}
              </span>
            ) : null}
          </div>

          {loadingInsights ? (
            <p className="text-sm text-zinc-500">Loading resume insights...</p>
          ) : null}

          {!loadingInsights && !resumeInsights ? (
            <p className="text-sm text-zinc-500">
              No analyzed resume found. Upload and analyze your resume to unlock personalized guidance.
            </p>
          ) : null}

          {resumeInsights ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-black/20 p-4 lg:col-span-2">
                <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Summary</p>
                <p className="text-sm text-zinc-300">{resumeInsights.summary}</p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-black/20 p-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Top Skills</p>
                <ul className="space-y-1 text-sm text-zinc-300">
                  {resumeInsights.skills.map((skill) => (
                    <li key={skill}>• {skill}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-black/20 p-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Suggested Roles</p>
                <ul className="space-y-1 text-sm text-zinc-300">
                  {resumeInsights.suggestedRoles.map((role) => (
                    <li key={role}>• {role}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-black/20 p-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Strengths</p>
                <ul className="space-y-1 text-sm text-zinc-300">
                  {resumeInsights.strengths.map((strength) => (
                    <li key={strength}>• {strength}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-black/20 p-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Improvement Areas</p>
                <ul className="space-y-1 text-sm text-zinc-300">
                  {resumeInsights.improvementAreas.map((area) => (
                    <li key={area}>• {area}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
