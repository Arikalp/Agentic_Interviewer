import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { createHash } from 'crypto';
import { PRO_PLAN } from '@/lib/plan';

/**
 * POST /api/payment/order
 * Creates a Razorpay order for the one-time Pro upgrade.
 * The client uses the returned orderId to open Razorpay Checkout.
 */
export async function POST() {
  // 1. Authenticate user
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return NextResponse.json(
      { error: 'Payment gateway is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.' },
      { status: 503 },
    );
  }

  try {
    const instance = new Razorpay({ key_id: keyId, key_secret: keySecret });

    // Receipt must be <= 40 chars, hence the hashed userId.
    const receipt = `pro_${createHash('sha256')
      .update(userId)
      .digest('hex')
      .slice(0, 12)}`;

    const order = await instance.orders.create({
      amount: PRO_PLAN.amountPaise,
      currency: PRO_PLAN.currency,
      receipt,
      notes: { userId, plan: PRO_PLAN.id },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      plan: {
        id: PRO_PLAN.id,
        name: PRO_PLAN.name,
        displayPrice: PRO_PLAN.displayPrice,
        features: [...PRO_PLAN.features],
      },
    });
  } catch (error) {
    console.error('[Razorpay] Order creation failed:', error);
    return NextResponse.json(
      { error: 'Could not create payment order. Please try again.' },
      { status: 500 },
    );
  }
}
