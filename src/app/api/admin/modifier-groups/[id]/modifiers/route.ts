import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions, isManager } from '@/lib/auth';
import { db } from '@/lib/db';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  priceDelta: z.number().default(0),
  sortOrder: z.number().int().default(0),
});

const patchSchema = z.object({
  modifierId: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  priceDelta: z.number().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

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
    const data = createSchema.parse(body);
    const modifier = await db.modifier.create({
      data: { ...data, groupId: id },
    });
    return NextResponse.json(modifier, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('Error creating modifier:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(
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
    const { modifierId, ...rest } = patchSchema.parse(body);
    const updated = await db.modifier.update({
      where: { id: modifierId, groupId: id },
      data: rest,
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('Error updating modifier:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

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
    const { modifierId } = await request.json();
    if (!modifierId) {
      return NextResponse.json({ error: 'modifierId required' }, { status: 400 });
    }
    await db.modifier.delete({ where: { id: modifierId, groupId: id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting modifier:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
