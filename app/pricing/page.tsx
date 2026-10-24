'use client';

import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Check, Crown, Loader2 } from 'lucide-react';
import UpgradeToPro from '@/components/pro/upgrade-to-pro';

type PlanResponse = {
  plan: 'free' | 'pro';
  pro: {
    id: string;
    name: string;
    displayPrice: string;
    features: string[];
  };
};

export default function PricingPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [data, setData] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/payment/plan');
    if (res.ok) {
      setData((await res.json()) as PlanResponse);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadPlan().catch(() => setLoading(false));
    } else if (isLoaded) {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, loadPlan]);

  const isPro = data?.plan === 'pro';

  if (!isLoaded || (isLoaded && !isSignedIn)) {
    // Mirror the app's other gated pages: sign users out/in first.
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-4 text-center text-zinc-100">
        <h1 className="text-2xl font-bold">Sign in required</h1>
        <p className="text-sm text-zinc-400">Sign in to view plans and upgrade.</p>
        <Link
          href="/auth/login"
          className="rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-600"
        >
          Sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 py-12 text-zinc-100">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-xl">
        <div className="mb-6 text-center">
          <Crown className="mx-auto mb-3 h-10 w-10 text-orange-500" />
          <h1 className="text-2xl font-bold">Intervoo Pro</h1>
          <p className="mt-1 text-sm text-zinc-400">
            One-time payment. Lifetime access — no renewals.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
          </div>
        ) : isPro ? (
          <div className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-4 text-center text-sm text-orange-300">
            You are already on Pro. Enjoy all features at{' '}
            <Link href="/dashboard" className="font-semibold underline">
              /dashboard
            </Link>
            .
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <span className="text-4xl font-extrabold">{data?.pro.displayPrice ?? '₹499'}</span>
              <span className="text-sm text-zinc-400"> one-time</span>
            </div>

            <ul className="mb-8 space-y-3">
              {(data?.pro.features ?? [
                'Unlimited mock interviews',
                'AI-powered behavioral analysis',
                'Adaptive follow-up questions',
                'Detailed performance insights',
              ]).map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm text-zinc-300">
                  <Check className="h-4 w-4 shrink-0 text-orange-500" />
                  {feature}
                </li>
              ))}
            </ul>

            <UpgradeToPro
              name={user?.fullName ?? undefined}
              email={user?.primaryEmailAddress?.emailAddress ?? undefined}
              onSuccess={loadPlan}
              className="w-full rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            />
            <p className="mt-4 text-center text-xs text-zinc-500">
              Secured by Razorpay. UPI, cards, netbanking & wallets supported.
            </p>
          </>
        )}
      </div>

      <Link href="/dashboard" className="mt-6 text-sm text-zinc-400 hover:text-zinc-200">
        ← Back to dashboard
      </Link>
    </main>
  );
}
