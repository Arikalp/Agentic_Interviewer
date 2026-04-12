"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

export default function Footer() {
  const { isSignedIn } = useUser();
  return (
    <footer className="border-t border-white/5 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center justify-between gap-8 sm:flex-row">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-white">
              Intervo
            </span>
          </a>

          {/* Links Container */}
          <div className="flex flex-col gap-6 sm:flex-row sm:gap-12">
            {/* Landing Links */}
            <div className="flex gap-8">
              <Link
                href="/features"
                className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
              >
                Features
              </Link>
              <Link
                href="/demo"
                className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
              >
                Demo
              </Link>
              <Link
                href="/how-it-works"
                className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
              >
                How it Works
              </Link>
              <Link
                href="/insights"
                className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
              >
                Insights
              </Link>
            </div>

            {/* App Links */}
            {isSignedIn && (
              <div className="flex gap-8">
                <Link
                  href="/interview"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  Interview
                </Link>
                <Link
                  href="/dashboard"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  Profile
                </Link>
              </div>
            )}
          </div>

          {/* Copyright */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-zinc-600">
              © {new Date().getFullYear()} Intervo
            </p>
            <p className="text-sm text-zinc-600">
              Developed by{" "}
              <a
                href="https://arikalp.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-500 transition-colors hover:text-orange-400"
              >
                Sankalp
              </a>{" "}
              with <span className="text-red-500">❤</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
