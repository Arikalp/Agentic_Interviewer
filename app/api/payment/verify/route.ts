import { auth } from '@clerk/nextjs/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { activatePro, getUserPlan } from '@/lib/plan';

/**
 * POST /api/payment/verify
 * Verifies the Razorpay Checkout signature after a successful client-side
 * payment and activates Pro for the signed-in user.
 * Webhook verification (`/api/payment/webhook`) acts as a backup for
 * clients that close the tab before this route is reached.
 */
export async function POST(request: Request) {
  // 1. Authenticate user
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Validate configuration
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return NextResponse.json(
      { error: 'Payment gateway is not configured.' },
      { status: 503 },
    );
  }

  try {
    // 3. Parse the Checkout handler payload
    const body = (await request.json().catch(() => ({}))) as {
      razorpay_order_id?: unknown;
      razorpay_payment_id?: unknown;
      razorpay_signature?: unknown;
    };

    const orderId = typeof body.razorpay_order_id === 'string' ? body.razorpay_order_id : '';
    const paymentId = typeof body.razorpay_payment_id === 'string' ? body.razorpay_payment_id : '';
    const signature = typeof body.razorpay_signature === 'string' ? body.razorpay_signature : '';

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json({ error: 'Missing payment details.' }, { status: 400 });
    }

    // 4. Recompute the expected signature: HMAC-SHA256(order_id|payment_id, key_secret)
    const expected = createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expected, 'hex');
    const signatureBuf = Buffer.from(signature, 'hex');
    const isValid =
      expectedBuf.length === signatureBuf.length &&
      timingSafeEqual(expectedBuf, signatureBuf);

    if (!isValid) {
      console.warn(`[Razorpay] Signature verification failed for user ${userId}`);
      return NextResponse.json({ error: 'Invalid payment signature.' }, { status: 400 });
    }

    // 5. Activate Pro (idempotent upsert) and return the new plan
    await activatePro(userId, paymentId, orderId);

    return NextResponse.json({
      message: 'Payment verified. Pro activated.',
      plan: (await getUserPlan(userId)).plan,
    });
  } catch (error) {
    console.error('[Razorpay] Verification failed:', error);
    return NextResponse.json(
      { error: 'Payment verification failed. Please try again.' },
      { status: 500 },
    );
  }
}
