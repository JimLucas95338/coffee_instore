import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isManager } from '@/lib/auth';
import { db } from '@/lib/db';

interface DailyBucket {
  date: string;
  gross: number;
  net: number;
  orders: number;
}

interface ItemRanking {
  menuItemId: string | null;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
}

/**
 * Aggregate sales for a date range. Manager+ only.
 *
 * Net = gross - refunded amounts. Refunded orders still count toward the
 * "orders" count for the day (they happened, they were just reversed).
 *
 * Top items use the order items table directly, so they reflect what was
 * sold — including items that are no longer on the menu.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isManager(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');

  if (!fromParam || !toParam) {
    return NextResponse.json({ error: 'from and to are required' }, { status: 400 });
  }

  const from = new Date(fromParam);
  const to = new Date(toParam);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
  }

  const orders = await db.inStoreOrder.findMany({
    where: { createdAt: { gte: from, lt: to } },
    select: {
      id: true,
      total: true,
      tax: true,
      subtotal: true,
      paymentMethod: true,
      refundedAmount: true,
      refundedAt: true,
      manualDiscount: true,
      createdAt: true,
      items: {
        select: {
          menuItemId: true,
          quantity: true,
          totalPrice: true,
          menuItem: { select: { name: true, category: true } },
        },
      },
    },
  });

  // Headline totals
  const gross = orders.reduce((s, o) => s + o.total, 0);
  const refunded = orders.reduce((s, o) => s + (o.refundedAmount ?? 0), 0);
  const net = gross - refunded;
  const tax = orders.reduce((s, o) => s + o.tax, 0);
  const orderCount = orders.length;
  const refundCount = orders.filter((o) => o.refundedAt).length;
  const avgTicket = orderCount > 0 ? gross / orderCount : 0;
  const manualDiscountTotal = orders.reduce((s, o) => s + (o.manualDiscount ?? 0), 0);
  const manualDiscountCount = orders.filter((o) => (o.manualDiscount ?? 0) > 0).length;

  // Payment method breakdown
  const byPaymentMethod: Record<string, { gross: number; count: number }> = {};
  for (const o of orders) {
    const k = o.paymentMethod;
    if (!byPaymentMethod[k]) byPaymentMethod[k] = { gross: 0, count: 0 };
    byPaymentMethod[k].gross += o.total;
    byPaymentMethod[k].count += 1;
  }

  // Per-day aggregation
  const byDay = new Map<string, DailyBucket>();
  for (const o of orders) {
    const d = o.createdAt;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`;
    const b = byDay.get(key) ?? { date: key, gross: 0, net: 0, orders: 0 };
    b.gross += o.total;
    b.net += o.total - (o.refundedAmount ?? 0);
    b.orders += 1;
    byDay.set(key, b);
  }
  const daily = Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Top items + category breakdown
  const itemMap = new Map<string, ItemRanking>();
  const byCategory: Record<string, { quantity: number; revenue: number }> = {};
  for (const o of orders) {
    const isRefunded = !!o.refundedAt;
    for (const item of o.items) {
      const key = item.menuItemId ?? `__unknown_${item.menuItem.name}`;
      const r = itemMap.get(key) ?? {
        menuItemId: item.menuItemId,
        name: item.menuItem.name,
        category: item.menuItem.category,
        quantity: 0,
        revenue: 0,
      };
      r.quantity += item.quantity;
      // Subtract refunded revenue proportionally — assume full refund
      // covers all items equally. Good-enough until partial refunds exist.
      r.revenue += isRefunded ? 0 : item.totalPrice;
      itemMap.set(key, r);

      const cat = byCategory[item.menuItem.category] ?? { quantity: 0, revenue: 0 };
      cat.quantity += item.quantity;
      cat.revenue += isRefunded ? 0 : item.totalPrice;
      byCategory[item.menuItem.category] = cat;
    }
  }
  const topItems = Array.from(itemMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 15);

  return NextResponse.json({
    range: { from: from.toISOString(), to: to.toISOString() },
    totals: {
      gross,
      refunded,
      net,
      tax,
      orderCount,
      refundCount,
      avgTicket,
      manualDiscountTotal,
      manualDiscountCount,
    },
    daily,
    byPaymentMethod,
    topItems,
    byCategory,
  });
}
