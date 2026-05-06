import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await db.inStoreOrder.findMany({
      where: { createdAt: { gte: today } },
      select: {
        total: true,
        subtotal: true,
        tax: true,
        paymentMethod: true,
        paymentStatus: true,
        status: true,
        source: true,
        items: { select: { quantity: true } },
      },
    });

    const totalOrders = orders.length;
    const completedOrders = orders.filter(
      (o) => o.status === 'PICKED_UP'
    ).length;
    const cancelledOrders = orders.filter(
      (o) => o.status === 'CANCELLED'
    ).length;
    const activeOrders = orders.filter(
      (o) => !['PICKED_UP', 'CANCELLED'].includes(o.status)
    ).length;

    const paidOrders = orders.filter((o) => o.paymentStatus === 'PAID');

    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
    const totalTax = paidOrders.reduce((sum, o) => sum + o.tax, 0);
    const totalSubtotal = paidOrders.reduce((sum, o) => sum + o.subtotal, 0);

    const cashOrders = paidOrders.filter((o) => o.paymentMethod === 'CASH');
    const cardOrders = paidOrders.filter(
      (o) => o.paymentMethod === 'CARD' || o.paymentMethod === 'APPLE_PAY'
    );

    const cashRevenue = cashOrders.reduce((sum, o) => sum + o.total, 0);
    const cardRevenue = cardOrders.reduce((sum, o) => sum + o.total, 0);

    const kioskOrders = orders.filter((o) => o.source === 'KIOSK').length;
    const posOrders = orders.filter((o) => o.source === 'POS').length;

    const totalItems = orders.reduce(
      (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
      0
    );

    const avgOrderValue = paidOrders.length > 0
      ? totalRevenue / paidOrders.length
      : 0;

    return NextResponse.json({
      totalOrders,
      completedOrders,
      cancelledOrders,
      activeOrders,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalSubtotal: Math.round(totalSubtotal * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      cashCount: cashOrders.length,
      cashRevenue: Math.round(cashRevenue * 100) / 100,
      cardCount: cardOrders.length,
      cardRevenue: Math.round(cardRevenue * 100) / 100,
      kioskOrders,
      posOrders,
      totalItems,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
    });
  } catch (error) {
    console.error('Error fetching daily summary:', error);
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 });
  }
}
