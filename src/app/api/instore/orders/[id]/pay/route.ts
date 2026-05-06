import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST: Mark an order as paid (for cash payments)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const order = await db.inStoreOrder.findUnique({
      where: { id },
      select: { id: true, paymentStatus: true, paymentMethod: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.paymentStatus === 'PAID') {
      return NextResponse.json({ success: true, message: 'Already paid' });
    }

    await db.inStoreOrder.update({
      where: { id },
      data: {
        paymentStatus: 'PAID',
        paidAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking order as paid:', error);
    return NextResponse.json({ error: 'Failed to mark as paid' }, { status: 500 });
  }
}
