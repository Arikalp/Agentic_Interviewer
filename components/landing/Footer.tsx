"use client";

import { Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-white">
              Intervo
            </span>
          </a>

          {/* Links */}
          <div className="flex gap-8">
            {["Features", "Demo", "How it Works", "Insights"].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replace(/ /g, "-")}`}
                className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
              >
                {link}
              </a>
            ))}
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
