"use client";

import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CTASection() {
  const { isLoaded, isSignedIn } = useUser();
  const ctaHref = isSignedIn ? "/dashboard" : "/auth/login";

  return (
    <section className="relative py-16 sm:py-20 md:py-24 overflow-x-hidden w-full">
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

      <div className="relative mx-auto max-w-4xl px-3 sm:px-4 md:px-6 lg:px-8 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
        <div className="glass-card overflow-hidden rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 text-center lg:p-16">
          {/* Inner top glow */}
          <div
            className="pointer-events-none absolute top-0 left-1/2 h-[2px] w-1/2 -translate-x-1/2"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(249,115,22,0.6), transparent)",
            }}
          />

          <h2 className="mb-3 sm:mb-4 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Start Your AI Interview{" "}
            <span className="gradient-text">Today</span>
          </h2>
          <p className="mx-auto mb-6 sm:mb-8 max-w-lg text-sm sm:text-base md:text-lg text-zinc-400">
            Join thousands of candidates who have improved their interview
            skills and landed their dream jobs with Intervo.
          </p>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link
              href={ctaHref}
              className="btn-primary inline-flex items-center justify-center gap-2 text-sm sm:text-base md:text-lg px-6 sm:px-8 py-2.5 sm:py-4"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
          </motion.div>

          <p className="mt-4 text-xs sm:text-sm text-zinc-500">
            No credit card required • Free forever plan
          </p>
        </div>
        </motion.div>
      </div>
    </section>
  );
}
