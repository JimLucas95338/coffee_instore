import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

type Period = 'today' | '7d' | '30d';

function getStartDate(period: Period): Date {
  const now = new Date();
  switch (period) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case '7d':
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      return sevenDaysAgo;
    case '30d':
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);
      return thirtyDaysAgo;
    default:
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || 'today') as Period;

    if (!['today', '7d', '30d'].includes(period)) {
      return NextResponse.json(
        { error: 'Invalid period. Use today, 7d, or 30d.' },
        { status: 400 }
      );
    }

    const startDate = getStartDate(period);
    const dateFilter = { createdAt: { gte: startDate } };

    // --- Stats aggregate ---
    const [statsAgg, totalItemsAgg] = await Promise.all([
      db.inStoreOrder.aggregate({
        where: dateFilter,
        _count: { id: true },
        _sum: { total: true },
        _avg: { total: true },
      }),
      db.inStoreOrderItem.aggregate({
        where: { order: dateFilter },
        _sum: { quantity: true },
      }),
    ]);

    const stats = {
      totalOrders: statsAgg._count.id,
      totalRevenue: statsAgg._sum.total ?? 0,
      avgOrderValue: statsAgg._avg.total ?? 0,
      totalItems: totalItemsAgg._sum.quantity ?? 0,
    };

    // --- Hourly volume ---
    const orders = await db.inStoreOrder.findMany({
      where: dateFilter,
      select: { createdAt: true, total: true },
    });

    const hourlyMap = new Map<number, { orders: number; revenue: number }>();
    for (let h = 0; h < 24; h++) {
      hourlyMap.set(h, { orders: 0, revenue: 0 });
    }
    for (const order of orders) {
      const hour = order.createdAt.getHours();
      const entry = hourlyMap.get(hour)!;
      entry.orders += 1;
      entry.revenue += order.total;
    }
    const hourlyVolume = Array.from(hourlyMap.entries()).map(([hour, data]) => ({
      hour,
      orders: data.orders,
      revenue: Math.round(data.revenue * 100) / 100,
    }));

    // --- Daily trend ---
    const dailyMap = new Map<string, { orders: number; revenue: number }>();
    const days = period === 'today' ? 1 : period === '7d' ? 7 : 30;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyMap.set(key, { orders: 0, revenue: 0 });
    }
    for (const order of orders) {
      const key = order.createdAt.toISOString().split('T')[0];
      const entry = dailyMap.get(key);
      if (entry) {
        entry.orders += 1;
        entry.revenue += order.total;
      }
    }
    const dailyTrend = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      orders: data.orders,
      revenue: Math.round(data.revenue * 100) / 100,
    }));

    // --- Best sellers (top 10) ---
    const bestSellersRaw = await db.inStoreOrderItem.groupBy({
      by: ['menuItemId'],
      where: { order: dateFilter },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    });

    const menuItemIds = bestSellersRaw.map((b) => b.menuItemId);
    const menuItems = await db.menuItem.findMany({
      where: { id: { in: menuItemIds } },
      select: { id: true, name: true },
    });
    const menuNameMap = new Map(menuItems.map((m) => [m.id, m.name]));

    const bestSellers = bestSellersRaw.map((b) => ({
      name: menuNameMap.get(b.menuItemId) ?? 'Unknown',
      quantity: b._sum?.quantity ?? 0,
      revenue: b._sum?.totalPrice ?? 0,
    }));

    // --- Payment breakdown ---
    const paymentRaw = await db.inStoreOrder.groupBy({
      by: ['paymentMethod'],
      where: dateFilter,
      _count: { id: true },
      _sum: { total: true },
    });

    const paymentBreakdown = paymentRaw.map((p) => ({
      method: p.paymentMethod,
      count: p._count.id,
      revenue: p._sum.total ?? 0,
    }));

    // --- Source breakdown ---
    const sourceRaw = await db.inStoreOrder.groupBy({
      by: ['source'],
      where: dateFilter,
      _count: { id: true },
    });

    const sourceBreakdown = sourceRaw.map((s) => ({
      source: s.source,
      count: s._count.id,
    }));

    return NextResponse.json({
      stats,
      hourlyVolume,
      dailyTrend,
      bestSellers,
      paymentBreakdown,
      sourceBreakdown,
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
