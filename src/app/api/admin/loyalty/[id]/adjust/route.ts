import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions, isManager } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';

const adjustSchema = z.object({
  /** Positive = grant, negative = revoke. */
  delta: z.number().int().refine((n) => n !== 0, 'delta must be non-zero'),
  reason: z.string().min(1).max(200),
});

/**
 * Manual points adjustment by a manager/admin. Creates a corresponding
 * LoyaltyTransaction row and updates the member balance atomically.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isManager(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { delta, reason } = adjustSchema.parse(body);

    const member = await db.loyaltyMember.findUnique({ where: { id } });
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const newBalance = member.points + delta;
    if (newBalance < 0) {
      return NextResponse.json(
        { error: 'Adjustment would put balance below zero' },
        { status: 400 }
      );
    }

    const [updated] = await db.$transaction([
      db.loyaltyMember.update({
        where: { id },
        data: { points: newBalance },
      }),
      db.loyaltyTransaction.create({
        data: {
          memberId: id,
          points: delta,
          type: 'ADJUST',
          description: `${delta > 0 ? 'Granted' : 'Revoked'} ${Math.abs(delta)} pts by ${session.user.email}: ${reason}`,
        },
      }),
    ]);

    await audit({
      action: 'LOYALTY_ADJUSTED',
      actorId: session.user.id,
      actorEmail: session.user.email,
      targetType: 'LoyaltyMember',
      targetId: id,
      metadata: { delta, reason, previousPoints: member.points, newPoints: newBalance },
    });

    return NextResponse.json({ member: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('Error adjusting loyalty points:', error);
    return NextResponse.json({ error: 'Failed to adjust points' }, { status: 500 });
  }
}
