"use client";

import { useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Menu, X, Sparkles } from "lucide-react";
import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import Link from "next/link";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Demo", href: "#demo" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Insights", href: "#insights" },
];

const appNavLinks = [
  { label: "Interview", href: "/interview" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Profile", href: "/profile" },
];

export default function Navbar() {
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollY } = useScroll();
  const { isSignedIn, user } = useUser();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const prev = scrollY.getPrevious() ?? 0;
    if (latest > prev && latest > 150) {
      setHidden(true);
      setMobileOpen(false);
    } else {
      setHidden(false);
    }
  });

  return (
    <motion.nav
      variants={{
        visible: { y: 0 },
        hidden: { y: "-100%" },
      }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.35, ease: "easeInOut" }}
      className="fixed top-0 left-0 right-0 z-50 w-full overflow-x-hidden"
    >
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div
            className="mt-3 flex items-center justify-between rounded-2xl px-3 sm:px-6 py-3"
            style={{
              background: "rgba(10, 10, 10, 0.8)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {/* Logo */}
            <a href="#" className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-linear-to-br from-orange-500 to-amber-500">
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
              </div>
              <span className="text-base sm:text-lg font-bold text-white">
                Intervo
              </span>
            </a>

            {/* Desktop Nav Links - Only for signed in users */}
            {isSignedIn && (
              <div className="hidden items-center gap-6 md:gap-8 lg:flex">
                {appNavLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Desktop Nav Links - Only for non-signed in users */}
            {!isSignedIn && (
              <div className="hidden items-center gap-6 md:gap-8 lg:flex">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            )}

            {/* Desktop Auth */}
            <div className="hidden items-center gap-2 sm:gap-3 md:flex flex-shrink-0">
              {!isSignedIn ? (
                <>
                  <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                    <button className="rounded-full px-3 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-zinc-300 transition-colors hover:text-white cursor-pointer whitespace-nowrap">
                      Login
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                    <button className="btn-primary px-3 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm cursor-pointer whitespace-nowrap">
                      Sign Up
                    </button>
                  </SignUpButton>
                </>
              ) : (
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-700/80 bg-zinc-900/70 px-2 py-1.5 transition-colors hover:border-zinc-500"
                  aria-label="Open profile"
                >
                  <img
                    src={user?.imageUrl || "https://placehold.co/40x40"}
                    alt="Profile"
                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-full object-cover"
                  />
                  <span className="hidden sm:inline pr-2 text-xs font-medium text-zinc-300">Profile</span>
                </Link>
              )}
            </div>

            {/* Mobile Menu Button - Always show on mobile */}
            <button
              className="text-zinc-400 hover:text-white md:hidden flex-shrink-0"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Mobile Menu - Responsive for both signed in and non-signed in */}
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-2 rounded-2xl p-4 md:hidden"
              style={{
                background: "rgba(10, 10, 10, 0.95)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex flex-col gap-3">
                {/* Navigation Links */}
                {isSignedIn ? (
                  appNavLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      {link.label}
                    </Link>
                  ))
                ) : (
                  navLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      {link.label}
                    </a>
                  ))
                )}

                {/* Auth Section */}
                <div className="border-t border-zinc-700/50 pt-3 mt-3">
                  {!isSignedIn ? (
                    <div className="flex flex-col gap-2">
                      <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                        <button className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white hover:bg-white/5">
                          Login
                        </button>
                      </SignInButton>
                      <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                        <button className="btn-primary w-full text-sm font-medium py-2">
                          Sign Up
                        </button>
                      </SignUpButton>
                    </div>
                  ) : (
                    <Link
                      href="/profile"
                      onClick={() => setMobileOpen(false)}
                      className="inline-flex items-center justify-center w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white"
                    >
                      Open Profile
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
