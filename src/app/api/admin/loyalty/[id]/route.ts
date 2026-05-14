import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isManager } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isManager(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const member = await db.loyaltyMember.findUnique({
    where: { id },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  });
  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  // Recent orders by phone
  const recentOrders = await db.inStoreOrder.findMany({
    where: { loyaltyPhone: member.phone },
    select: {
      id: true,
      displayNumber: true,
      total: true,
      createdAt: true,
      refundedAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return NextResponse.json({ member, recentOrders });
}
