import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { calculateTax } from '@/lib/instore/tax';
import { generateOrderNumber, getNextDisplayNumber } from '@/lib/instore/order-number';

const orderItemSchema = z.object({
  menuItemId: z.string(),
  quantity: z.number().min(1).default(1),
  size: z.enum(['SMALL', 'MEDIUM', 'LARGE']).nullable().optional(),
  milkType: z.enum(['WHOLE', 'TWO_PERCENT', 'OAT', 'ALMOND', 'SOY', 'COCONUT', 'NONE']).nullable().optional(),
  temperature: z.enum(['HOT', 'ICED']).nullable().optional(),
  addOns: z.array(z.object({
    addOnId: z.string(),
    name: z.string(),
    price: z.number(),
  })).default([]),
  notes: z.string().optional(),
  packageId: z.string().nullable().optional(),
});

const createOrderSchema = z.object({
  customerName: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
  paymentMethod: z.enum(['CARD', 'APPLE_PAY', 'CASH']),
  source: z.enum(['KIOSK', 'POS']).default('KIOSK'),
  employeeId: z.string().optional(),
  loyaltyPhone: z.string().optional(),
  redeemPoints: z.boolean().optional(),
});

// GET: List today's orders, filterable by status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: Record<string, unknown> = { createdAt: { gte: today } };
    if (statusFilter) {
      where.status = { in: statusFilter.split(',') };
    }

    const orders = await db.inStoreOrder.findMany({
      where,
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

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching in-store orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

// POST: Create a new in-store order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createOrderSchema.parse(body);

    // Fetch menu items to compute prices server-side
    const menuItemIds = data.items.map((i) => i.menuItemId);
    const menuItems = await db.menuItem.findMany({
      where: { id: { in: menuItemIds }, isActive: true },
    });

    if (menuItems.length !== new Set(menuItemIds).size) {
      return NextResponse.json({ error: 'One or more menu items are unavailable' }, { status: 400 });
    }

    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    // Compute line items
    const orderItems = data.items.map((item) => {
      const menuItem = menuItemMap.get(item.menuItemId)!;

      // Determine price based on size
      let basePrice = menuItem.basePrice;
      if (item.size === 'MEDIUM' && menuItem.mediumPrice) {
        basePrice = menuItem.mediumPrice;
      } else if (item.size === 'LARGE' && menuItem.largePrice) {
        basePrice = menuItem.largePrice;
      }

      // Add add-on prices
      const addOnTotal = item.addOns.reduce((sum, a) => sum + a.price, 0);
      const unitPrice = Math.round((basePrice + addOnTotal) * 100) / 100;
      const totalPrice = Math.round(unitPrice * item.quantity * 100) / 100;

      return {
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        size: item.size || null,
        milkType: item.milkType || null,
        temperature: item.temperature || null,
        addOns: item.addOns.length > 0 ? JSON.stringify(item.addOns) : null,
        notes: item.notes || null,
        packageId: item.packageId || null,
      };
    });

    const subtotal = orderItems.reduce((sum, i) => sum + i.totalPrice, 0);

    // Handle loyalty redemption
    let loyaltyDiscount = 0;
    let loyaltyPointsRedeemed = 0;
    let loyaltyMember = null;
    const normalizedPhone = data.loyaltyPhone?.replace(/\D/g, '');

    if (normalizedPhone) {
      loyaltyMember = await db.loyaltyMember.findUnique({
        where: { phone: normalizedPhone },
      });
      if (!loyaltyMember) {
        loyaltyMember = await db.loyaltyMember.create({
          data: { phone: normalizedPhone, name: data.customerName || null },
        });
      }
      if (data.redeemPoints && loyaltyMember.points >= 100) {
        const redeemSets = Math.floor(loyaltyMember.points / 100);
        const maxDiscount = redeemSets * 5; // $5 per 100 points
        loyaltyDiscount = Math.min(maxDiscount, subtotal);
        loyaltyPointsRedeemed = Math.ceil(loyaltyDiscount / 5) * 100;
      }
    }

    const discountedSubtotal = Math.round((subtotal - loyaltyDiscount) * 100) / 100;
    const tax = calculateTax(discountedSubtotal);
    const total = Math.round((discountedSubtotal + tax) * 100) / 100;

    // Points earned: 1 per dollar spent (on the discounted amount)
    const loyaltyPointsEarned = Math.floor(discountedSubtotal);

    // Generate order number and display number atomically
    const orderNumber = generateOrderNumber();
    const displayNumber = await getNextDisplayNumber();

    const order = await db.inStoreOrder.create({
      data: {
        orderNumber,
        displayNumber,
        customerName: data.customerName || null,
        subtotal,
        tax,
        total,
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentMethod === 'CASH' ? 'PENDING' : 'PENDING',
        source: data.source,
        employeeId: data.employeeId || null,
        loyaltyPhone: normalizedPhone || null,
        loyaltyPointsEarned: normalizedPhone ? loyaltyPointsEarned : null,
        loyaltyPointsRedeemed: loyaltyPointsRedeemed > 0 ? loyaltyPointsRedeemed : null,
        loyaltyDiscount: loyaltyDiscount > 0 ? loyaltyDiscount : null,
        items: { create: orderItems },
      },
      include: {
        items: {
          include: {
            menuItem: { select: { name: true, category: true } },
          },
        },
      },
    });

    // Record loyalty transactions
    if (loyaltyMember && normalizedPhone) {
      const txns = [];
      if (loyaltyPointsRedeemed > 0) {
        txns.push(
          db.loyaltyTransaction.create({
            data: {
              memberId: loyaltyMember.id,
              orderId: order.id,
              points: -loyaltyPointsRedeemed,
              type: 'REDEEM',
              description: `Redeemed ${loyaltyPointsRedeemed} pts for $${loyaltyDiscount.toFixed(2)} off order #${displayNumber}`,
            },
          })
        );
      }
      if (loyaltyPointsEarned > 0) {
        txns.push(
          db.loyaltyTransaction.create({
            data: {
              memberId: loyaltyMember.id,
              orderId: order.id,
              points: loyaltyPointsEarned,
              type: 'EARN',
              description: `Earned ${loyaltyPointsEarned} pts on order #${displayNumber}`,
            },
          })
        );
      }
      const netPoints = loyaltyPointsEarned - loyaltyPointsRedeemed;
      txns.push(
        db.loyaltyMember.update({
          where: { id: loyaltyMember.id },
          data: {
            points: { increment: netPoints },
            totalSpent: { increment: total },
            name: data.customerName || undefined,
          },
        })
      );
      await Promise.all(txns);
    }

    return NextResponse.json({
      ...order,
      loyaltyPointsEarned: normalizedPhone ? loyaltyPointsEarned : undefined,
      loyaltyPointsRedeemed: loyaltyPointsRedeemed > 0 ? loyaltyPointsRedeemed : undefined,
      loyaltyDiscount: loyaltyDiscount > 0 ? loyaltyDiscount : undefined,
      loyaltyBalance: loyaltyMember ? loyaltyMember.points + loyaltyPointsEarned - loyaltyPointsRedeemed : undefined,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('Error creating in-store order:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
