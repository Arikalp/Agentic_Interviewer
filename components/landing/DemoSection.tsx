"use client";

import { motion } from "framer-motion";
import { Mic, Clock, Video, Send, SkipForward } from "lucide-react";

export default function DemoSection() {
  return (
    <section id="demo" className="relative py-16 sm:py-20 md:py-24 overflow-hidden w-full">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-1/2 left-1/2 h-[300px] w-[500px] sm:h-[500px] sm:w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(ellipse, rgba(249,115,22,0.3) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 w-full sm:px-4 md:px-6 lg:px-8 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-12 sm:mb-14 md:mb-16 text-center"
        >
          <h2 className="mb-3 sm:mb-4 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight">
            See It <span className="gradient-text">In Action</span>
          </h2>
          <p className="mx-auto max-w-2xl text-sm sm:text-base md:text-lg text-zinc-400">
            Experience a realistic AI interview session with real-time
            interaction and feedback.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-4xl"
        >
          <div className="glass-card overflow-hidden rounded-lg sm:rounded-2xl">
            {/* Header bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 border-b border-white/5 bg-white/[0.02] px-3 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex-shrink-0">
                  <Mic className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-white truncate">
                    AI Interview Session
                  </p>
                  <p className="text-[10px] sm:text-xs text-zinc-500 truncate">
                    Software Engineer — Round 2
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                {/* Recording indicator */}
                <div className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 sm:px-3 py-0.5 sm:py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse-glow" />
                  <span className="text-[9px] sm:text-xs font-medium text-red-400">
                    Recording
                  </span>
                </div>

                {/* Timer */}
                <div className="flex items-center gap-1 rounded-full bg-white/5 px-2 sm:px-3 py-0.5 sm:py-1">
                  <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-zinc-400" />
                  <span className="font-mono text-[10px] sm:text-sm text-zinc-300">
                    02:45
                  </span>
                </div>
              </div>
            </div>

            {/* Interview content */}
            <div className="p-3 sm:p-4 md:p-6">
              <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 lg:grid-cols-5">
                {/* Chat / Question area */}
                <div className="space-y-3 sm:space-y-4 lg:col-span-3">
                  {/* AI message */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="glass-card rounded-lg sm:rounded-xl p-3 sm:p-4"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex-shrink-0">
                        <Mic className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
                      </div>
                      <span className="text-[10px] sm:text-xs font-semibold text-orange-400">
                        Intervo
                      </span>
                      <span className="text-[9px] text-zinc-600">
                        just now
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm leading-relaxed text-zinc-300">
                      &ldquo;Great answer! Now, can you explain how you would
                      design a scalable notification system for a social media
                      platform? Consider both push notifications and in-app
                      notifications.&rdquo;
                    </p>
                  </motion.div>

                  {/* Hints */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-wrap gap-1.5 sm:gap-2"
                  >
                    {[
                      "Message Queue",
                      "WebSocket",
                      "Fan-out Pattern",
                    ].map((hint) => (
                      <span
                        key={hint}
                        className="rounded-full bg-orange-500/10 px-2 sm:px-3 py-1 text-[9px] sm:text-xs text-orange-400/80"
                      >
                        💡 {hint}
                      </span>
                    ))}
                  </motion.div>

                  {/* Input */}
                  <div className="flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-white/[0.03] p-1.5 sm:p-2 border border-white/5">
                    <input
                      type="text"
                      placeholder="Speak your answer aloud..."
                      className="flex-1 bg-transparent px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-zinc-300 placeholder-zinc-600 outline-none"
                      readOnly
                    />
                    <button className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 transition-transform hover:scale-105 flex-shrink-0">
                      <Send className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                    </button>
                  </div>
                </div>

                {/* Video preview */}
                <div className="space-y-2 sm:space-y-3 lg:col-span-2 hidden sm:block">
                  <div className="relative overflow-hidden rounded-lg sm:rounded-xl bg-linear-to-br from-zinc-900 to-zinc-800 aspect-4/3">
                  <img
                    src="/interview_demo.png"
                    alt="Interview Demo"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 flex items-center gap-1 rounded bg-black/60 px-1.5 sm:px-2 py-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    <span className="text-[8px] sm:text-[9px] text-zinc-400">LIVE</span>
                  </div>
                  </div>

                  {/* Controls */}
                  <div className="flex justify-center gap-2 sm:gap-3">
                    <button className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white">
                      <Mic className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                    <button className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white">
                      <Video className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                    <button className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-orange-500/20 text-orange-400 transition-colors hover:bg-orange-500/30">
                      <SkipForward className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
