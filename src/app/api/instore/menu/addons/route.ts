import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isManager } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isManager(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const addOns = await db.menuAddOn.findMany({
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
  });
  return NextResponse.json({ addOns });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isManager(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id, isActive } = await request.json();
    if (!id || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'id and isActive (boolean) are required' },
        { status: 400 }
      );
    }

    const updated = await db.menuAddOn.update({
      where: { id },
      data: { isActive },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating add-on:', error);
    return NextResponse.json({ error: 'Failed to update add-on' }, { status: 500 });
  }
}
