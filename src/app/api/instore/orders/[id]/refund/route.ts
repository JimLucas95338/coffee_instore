import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions, isManager } from '@/lib/auth';
import { db } from '@/lib/db';

const refundSchema = z.object({
  reason: z.string().min(1).max(500),
  amount: z.number().positive().optional(),
});

/**
 * Manager/admin-only refund. Records who issued the refund, when, the
 * amount, and the reason. Does not touch the inventory or order status
 * directly — the order remains visible in history but flagged as refunded.
 *
 * No real-money refund happens today (payment integration is honor-system).
 * When Stripe Terminal is wired up, this is where the Stripe refund API call
 * goes.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isManager(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { reason, amount } = refundSchema.parse(body);

    const order = await db.inStoreOrder.findUnique({
      where: { id },
      select: { id: true, total: true, refundedAt: true },
    });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.refundedAt) {
      return NextResponse.json(
        { error: 'Order has already been refunded' },
        { status: 409 }
      );
    }

    const refundAmount = amount ?? order.total;
    if (refundAmount > order.total) {
      return NextResponse.json(
        { error: 'Refund amount exceeds order total' },
        { status: 400 }
      );
    }

    const updated = await db.inStoreOrder.update({
      where: { id },
      data: {
        refundedAt: new Date(),
        refundedAmount: refundAmount,
        refundedById: session.user.id,
        refundReason: reason,
      },
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('Error issuing refund:', error);
    return NextResponse.json({ error: 'Failed to issue refund' }, { status: 500 });
  }
}
