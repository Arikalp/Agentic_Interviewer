"use client";

import Link from "next/link";
import { Play } from "lucide-react";

export default function DemoPage() {
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
          <h1 className="text-4xl font-bold text-white sm:text-5xl">Demo</h1>
          <p className="mt-4 text-lg text-zinc-400">See Intervo in action with a live demo</p>
        </div>
      </div>

      {/* Demo Content */}
      <div className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Video Placeholder */}
          <div className="mb-12 rounded-xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
            <div className="flex h-96 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-500/20">
              <div className="flex flex-col items-center gap-4">
                <Play className="h-16 w-16 text-orange-500" />
                <p className="text-lg text-zinc-400">Demo video coming soon</p>
                <p className="text-sm text-zinc-500">Start an interview to experience the full feature set</p>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-white">How the Demo Works</h2>
            {[
              {
                step: "1",
                title: "Record Your Answer",
                description: "Answer interview questions with up to 30 seconds per question for realistic practice.",
              },
              {
                step: "2",
                title: "AI Transcription",
                description: "Your audio is instantly transcribed and analyzed by our advanced AI system.",
              },
              {
                step: "3",
                title: "Get Feedback",
                description: "Receive detailed scores, strengths, and improvement areas for each answer.",
              },
              {
                step: "4",
                title: "Track Progress",
                description: "View all your interview history and watch your score improve over time.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500">
                  <span className="font-bold text-white">{item.step}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-1 text-zinc-400">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="border-t border-white/5 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="text-3xl font-bold text-white">Try It Now</h2>
          <p className="mt-4 text-lg text-zinc-400">Experience an interactive interview practice session</p>
          <Link
            href="/interview"
            className="mt-8 inline-flex rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-8 py-3 font-medium text-white transition-all hover:shadow-lg hover:shadow-orange-500/50"
          >
            Start Demo Interview
          </Link>
        </div>
      </div>
    </div>
  );
}
