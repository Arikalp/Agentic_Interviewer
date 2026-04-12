"use client";

import Link from "next/link";
import { TrendingUp } from "lucide-react";

export default function InsightsPage() {
  const stats = [
    {
      number: "1,000+",
      label: "Practice Interviews Completed",
      icon: "📊",
    },
    {
      number: "95%",
      label: "User Satisfaction Rate",
      icon: "⭐",
    },
    {
      number: "3.2x",
      label: "Average Score Improvement",
      icon: "📈",
    },
    {
      number: "50+",
      label: "Companies Our Users Work At",
      icon: "🏢",
    },
  ];

  const insights = [
    {
      title: "Most Challenging Question Types",
      description: "Behavioral and situational questions are reported as most challenging. Practice these areas to improve significantly.",
      icon: "🎯",
    },
    {
      title: "Key Success Factors",
      description: "Users who practice consistently (2+ interviews per week) show 5x better improvement in their scores.",
      icon: "✨",
    },
    {
      title: "Common Improvement Areas",
      description: "Technical depth and real-world examples are the top improvement suggestions across all interviews.",
      icon: "🔧",
    },
    {
      title: "Score Distribution",
      description: "Our users average a score of 7.2/10 in their first interview, improving to 8.5/10 after 5 practice sessions.",
      icon: "📉",
    },
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-white/5 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-white sm:text-5xl">Insights</h1>
          <p className="mt-4 text-lg text-zinc-400">Data-driven insights from our interview practice platform</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/2 p-6 backdrop-blur"
              >
                <div className="text-4xl mb-3">{stat.icon}</div>
                <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">
                  {stat.number}
                </div>
                <p className="mt-2 text-sm text-zinc-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="border-t border-white/5 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-12 text-3xl font-bold text-white">Key Insights</h2>
          <div className="grid gap-8 md:grid-cols-2">
            {insights.map((insight, index) => (
              <div
                key={index}
                className="rounded-xl border border-white/10 bg-white/5 p-8 backdrop-blur transition-all hover:border-orange-500/50 hover:bg-white/10"
              >
                <div className="mb-4 text-4xl">{insight.icon}</div>
                <h3 className="text-xl font-semibold text-white">{insight.title}</h3>
                <p className="mt-3 text-zinc-400">{insight.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Improvement Tips */}
      <div className="border-t border-white/5 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-8 text-2xl font-bold text-white">Tips for Maximum Improvement</h2>
          <div className="space-y-4">
            {[
              "Practice consistently: Aim for 2-3 interviews per week for best results",
              "Review feedback: Analyze AI feedback after each interview to identify patterns",
              "Use examples: Include specific, measurable examples from your past projects",
              "Practice articulation: Work on clear, concise communication within the time limit",
              "Focus on weaknesses: Prioritize improvement in areas with lower scores",
              "Mock real scenarios: Practice in a quiet environment to simulate real interviews",
            ].map((tip, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/2 p-4"
              >
                <div className="mt-1 text-lg">📌</div>
                <p className="text-zinc-300">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="border-t border-white/5 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="text-3xl font-bold text-white">Join Thousands of Successful Candidates</h2>
          <p className="mt-4 text-lg text-zinc-400">Start your interview practice journey and track your progress</p>
          <Link
            href="/interview"
            className="mt-8 inline-flex rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-8 py-3 font-medium text-white transition-all hover:shadow-lg hover:shadow-orange-500/50"
          >
            Start Interview
          </Link>
        </div>
      </div>
    </div>
  );
}
