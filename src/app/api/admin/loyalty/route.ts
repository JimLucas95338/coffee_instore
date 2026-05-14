import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isManager } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * Manager+ list/search of loyalty members. Optional `q` query string
 * filters by phone substring or name (case-insensitive).
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isManager(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';

  const where = q
    ? {
        OR: [
          { phone: { contains: q.replace(/\D/g, '') || q } },
          { name: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const members = await db.loyaltyMember.findMany({
    where,
    orderBy: [{ points: 'desc' }, { totalSpent: 'desc' }],
    take: 50,
  });

  return NextResponse.json({ members });
}
