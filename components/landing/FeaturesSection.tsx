"use client";

import { motion } from "framer-motion";
import {
  FileText,
  Video,
  MessageSquare,
  BarChart3,
  Infinity,
  Brain,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Resume-Based Questions",
    description:
      "AI analyzes your resume and generates tailored interview questions based on your experience and skills.",
  },
  {
    icon: Video,
    title: "AI Video Interview",
    description:
      "Engage in real-time video interviews with an AI interviewer from Intervo that adapts to your responses.",
  },
  {
    icon: MessageSquare,
    title: "Real-Time Feedback",
    description:
      "Get instant feedback on your answers, communication style, and body language during the interview.",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    description:
      "Track your progress over time with detailed analytics and performance metrics.",
  },
  {
    icon: Infinity,
    title: "Unlimited Practice",
    description:
      "Practice as many times as you want. Every session improves your confidence and skills.",
  },
  {
    icon: Brain,
    title: "Smart Insights",
    description:
      "AI-powered insights identify your strengths and weaknesses to create a personalized improvement plan.",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export default function FeaturesSection() {
  return (
    <section id="features" className="relative py-16 sm:py-20 md:py-24 overflow-x-hidden w-full">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 w-full px-3 sm:px-4 md:px-6 lg:px-8 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-12 sm:mb-14 md:mb-16 text-center"
        >
          <h2 className="mb-3 sm:mb-4 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Everything You Need to{" "}
            <span className="gradient-text">Ace Your Interview</span>
          </h2>
          <p className="mx-auto max-w-2xl text-sm sm:text-base md:text-lg text-zinc-400">
            Our AI-powered platform provides comprehensive tools to help you
            prepare, practice, and perfect your interview skills.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              className="glass-card glass-card-hover rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6"
            >
              <div className="mb-3 sm:mb-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20">
                <feature.icon className="h-5 w-5 sm:h-6 sm:w-6 text-orange-400" />
              </div>
              <h3 className="mb-2 text-base sm:text-lg font-bold text-white">
                {feature.title}
              </h3>
              <p className="text-xs sm:text-sm leading-relaxed text-zinc-400">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
