"use client";

import { motion } from "framer-motion";
import { Upload, Video, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: Upload,
    number: "01",
    title: "Upload Resume",
    description:
      "Upload your resume and the AI will analyze your skills, experience, and target role to prepare relevant questions.",
  },
  {
    icon: Video,
    number: "02",
    title: "Start AI Interview",
    description:
      "Begin your real-time video interview with our AI interviewer. It adapts questions based on your answers.",
  },
  {
    icon: TrendingUp,
    number: "03",
    title: "Get Insights",
    description:
      "Receive comprehensive feedback, performance scores, and actionable insights to improve your interview skills.",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const stepVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative px-4 py-24 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-zinc-400">
            Get started in three simple steps. No complex setup, no hassle.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="relative grid gap-8 md:grid-cols-3"
        >
          {/* Connecting line */}
          <div
            className="pointer-events-none absolute top-16 left-[16.67%] right-[16.67%] hidden h-[2px] md:block"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(249,115,22,0.3) 20%, rgba(249,115,22,0.3) 80%, transparent 100%)",
            }}
          />

          {steps.map((step) => (
            <motion.div
              key={step.number}
              variants={stepVariants}
              className="relative text-center"
            >
              {/* Number badge */}
              <div className="relative mx-auto mb-6">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/20">
                  <step.icon className="h-8 w-8 text-orange-400" />
                </div>
                <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-xs font-bold text-white">
                  {step.number}
                </span>
              </div>

              <h3 className="mb-3 text-xl font-bold text-white">
                {step.title}
              </h3>
              <p className="mx-auto max-w-xs text-sm leading-relaxed text-zinc-400">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
