"use client";

import { motion } from "framer-motion";
import { Mic, Clock, Video, Send, SkipForward } from "lucide-react";

export default function DemoSection() {
  return (
    <section id="demo" className="relative px-4 py-24 sm:px-6 lg:px-8">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-1/2 left-1/2 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(ellipse, rgba(249,115,22,0.3) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
            See It <span className="gradient-text">In Action</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-zinc-400">
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
          <div className="glass-card overflow-hidden rounded-2xl">
            {/* Header bar */}
            <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
                  <Mic className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    AI Interview Session
                  </p>
                  <p className="text-xs text-zinc-500">
                    Software Engineer — Round 2
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Recording indicator */}
                <div className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse-glow" />
                  <span className="text-xs font-medium text-red-400">
                    Recording
                  </span>
                </div>

                {/* Timer */}
                <div className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5">
                  <Clock className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="font-mono text-sm text-zinc-300">
                    02:45
                  </span>
                </div>
              </div>
            </div>

            {/* Interview content */}
            <div className="p-6">
              <div className="grid gap-6 lg:grid-cols-5">
                {/* Chat / Question area */}
                <div className="space-y-4 lg:col-span-3">
                  {/* AI message */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="glass-card rounded-xl p-4"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500">
                        <Mic className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-orange-400">
                        AI Interviewer
                      </span>
                      <span className="text-[10px] text-zinc-600">
                        just now
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-zinc-300">
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
                    className="flex flex-wrap gap-2"
                  >
                    {[
                      "Message Queue",
                      "WebSocket",
                      "Fan-out Pattern",
                    ].map((hint) => (
                      <span
                        key={hint}
                        className="rounded-full bg-orange-500/10 px-3 py-1 text-xs text-orange-400/80"
                      >
                        💡 {hint}
                      </span>
                    ))}
                  </motion.div>

                  {/* Input */}
                  <div className="flex items-center gap-2 rounded-xl bg-white/[0.03] p-2 border border-white/5">
                    <input
                      type="text"
                      placeholder="Type your answer or speak..."
                      className="flex-1 bg-transparent px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 outline-none"
                      readOnly
                    />
                    <button className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 transition-transform hover:scale-105">
                      <Send className="h-4 w-4 text-white" />
                    </button>
                  </div>
                </div>

                {/* Video preview */}
                <div className="space-y-3 lg:col-span-2">
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-800 aspect-[4/3]">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                          <Video className="h-5 w-5 text-zinc-500" />
                        </div>
                        <p className="text-xs text-zinc-600">Camera Preview</p>
                      </div>
                    </div>
                    <div className="absolute top-2 left-2 flex items-center gap-1 rounded bg-black/60 px-2 py-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      <span className="text-[9px] text-zinc-400">LIVE</span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex justify-center gap-3">
                    <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white">
                      <Mic className="h-4 w-4" />
                    </button>
                    <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white">
                      <Video className="h-4 w-4" />
                    </button>
                    <button className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/20 text-orange-400 transition-colors hover:bg-orange-500/30">
                      <SkipForward className="h-4 w-4" />
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
