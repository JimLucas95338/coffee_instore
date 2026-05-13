import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isManager } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * Manager+ view of in-store orders. Supports a date range and returns
 * everything needed for the /admin/orders list, including refund metadata.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isManager(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');

  // Default to today if no range given.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const from = fromParam ? new Date(fromParam) : today;
  const to = toParam ? new Date(toParam) : tomorrow;

  const orders = await db.inStoreOrder.findMany({
    where: { createdAt: { gte: from, lt: to } },
    include: {
      items: {
        include: {
          menuItem: { select: { name: true, category: true } },
        },
      },
      employee: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Pull the refunder's name (admin who clicked the refund button).
  const refunderIds = Array.from(
    new Set(orders.map((o) => o.refundedById).filter((x): x is string => !!x))
  );
  const refunders = refunderIds.length
    ? await db.user.findMany({
        where: { id: { in: refunderIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const refunderMap = new Map(refunders.map((u) => [u.id, u]));

  const result = orders.map((o) => ({
    ...o,
    refundedBy: o.refundedById ? refunderMap.get(o.refundedById) ?? null : null,
  }));

  return NextResponse.json({ orders: result });
}
