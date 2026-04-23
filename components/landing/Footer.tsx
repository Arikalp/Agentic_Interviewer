"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

export default function Footer() {
  const { isSignedIn } = useUser();
  return (
    <footer className="border-t border-white/5 py-8 sm:py-10 md:py-12 overflow-x-hidden w-full">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 w-full px-3 sm:px-4 md:px-6 lg:px-8 w-full">
        <div className="flex flex-col items-center justify-between gap-6 sm:gap-8 md:flex-row">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2 flex-shrink-0">
            <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-white">
              Intervo
            </span>
          </a>

          {/* Links Container */}
          <div className="flex flex-col items-center gap-4 sm:gap-6 md:flex-row md:gap-8 lg:gap-12">
            {/* Landing Links */}
            <div className="flex gap-4 sm:gap-6 md:gap-8 text-xs sm:text-sm">
              <a
                href="#features"
                className="text-zinc-500 transition-colors hover:text-zinc-300"
              >
                Features
              </a>
              <a
                href="#demo"
                className="text-zinc-500 transition-colors hover:text-zinc-300"
              >
                Demo
              </a>
              <a
                href="#how-it-works"
                className="text-zinc-500 transition-colors hover:text-zinc-300"
              >
                How it Works
              </a>
              <a
                href="#insights"
                className="text-zinc-500 transition-colors hover:text-zinc-300"
              >
                Insights
              </a>
            </div>

            {/* App Links */}
            {isSignedIn && (
              <div className="flex gap-4 sm:gap-6 md:gap-8 text-xs sm:text-sm">
                <Link
                  href="/interview"
                  className="text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  Interview
                </Link>
                <Link
                  href="/dashboard"
                  className="text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  className="text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  Profile
                </Link>
              </div>
            )}
          </div>

          {/* Copyright */}
          <div className="flex flex-col items-center gap-1.5 text-xs sm:text-sm text-zinc-600">
            <p>
              © {new Date().getFullYear()} Intervo
            </p>
            <p>
              Developed by{" "}
              <a
                href="https://arikalp.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-500 transition-colors hover:text-orange-400"
              >
                Team Ctrl+Z
              </a>{" "}
              with <span className="text-red-500">❤</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
