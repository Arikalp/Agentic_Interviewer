'use client';

import { SignIn } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

export default function LoginPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-zinc-400">Sign in to your account</p>
        </div>
        
        <div className="flex justify-center">
          <SignIn
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'bg-[#1a1a1a] border border-zinc-800 shadow-xl',
                formButtonPrimary: 'bg-[#6c47ff] hover:bg-[#5a3cd6] text-white',
                footerActionLink: 'text-[#6c47ff] hover:text-[#7d5aff]',
                formFieldInput: 'bg-[#0f0f0f] border-zinc-700 text-white focus:border-[#6c47ff]',
                formFieldLabel: 'text-zinc-300',
                dividerLine: 'bg-zinc-800',
                dividerText: 'text-zinc-500',
                socialButtonsBlockButton: 'border-zinc-700 hover:bg-[#1a1a1a]',
                socialButtonsBlockButtonText: 'text-zinc-300',
              },
            }}
            fallbackRedirectUrl="/dashboard"
          />
        </div>
      </div>
    </div>
  );
}
