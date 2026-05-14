import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

const PAGE_SIZE = 100;

/** Admin-only paginated audit log feed. Supports an optional action filter. */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action')?.trim() || undefined;
  const q = searchParams.get('q')?.trim() || undefined;
  const before = searchParams.get('before');
  const beforeDate = before ? new Date(before) : undefined;

  const where: Record<string, unknown> = {};
  if (action) where.action = action;
  if (q) {
    where.OR = [
      { actorEmail: { contains: q, mode: 'insensitive' } },
      { metadata: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (beforeDate && !Number.isNaN(beforeDate.getTime())) {
    where.createdAt = { lt: beforeDate };
  }

  const logs = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: PAGE_SIZE,
  });

  return NextResponse.json({
    logs: logs.map((l) => ({
      ...l,
      metadata: l.metadata ? safeParse(l.metadata) : null,
    })),
    nextBefore: logs.length === PAGE_SIZE ? logs[logs.length - 1].createdAt : null,
  });
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
