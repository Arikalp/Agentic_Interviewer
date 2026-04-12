'use client';

import { useUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      redirect('/');
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-white mb-4">
          Welcome, {user?.firstName || 'User'}!
        </h1>
        <p className="text-zinc-400 text-lg mb-8">
          You're now signed in and ready to start your interview preparation.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-zinc-800 bg-linear-to-br from-[#1a1a1a] to-[#0f0f0f] p-6 hover:border-[#6c47ff] transition-colors">
            <h3 className="text-xl font-semibold text-white mb-2">Start Interview</h3>
            <p className="text-zinc-400 text-sm mb-4">Begin a new mock interview session</p>
            <button className="text-[#6c47ff] hover:text-[#7d5aff] font-medium text-sm">
              Get Started →
            </button>
          </div>
          
          <div className="rounded-2xl border border-zinc-800 bg-linear-to-br from-[#1a1a1a] to-[#0f0f0f] p-6 hover:border-[#6c47ff] transition-colors">
            <h3 className="text-xl font-semibold text-white mb-2">View History</h3>
            <p className="text-zinc-400 text-sm mb-4">Review your past interviews and feedback</p>
            <button className="text-[#6c47ff] hover:text-[#7d5aff] font-medium text-sm">
              View More →
            </button>
          </div>
          
          <div className="rounded-2xl border border-zinc-800 bg-linear-to-br from-[#1a1a1a] to-[#0f0f0f] p-6 hover:border-[#6c47ff] transition-colors">
            <h3 className="text-xl font-semibold text-white mb-2">Profile</h3>
            <p className="text-zinc-400 text-sm mb-4">View your details, history, and resume</p>
            <Link href="/profile" className="text-[#6c47ff] hover:text-[#7d5aff] font-medium text-sm inline-block">
              Open Profile →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
