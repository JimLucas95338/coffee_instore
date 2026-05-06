import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const showAll = request.nextUrl.searchParams.get('all') === 'true';

    const items = await db.menuItem.findMany({
      where: showAll ? {} : { isActive: true },
      include: {
        addOns: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        coffee: {
          select: {
            id: true,
            beanInventory: {
              where: { state: 'ROASTED' },
              select: { quantityLbs: true },
            },
          },
        },
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });

    // Add availability flag based on bean inventory
    const itemsWithAvailability = items.map((item) => {
      let available = true;
      if (item.coffee) {
        const roastedStock = item.coffee.beanInventory.reduce(
          (sum, b) => sum + b.quantityLbs,
          0
        );
        available = roastedStock > 0;
      }
      // Strip the nested coffee/inventory data from response
      const { coffee, ...rest } = item;
      return { ...rest, available };
    });

    // Group by category
    const grouped: Record<string, typeof itemsWithAvailability> = {};
    for (const item of itemsWithAvailability) {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    }

    return NextResponse.json({ items: itemsWithAvailability, grouped });
  } catch (error) {
    console.error('Error fetching menu:', error);
    return NextResponse.json({ error: 'Failed to fetch menu' }, { status: 500 });
  }
}
