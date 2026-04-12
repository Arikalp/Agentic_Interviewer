"use client";

import { motion } from "framer-motion";
import { Play, Mic, Video, Clock } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden px-4 pt-32 pb-20 sm:px-6 lg:px-8">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-1/4 right-0 h-[600px] w-[600px] -translate-y-1/2 translate-x-1/4 rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, rgba(249,115,22,0.4) 0%, rgba(249,115,22,0.1) 40%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 left-1/4 h-[400px] w-[400px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(251,191,36,0.3) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Left — Text */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-sm text-orange-400">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse-glow" />
              AI-Powered Mock Interviews
            </div>

            <h1 className="mb-6 text-5xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
              Crack Interviews{" "}
              <span className="gradient-text">with AI</span>
            </h1>

            <p className="mb-10 max-w-lg text-lg leading-relaxed text-zinc-400">
              Practice real-time AI interviews based on your resume and get
              instant feedback. Build confidence and land your dream job.
            </p>

            <div className="flex flex-wrap gap-4">
              <a href="/interview" className="btn-primary flex items-center gap-2 text-base">
                Start Interview
                <Play className="h-4 w-4" />
              </a>
              <a href="/dashboard" className="btn-secondary flex items-center gap-2 text-base">
                <Play className="h-4 w-4" />
                Go to Dashboard
              </a>
            </div>

            {/* Social proof */}
            <div className="mt-12 flex items-center gap-6 text-sm text-zinc-500">
              <div className="flex -space-x-2">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0a0a0a] text-[10px] font-bold text-white"
                    style={{
                      background: `linear-gradient(135deg, hsl(${25 + i * 15}, 90%, ${50 + i * 5}%), hsl(${35 + i * 15}, 85%, ${40 + i * 5}%))`,
                    }}
                  >
                    {["A", "B", "C", "D"][i]}
                  </div>
                ))}
              </div>
              <span>
                <strong className="text-zinc-300">2,400+</strong> interviews
                completed
              </span>
            </div>
          </motion.div>

          {/* Right — Mock Interview UI */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            {/* Glow behind card */}
            <div
              className="absolute -inset-6 rounded-3xl opacity-60"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(249,115,22,0.2) 0%, transparent 70%)",
              }}
            />

            <div className="glass-card relative overflow-hidden rounded-2xl p-1">
              {/* Top bar */}
              <div className="flex items-center justify-between rounded-t-xl bg-white/[0.03] px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                </div>
                <span className="text-xs text-zinc-500">AI Interview Session</span>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Clock className="h-3 w-3" />
                  12:34
                </div>
              </div>

              <div className="space-y-3 p-4">
                {/* AI Question */}
                <div className="glass-card rounded-xl p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500">
                      <Mic className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-orange-400">
                      Intervo
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-zinc-300">
                    &ldquo;Tell me about a challenging project where you had to
                    lead a team. What was your approach and what did you
                    learn?&rdquo;
                  </p>
                </div>

                {/* User video preview */}
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-800 aspect-video">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                        <Video className="h-6 w-6 text-zinc-400" />
                      </div>
                      <p className="text-sm text-zinc-500">Your Camera Feed</p>
                    </div>
                  </div>

                  {/* Recording indicator */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse-glow" />
                    <span className="text-[10px] font-semibold text-red-400">
                      REC
                    </span>
                  </div>

                  {/* Timer */}
                  <div className="absolute top-3 right-3 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-mono text-zinc-400">
                    00:45
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
