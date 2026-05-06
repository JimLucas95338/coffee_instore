import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Fetch active coffees with active packages
    const coffees = await db.coffee.findMany({
      where: { isActive: true },
      include: {
        packages: {
          where: { isActive: true },
          orderBy: [{ type: 'asc' }, { sizeOz: 'asc' }],
          select: {
            id: true,
            name: true,
            type: true,
            sizeOz: true,
            sizeDescription: true,
            price: true,
            grindType: true,
          },
        },
        menuItems: {
          where: { category: 'RETAIL' },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    // Filter to coffees that have at least one active package
    const coffeesWithPackages = coffees.filter((c) => c.packages.length > 0);

    // Ensure each coffee has a RETAIL MenuItem (auto-create if missing)
    const result = await Promise.all(
      coffeesWithPackages.map(async (coffee) => {
        let menuItemId = coffee.menuItems[0]?.id;

        if (!menuItemId) {
          // Auto-create a RETAIL MenuItem for this coffee
          const lowestPrice = Math.min(...coffee.packages.map((p) => p.price));
          const menuItem = await db.menuItem.create({
            data: {
              name: coffee.name,
              description: coffee.description,
              category: 'RETAIL',
              basePrice: lowestPrice,
              allowSizes: false,
              allowMilk: false,
              allowTemp: false,
              coffeeId: coffee.id,
              imageUrl: coffee.imageUrl,
            },
          });
          menuItemId = menuItem.id;
        }

        return {
          id: coffee.id,
          name: coffee.name,
          description: coffee.description,
          origin: coffee.origin,
          roastLevel: coffee.roastLevel,
          imageUrl: coffee.imageUrl,
          menuItemId,
          packages: coffee.packages,
        };
      })
    );

    return NextResponse.json({ coffees: result });
  } catch (error) {
    console.error('Error fetching retail coffees:', error);
    return NextResponse.json({ error: 'Failed to fetch retail coffees' }, { status: 500 });
  }
}
