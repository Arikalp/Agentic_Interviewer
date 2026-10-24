import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { PRO_PLAN, getUserPlan } from '@/lib/plan';

/**
 * GET /api/payment/plan
 * Returns the signed-in user's current plan plus the Pro plan metadata
 * (price/features) so pricing pages can render live data.
 */
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userPlan = await getUserPlan(userId);

  return NextResponse.json({
    plan: userPlan.plan,
    proActivatedAt: userPlan.proActivatedAt ?? null,
    pro: {
      id: PRO_PLAN.id,
      name: PRO_PLAN.name,
      displayPrice: PRO_PLAN.displayPrice,
      features: [...PRO_PLAN.features],
    },
  });
}
