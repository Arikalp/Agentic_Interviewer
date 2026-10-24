import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { activatePro } from '@/lib/plan';

/**
 * POST /api/payment/webhook
 * Razorpay webhook endpoint — acts as a reliable server-to-server backup
 * for activating Pro in case the client closes the browser before the
 * verification route runs.
 *
 * Configure in the Razorpay Dashboard:
 *   URL:    https://<your-domain>/api/payment/webhook
 *   Secret: same value as RAZORPAY_WEBHOOK_SECRET in .env
 *   Event:  payment.captured
 */
export async function POST(request: Request) {
  // 1. Validate configuration
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 503 });
  }

  // 2. Read the raw body (signature is computed over the exact bytes)
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature') ?? '';

  // 3. Verify webhook signature: HMAC-SHA256(rawBody, webhook_secret)
  const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  const signatureBuf = Buffer.from(signature, 'hex');
  const isValid =
    expectedBuf.length === signatureBuf.length && timingSafeEqual(expectedBuf, signatureBuf);

  if (!isValid) {
    console.warn('[Razorpay] Webhook signature verification failed.');
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  // 4. Handle the payment.captured event
  try {
    const event = JSON.parse(rawBody) as {
      event?: string;
      payload?: {
        payment?: {
          entity?: {
            id?: string;
            order_id?: string;
            notes?: { userId?: string };
          };
        };
      };
    };

    if (event.event !== 'payment.captured') {
      return NextResponse.json({ received: true });
    }

    const payment = event.payload?.payment?.entity;
    const userId = payment?.notes?.userId;
    const paymentId = payment?.id;
    const orderId = payment?.order_id;

    // userId was embedded in order notes when creating the order.
    if (userId && paymentId && orderId) {
      await activatePro(userId, paymentId, orderId);
    } else {
      console.error('[Razorpay] Webhook payload missing userId/payment details.');
    }

    // 5. Razorpay retries until a 2xx is returned.
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Razorpay] Webhook processing failed:', error);
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}
