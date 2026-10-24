'use client';

import { useCallback, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';

/** Shape returned by POST /api/payment/order */
type OrderResponse = {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
};

// Minimum Razorpay Checkout typings used here.
type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  theme: { color: string };
  prefill?: { name?: string; email?: string };
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void | Promise<void>;
  modal?: {
    ondismiss?: () => void;
  };
};

type RazorpayConstructor = new (options: RazorpayOptions) => { open: () => void };

/**
 * Loads the Razorpay Checkout script once and resolves when available.
 */
async function loadRazorpayScript(): Promise<RazorpayConstructor | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const existing = window.Razorpay as RazorpayConstructor | undefined;
  if (existing) {
    return existing;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay Checkout.'));
    document.body.appendChild(script);
  });

  return (window.Razorpay as RazorpayConstructor | undefined) ?? null;
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

type UpgradeToProProps = {
  /** Filled-in by Clerk user info, used to prefill checkout. */
  name?: string;
  email?: string;
  className?: string;
  label?: string;
  /** Called after Pro has been successfully activated. */
  onSuccess?: () => void;
};

/**
 * Button that starts the Pro purchase flow:
 * 1. Creates a Razorpay order on the server.
 * 2. Opens Razorpay Checkout.
 * 3. Verifies the payment signature server-side to activate Pro.
 */
export default function UpgradeToPro({
  name,
  email,
  className,
  label = 'Upgrade to Pro',
  onSuccess,
}: UpgradeToProProps) {
  const [status, setStatus] = useState<'idle' | 'starting' | 'paying'>('idle');
  const [error, setError] = useState('');

  const startPayment = useCallback(async () => {
    setError('');
    setStatus('starting');

    try {
      // 1. Create the order server-side.
      const orderResponse = await fetch('/api/payment/order', { method: 'POST' });
      const orderData = (await orderResponse.json()) as OrderResponse & { error?: string };

      if (!orderResponse.ok) {
        throw new Error(orderData.error ?? 'Could not start the upgrade.');
      }

      // 2. Load Checkout and open the payment modal.
      const Razorpay = await loadRazorpayScript();
      if (!Razorpay) {
        throw new Error('Failed to load the payment gateway. Please try again.');
      }

      setStatus('paying');

      const checkout = new Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Intervoo',
        description: 'Intervoo Pro — one-time upgrade',
        order_id: orderData.orderId,
        theme: { color: '#f97316' },
        prefill: { name, email },
        modal: {
          ondismiss: () => {
            setStatus('idle');
            setError('Payment cancelled. You can upgrade anytime.');
          },
        },
        handler: async (response) => {
          // 3. Verify server-side before granting Pro.
          const verifyResponse = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
          });
          const verifyData = (await verifyResponse.json()) as { error?: string };

          if (!verifyResponse.ok) {
            throw new Error(verifyData.error ?? 'Payment verification failed.');
          }

          setStatus('idle');
          onSuccess?.();
        },
      });

      checkout.open();
    } catch (err) {
      setStatus('idle');
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }, [name, email, onSuccess]);

  const busy = status !== 'idle';

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={startPayment}
        disabled={busy}
        className={
          className ??
          'inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60'
        }
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {status === 'starting' ? 'Preparing…' : busy ? 'Waiting for payment…' : label}
      </button>
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
