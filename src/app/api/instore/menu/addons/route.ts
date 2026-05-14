import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions, isManager } from '@/lib/auth';
import { db } from '@/lib/db';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().min(0),
  category: z.string().min(1).max(50),
  sortOrder: z.number().int().default(0),
});

const patchSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  price: z.number().min(0).optional(),
  category: z.string().min(1).max(50).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

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

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isManager(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = createSchema.parse(body);
    const addOn = await db.menuAddOn.create({
      data: {
        name: data.name.trim(),
        price: data.price,
        category: data.category.toUpperCase().trim(),
        sortOrder: data.sortOrder,
      },
    });
    return NextResponse.json(addOn, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('Error creating add-on:', error);
    return NextResponse.json({ error: 'Failed to create add-on' }, { status: 500 });
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

    const updated = await db.menuAddOn.update({
      where: { id },
      data: rest,
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('Error updating add-on:', error);
    return NextResponse.json({ error: 'Failed to update add-on' }, { status: 500 });
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
    await db.menuAddOn.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('Foreign key') || msg.includes('foreign key')) {
      return NextResponse.json(
        { error: 'Add-on is referenced by existing orders. Hide it instead.' },
        { status: 409 },
      );
    }
    console.error('Error deleting add-on:', error);
    return NextResponse.json({ error: 'Failed to delete add-on' }, { status: 500 });
  }
}
