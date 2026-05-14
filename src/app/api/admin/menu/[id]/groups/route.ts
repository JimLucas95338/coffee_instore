import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions, isManager } from '@/lib/auth';
import { db } from '@/lib/db';

const attachSchema = z.object({
  groupId: z.string().min(1),
  sortOrder: z.number().int().default(0),
});

/** Attach or update an attached modifier group on a menu item. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || !isManager(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  try {
    const body = await request.json();
    const { groupId, sortOrder } = attachSchema.parse(body);
    const link = await db.menuItemModifierGroup.upsert({
      where: { menuItemId_groupId: { menuItemId: id, groupId } },
      update: { sortOrder },
      create: { menuItemId: id, groupId, sortOrder },
    });
    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('Error attaching modifier group:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

/** Detach a modifier group from a menu item. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || !isManager(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  try {
    const { groupId } = await request.json();
    if (!groupId) return NextResponse.json({ error: 'groupId required' }, { status: 400 });
    await db.menuItemModifierGroup.delete({
      where: { menuItemId_groupId: { menuItemId: id, groupId } },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error detaching modifier group:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
