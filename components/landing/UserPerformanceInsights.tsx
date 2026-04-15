"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Target,
  Shield,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";

type InterviewSession = {
  id: string;
  date: string;
  score: number;
  strengths: string[];
  improvementAreas: string[];
  questionsCount: number;
};

type PerformanceMetrics = {
  overallAverage: number;
  sessions: InterviewSession[];
  trend: number;
};

export default function UserPerformanceInsights() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);
        const response = await fetch("/api/interview/scores");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load metrics");
        }

        const sessions: InterviewSession[] = Array.isArray(data.sessions)
          ? (data.sessions as InterviewSession[])
          : [];
        const overallAverage =
          typeof data.overallAverage === "number" ? data.overallAverage : 0;

        // Calculate trend (compare last 3 sessions to 3 before that)
        let trend = 0;
        if (sessions.length >= 3) {
          const recent = sessions.slice(0, 3).reduce((sum, s) => sum + s.score, 0) / 3;
          const previous = sessions
            .slice(3, 6)
            .reduce((sum, s) => sum + s.score, 0);
          trend = sessions.slice(3, 6).length > 0 ? recent - previous / 3 : 0;
        }

        setMetrics({ overallAverage, sessions, trend });
        setError("");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load performance data";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, []);

  const topStrengths = useMemo(() => {
    if (!metrics || metrics.sessions.length === 0) {
      return ["Communication", "Problem Solving", "Technical Depth"];
    }

    const strengthCounts: Record<string, number> = {};
    metrics.sessions.forEach((session) => {
      session.strengths.forEach((strength) => {
        strengthCounts[strength] = (strengthCounts[strength] || 0) + 1;
      });
    });

    return Object.entries(strengthCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([strength]) => strength);
  }, [metrics]);

  const topImprovementAreas = useMemo(() => {
    if (!metrics || metrics.sessions.length === 0) {
      return ["Pacing", "Technical Depth", "Confidence"];
    }

    const areaCounts: Record<string, number> = {};
    metrics.sessions.forEach((session) => {
      session.improvementAreas.forEach((area) => {
        areaCounts[area] = (areaCounts[area] || 0) + 1;
      });
    });

    return Object.entries(areaCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([area]) => area);
  }, [metrics]);

  const skillMetrics = useMemo(() => {
    if (!metrics || metrics.sessions.length === 0) {
      return [
        { label: "Communication", value: 0, color: "from-orange-500 to-amber-400" },
        { label: "Technical Skills", value: 0, color: "from-amber-500 to-yellow-400" },
        {
          label: "Problem Solving",
          value: 0,
          color: "from-orange-600 to-orange-400",
        },
        { label: "Confidence", value: 0, color: "from-yellow-500 to-amber-300" },
      ];
    }

    // Derive metrics from sessions
    const avgScore = metrics.overallAverage;
    return [
      {
        label: "Overall Readiness",
        value: Math.round(avgScore),
        color: "from-orange-500 to-amber-400",
      },
      {
        label: "Session Count",
        value: Math.min(100, metrics.sessions.length * 20),
        color: "from-amber-500 to-yellow-400",
      },
      {
        label: "Consistency",
        value: Math.round(
          100 -
            Math.abs(
              metrics.trend *
                10
            )
        ),
        color: "from-orange-600 to-orange-400",
      },
      {
        label: "Improvement Pace",
        value: metrics.trend > 0 ? 75 : 50,
        color: "from-yellow-500 to-amber-300",
      },
    ];
  }, [metrics]);

  const benefits = [
    {
      icon: Target,
      title: "Identify Weak Areas",
      description:
        "Your data shows your specific gaps—focus on what matters most.",
    },
    {
      icon: Shield,
      title: "Build Confidence",
      description:
        "Every practice round strengthens your interview performance.",
    },
    {
      icon: Sparkles,
      title: "Personalized Feedback",
      description:
        "AI-generated insights matched to your unique performance profile.",
    },
  ];

  return (
    <>
      <section className="relative py-16 sm:py-20 md:py-24 overflow-x-hidden w-full">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12 sm:mb-14 md:mb-16 text-center"
          >
            <h2 className="mb-3 sm:mb-4 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Actionable <span className="gradient-text">Insights</span>
            </h2>
            <p className="mx-auto max-w-2xl text-sm sm:text-base md:text-lg text-zinc-400">
              Get data-driven feedback that helps you improve with every practice
              session.
            </p>
          </motion.div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-zinc-400">Loading your performance data...</p>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-center text-sm text-red-300 mb-8">
              {error}
            </div>
          ) : (
            <div className="grid items-center gap-8 sm:gap-10 md:gap-12 lg:grid-cols-2">
              {/* Left — Benefits */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-4 sm:space-y-5 md:space-y-6"
              >
                {benefits.map((b, i) => (
                  <motion.div
                    key={b.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.15, duration: 0.5 }}
                    className="glass-card glass-card-hover flex gap-3 sm:gap-4 rounded-lg sm:rounded-2xl p-4 sm:p-5"
                  >
                    <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-linear-to-br from-orange-500/20 to-amber-500/10">
                      <b.icon className="h-5 w-5 sm:h-6 sm:w-6 text-orange-400" />
                    </div>
                    <div>
                      <h3 className="mb-0.5 sm:mb-1 text-sm sm:text-base font-bold text-white">
                        {b.title}
                      </h3>
                      <p className="text-xs sm:text-sm leading-relaxed text-zinc-400">
                        {b.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Right — Performance Analytics Card */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="glass-card rounded-lg sm:rounded-2xl p-4 sm:p-6">
                  {/* Header */}
                  <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400" />
                      <h3 className="text-sm sm:text-base font-bold text-white">
                        Performance Overview
                      </h3>
                    </div>
                    {metrics && metrics.trend > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold text-emerald-300">
                        <ArrowUpRight className="h-3 w-3" />
                        Improving
                      </span>
                    )}
                  </div>

                  {/* Overview Stats */}
                  <div className="mb-6 space-y-3">
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-300">
                          Overall Score
                        </span>
                        <span className="text-sm font-bold text-orange-400">
                          {metrics?.overallAverage || 0}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-orange-500 to-amber-400"
                          style={{
                            width: `${metrics?.overallAverage || 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-zinc-800/50 p-2">
                        <p className="text-[10px] text-zinc-500">Sessions</p>
                        <p className="text-sm font-bold text-white">
                          {metrics?.sessions.length || 0}
                        </p>
                      </div>
                      <div className="rounded-lg bg-zinc-800/50 p-2">
                        <p className="text-[10px] text-zinc-500">Questions</p>
                        <p className="text-sm font-bold text-white">
                          {metrics?.sessions.reduce(
                            (sum, s) => sum + s.questionsCount,
                            0
                          ) || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="mb-6 space-y-3">
                    {skillMetrics.map((skill) => (
                      <div key={skill.label}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-semibold text-zinc-400">
                            {skill.label}
                          </span>
                          <span className="text-xs font-bold text-white">
                            {skill.value}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-zinc-800">
                          <div
                            className={`h-full rounded-full bg-linear-to-r ${skill.color}`}
                            style={{ width: `${skill.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Strengths */}
                  <div className="mb-4 border-t border-zinc-800 pt-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
                      Top Strengths
                    </p>
                    <div className="space-y-1">
                      {topStrengths.map((strength) => (
                        <div
                          key={strength}
                          className="flex items-start gap-2 text-xs text-zinc-300"
                        >
                          <CheckCircle2 className="h-3 w-3 mt-0.5 text-emerald-400 shrink-0" />
                          <span>{strength}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Areas for Improvement */}
                  <div className="border-t border-zinc-800 pt-4 pb-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
                      Focus Areas
                    </p>
                    <div className="space-y-1">
                      {topImprovementAreas.map((area) => (
                        <div
                          key={area}
                          className="flex items-start gap-2 text-xs text-zinc-300"
                        >
                          <AlertCircle className="h-3 w-3 mt-0.5 text-amber-400 shrink-0" />
                          <span>{area}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <Link
                    href="/dashboard"
                    className="mt-6 block w-full rounded-lg bg-linear-to-r from-orange-500 to-amber-500 py-2 text-center text-sm font-semibold text-white transition hover:shadow-lg hover:shadow-orange-500/50"
                  >
                    View Full Dashboard
                  </Link>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
