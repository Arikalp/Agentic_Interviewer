import { getMongoDb } from '@/lib/mongodb';

/**
 * One-time Pro plan configuration. Amount is stored in paise
 * (Razorpay always uses the smallest currency unit), price is
 * displayed in rupees.
 */
export const PRO_PLAN = {
  id: 'pro',
  name: 'Intervoo Pro',
  currency: 'INR',
  /** Amount in paise (₹499 = 49900). Override with PRO_PRICE_PAISE env var. */
  amountPaise: Number(process.env.PRO_PRICE_PAISE) || 49900,
  displayPrice: `₹${(Number(process.env.PRO_PRICE_PAISE) || 49900) / 100}`,
  features: [
    'Unlimited mock interviews',
    'AI-powered behavioral analysis',
    'Adaptive follow-up questions',
    'Detailed performance insights',
  ],
} as const;

export type UserPlan = {
  plan: 'free' | 'pro';
  proActivatedAt?: Date;
  proPaymentId?: string;
  proOrderId?: string;
};

/**
 * Reads the user's current plan from the `users` collection.
 * Users with no document (or no plan field) are treated as free-tier.
 */
export async function getUserPlan(userId: string): Promise<UserPlan> {
  const db = await getMongoDb();
  const user = await db.collection('users').findOne(
    { userId },
    {
      projection: {
        plan: 1,
        proActivatedAt: 1,
        proPaymentId: 1,
        proOrderId: 1,
      },
    },
  );

  if (!user || user.plan !== 'pro') {
    return { plan: 'free' };
  }

  return {
    plan: 'pro',
    proActivatedAt: user.proActivatedAt ?? undefined,
    proPaymentId: user.proPaymentId ?? undefined,
    proOrderId: user.proOrderId ?? undefined,
  };
}

/** Convenience check for gating server-side features. */
export async function isUserPro(userId: string): Promise<boolean> {
  return (await getUserPlan(userId)).plan === 'pro';
}

/**
 * Marks a user as Pro after a verified successful payment.
 * Idempotent — Razorpay webhooks or client verifications may
 * fire more than once, so we simply overwrite with the same data.
 */
export async function activatePro(
  userId: string,
  paymentId: string,
  orderId: string,
): Promise<void> {
  const now = new Date();
  const db = await getMongoDb();
  await db.collection('users').updateOne(
    { userId },
    {
      $set: {
        userId,
        plan: 'pro',
        proActivatedAt: now,
        proPaymentId: paymentId,
        proOrderId: orderId,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );
}
