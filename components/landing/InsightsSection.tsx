"use client";

import { motion } from "framer-motion";
import { Target, Shield, Sparkles, TrendingUp } from "lucide-react";

const benefits = [
  {
    icon: Target,
    title: "Identify Weak Areas",
    description:
      "Pinpoint exactly where you need improvement with detailed question-by-question analysis.",
  },
  {
    icon: Shield,
    title: "Improve Confidence",
    description:
      "Build rock-solid confidence through repeated practice sessions with realistic scenarios.",
  },
  {
    icon: Sparkles,
    title: "Personalized Feedback",
    description:
      "Receive AI-generated insights tailored to your unique strengths and areas for growth.",
  },
];

const skills = [
  { label: "Communication", value: 85, color: "from-orange-500 to-amber-400" },
  { label: "Technical Skills", value: 72, color: "from-amber-500 to-yellow-400" },
  { label: "Problem Solving", value: 90, color: "from-orange-600 to-orange-400" },
  { label: "Confidence", value: 68, color: "from-yellow-500 to-amber-300" },
];

export default function InsightsSection() {
  return (
    <section id="insights" className="relative py-16 sm:py-20 md:py-24 overflow-x-hidden w-full">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 w-full px-3 sm:px-4 md:px-6 lg:px-8 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
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

        <div className="grid items-center gap-8 sm:gap-10 md:gap-12 lg:grid-cols-2">
          {/* Left — Benefits */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="space-y-4 sm:space-y-5 md:space-y-6"
          >
            {benefits.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="glass-card glass-card-hover flex gap-3 sm:gap-4 rounded-lg sm:rounded-2xl p-4 sm:p-5"
              >
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/10">
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

          {/* Right — Analytics Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <div className="glass-card rounded-lg sm:rounded-2xl p-4 sm:p-6">
              {/* Header */}
              <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400" />
                  <h3 className="text-sm sm:text-base font-bold text-white">Performance Overview</h3>
                </div>
                <span className="rounded-full bg-green-500/15 px-2.5 sm:px-3 py-0.5 sm:py-1 text-xs font-medium text-green-400 w-fit">
                  +12% this week
                </span>
              </div>

              {/* Overall score */}
              <div className="mb-6 sm:mb-8 text-center">
                <div className="relative mx-auto mb-2 sm:mb-3 flex h-20 w-20 sm:h-28 sm:w-28 items-center justify-center">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="8"
                    />
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="url(#gradient)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={264}
                      initial={{ strokeDashoffset: 264 }}
                      whileInView={{ strokeDashoffset: 264 * (1 - 0.79) }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.5, delay: 0.3 }}
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f97316" />
                        <stop offset="100%" stopColor="#fbbf24" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="absolute text-lg sm:text-2xl font-extrabold text-white">
                    79%
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-400">Overall Interview Score</p>
              </div>

              {/* Skill bars */}
              <div className="space-y-3 sm:space-y-4">
                {skills.map((skill, i) => (
                  <div key={skill.label}>
                    <div className="mb-1 sm:mb-1.5 flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-zinc-300">
                        {skill.label}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-zinc-400">
                        {skill.value}%
                      </span>
                    </div>
                    <div className="h-1.5 sm:h-2 overflow-hidden rounded-full bg-white/5">
                      <motion.div
                        className={`h-full rounded-full bg-gradient-to-r ${skill.color}`}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${skill.value}%` }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 1,
                          delay: 0.5 + i * 0.15,
                          ease: "easeOut",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
