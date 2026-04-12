"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Menu, X, Sparkles } from "lucide-react";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Demo", href: "#demo" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Insights", href: "#insights" },
];

export default function Navbar() {
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollY } = useScroll();
  const { isSignedIn } = useUser();

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
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className="mt-3 flex items-center justify-between rounded-2xl px-6 py-3"
          style={{
            background: "rgba(10, 10, 10, 0.8)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Logo */}
          <a href="#" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-orange-500 to-amber-500">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">
              AI <span className="gradient-text">Interviewer</span>
            </span>
          </a>

          {/* Desktop Nav Links */}
          {isSignedIn ? (
            <div className="hidden items-center gap-8 md:flex">
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
          ) : null}

          {/* Desktop Auth */}
          <div className="hidden items-center gap-3 md:flex">
            {!isSignedIn ? (
              <>
                <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                  <button className="rounded-full px-5 py-2 text-sm font-medium text-zinc-300 transition-colors hover:text-white cursor-pointer">
                    Login
                  </button>
                </SignInButton>
                <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                  <button className="btn-primary px-5! py-2! text-sm cursor-pointer">
                    Sign Up
                  </button>
                </SignUpButton>
              </>
            ) : (
              <UserButton afterSignOutUrl="/" userProfileMode="modal" />
            )}
          </div>

          {/* Mobile Menu Button */}
          {isSignedIn ? (
            <button
              className="text-zinc-400 hover:text-white md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          ) : null}
        </div>

        {/* Mobile Menu */}
        {isSignedIn && mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 rounded-2xl p-4 md:hidden"
            style={{
              background: "rgba(10, 10, 10, 0.95)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {link.label}
                </a>
              ))}
              {!isSignedIn ? (
                <div className="flex gap-2">
                  <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                    <button onClick={() => setMobileOpen(false)} className="flex-1 rounded-full px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white text-center cursor-pointer">
                      Login
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                    <button onClick={() => setMobileOpen(false)} className="btn-primary flex-1 px-4! py-2! text-sm text-center cursor-pointer">
                      Sign Up
                    </button>
                  </SignUpButton>
                </div>
              ) : (
                <div className="flex justify-center">
                  <UserButton afterSignOutUrl="/" userProfileMode="modal" />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
}
