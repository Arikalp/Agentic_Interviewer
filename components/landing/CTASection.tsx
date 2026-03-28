"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function CTASection() {
  return (
    <section className="relative px-4 py-24 sm:px-6 lg:px-8">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-1/2 left-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25"
          style={{
            background:
              "radial-gradient(ellipse, rgba(249,115,22,0.4) 0%, transparent 70%)",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="relative mx-auto max-w-4xl"
      >
        <div className="glass-card overflow-hidden rounded-3xl p-12 text-center sm:p-16">
          {/* Inner top glow */}
          <div
            className="pointer-events-none absolute top-0 left-1/2 h-[2px] w-1/2 -translate-x-1/2"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(249,115,22,0.6), transparent)",
            }}
          />

          <h2 className="mb-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Start Your AI Interview{" "}
            <span className="gradient-text">Today</span>
          </h2>
          <p className="mx-auto mb-8 max-w-lg text-lg text-zinc-400">
            Join thousands of candidates who have improved their interview
            skills and landed their dream jobs with AI Interviewer.
          </p>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary inline-flex items-center gap-2 text-lg !px-8 !py-4"
          >
            Get Started Free
            <ArrowRight className="h-5 w-5" />
          </motion.button>

          <p className="mt-4 text-sm text-zinc-500">
            No credit card required • Free forever plan
          </p>
        </div>
      </motion.div>
    </section>
  );
}
