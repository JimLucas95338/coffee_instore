import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const lookupSchema = z.object({
  phone: z.string().min(10).max(15),
});

const createSchema = z.object({
  phone: z.string().min(10).max(15),
  name: z.string().optional(),
});

// POST: Look up or create a loyalty member by phone
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, name } = createSchema.parse(body);

    // Normalize phone: strip non-digits
    const normalizedPhone = phone.replace(/\D/g, '');

    const member = await db.loyaltyMember.upsert({
      where: { phone: normalizedPhone },
      update: name ? { name } : {},
      create: {
        phone: normalizedPhone,
        name: name || null,
      },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    return NextResponse.json({
      id: member.id,
      phone: member.phone,
      name: member.name,
      points: member.points,
      totalSpent: member.totalSpent,
      canRedeem: member.points >= 100,
      redeemValue: Math.floor(member.points / 100) * 5, // $5 per 100 points
      recentTransactions: member.transactions,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('Error looking up loyalty member:', error);
    return NextResponse.json({ error: 'Failed to look up member' }, { status: 500 });
  }
}
