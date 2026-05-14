import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions, isManager } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  required: z.boolean().default(false),
  minSelections: z.number().int().min(0).default(0),
  maxSelections: z.number().int().min(1).default(1),
  sortOrder: z.number().int().default(0),
});

const patchSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  required: z.boolean().optional(),
  minSelections: z.number().int().min(0).optional(),
  maxSelections: z.number().int().min(1).optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isManager(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const groups = await db.modifierGroup.findMany({
    include: {
      modifiers: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
      menuItems: {
        select: { menuItemId: true, menuItem: { select: { name: true } } },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  return NextResponse.json({ groups });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isManager(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const data = createSchema.parse(body);
    if (data.minSelections > data.maxSelections) {
      return NextResponse.json(
        { error: 'minSelections cannot exceed maxSelections' },
        { status: 400 },
      );
    }
    const group = await db.modifierGroup.create({ data });
    await audit({
      action: 'MODIFIER_GROUP_CREATED',
      actorId: session.user.id,
      actorEmail: session.user.email,
      targetType: 'ModifierGroup',
      targetId: group.id,
      metadata: { name: group.name, required: group.required },
    });
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('Error creating modifier group:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isManager(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { id, ...rest } = patchSchema.parse(body);
    const updated = await db.modifierGroup.update({ where: { id }, data: rest });
    await audit({
      action: 'MODIFIER_GROUP_UPDATED',
      actorId: session.user.id,
      actorEmail: session.user.email,
      targetType: 'ModifierGroup',
      targetId: id,
      metadata: { changes: rest },
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('Error updating modifier group:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isManager(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    await db.modifierGroup.delete({ where: { id } });
    await audit({
      action: 'MODIFIER_GROUP_DELETED',
      actorId: session.user.id,
      actorEmail: session.user.email,
      targetType: 'ModifierGroup',
      targetId: id,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting modifier group:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
