"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Play, Mic, Clock } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden pt-24 sm:pt-28 md:pt-32 pb-16 sm:pb-20 w-full">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-1/4 right-0 h-[300px] w-[300px] sm:h-[600px] sm:w-[600px] -translate-y-1/2 translate-x-1/4 rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, rgba(249,115,22,0.4) 0%, rgba(249,115,22,0.1) 40%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 left-1/4 h-[250px] w-[250px] sm:h-[400px] sm:w-[400px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(251,191,36,0.3) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl w-full px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="grid items-center gap-8 md:gap-12 lg:gap-20 lg:grid-cols-2">
          {/* Left — Text */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="mb-4 sm:mb-6 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 sm:px-4 py-1.5 text-xs sm:text-sm text-orange-400">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse-glow" />
              <span className="hidden sm:inline">AI-Powered Mock Interviews</span>
              <span className="sm:hidden">AI Mock Interviews</span>
            </div>

            <h1 className="mb-4 sm:mb-6 max-w-[12ch] text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-extrabold leading-[1.15] tracking-tight">
              Crack Interviews{" "}
              <span className="gradient-text">with AI</span>
            </h1>

            <p className="mb-6 sm:mb-8 md:mb-10 max-w-lg text-sm sm:text-base md:text-lg leading-relaxed text-zinc-400">
              Practice real-time AI interviews based on your resume and get
              instant feedback. Build confidence and land your dream job.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <a href="/interview" className="btn-primary flex items-center justify-center gap-2 text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-2.5">
                Start Interview
                <Play className="h-4 w-4" />
              </a>
              <a href="/dashboard" className="btn-secondary flex items-center justify-center gap-2 text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-2.5">
                <Play className="h-4 w-4" />
                <span className="hidden sm:inline">Go to Dashboard</span>
                <span className="sm:hidden">Dashboard</span>
              </a>
            </div>

            {/* Social proof */}
            <div className="mt-8 sm:mt-10 md:mt-12 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 text-xs sm:text-sm text-zinc-500">
              <div className="flex -space-x-2">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border-2 border-[#0a0a0a] text-[9px] sm:text-[10px] font-bold text-white"
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
            className="relative hidden lg:block"
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
              <div className="flex items-center justify-between rounded-t-xl bg-white/[0.03] px-3 sm:px-4 py-2 sm:py-3">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-red-500" />
                  <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-yellow-500" />
                  <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-green-500" />
                </div>
                <span className="text-[10px] sm:text-xs text-zinc-500">AI Interview Session</span>
                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-zinc-500">
                  <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  12:34
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3 p-3 sm:p-4">
                {/* AI Question */}
                <div className="glass-card rounded-lg sm:rounded-xl p-3 sm:p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500">
                      <Mic className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-orange-400">
                      Interviewer
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed text-zinc-300">
                    &ldquo;Tell me about a challenging project where you had to
                    lead a team. What was your approach and what did you
                    learn?&rdquo;
                  </p>
                </div>

                {/* User video preview */}
                <div className="relative overflow-hidden rounded-lg sm:rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-800 aspect-video">
                  <Image
                    src="/interview_demo.png"
                    alt="Camera Feed"
                    fill
                    className="object-cover"
                  />
                  {/* Recording indicator */}
                  <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-1 sm:px-2.5 sm:py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse-glow" />
                    <span className="text-[8px] sm:text-[10px] font-semibold text-red-400">
                      REC
                    </span>
                  </div>

                  {/* Timer */}
                  <div className="absolute top-2 sm:top-3 right-2 sm:right-3 rounded-full bg-black/50 px-2 py-1 text-[8px] sm:text-[10px] font-mono text-zinc-400">
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
