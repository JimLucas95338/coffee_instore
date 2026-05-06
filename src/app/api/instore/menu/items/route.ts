import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isManager } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isManager(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, category, basePrice, mediumPrice, largePrice, allowSizes, allowMilk, allowTemp, sortOrder } = body;

    if (!name || !category || basePrice == null) {
      return NextResponse.json({ error: 'Name, category, and base price are required' }, { status: 400 });
    }

    const item = await db.menuItem.create({
      data: {
        name,
        description: description || null,
        category,
        basePrice: parseFloat(basePrice),
        mediumPrice: mediumPrice != null ? parseFloat(mediumPrice) : null,
        largePrice: largePrice != null ? parseFloat(largePrice) : null,
        allowSizes: allowSizes ?? true,
        allowMilk: allowMilk ?? true,
        allowTemp: allowTemp ?? true,
        sortOrder: sortOrder ?? 0,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Error creating menu item:', error);
    return NextResponse.json({ error: 'Failed to create menu item' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isManager(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    }

    await db.menuItem.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting menu item:', error);
    // Foreign key constraint — item has existing orders
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Foreign key constraint') || message.includes('foreign key')) {
      return NextResponse.json(
        { error: 'This item has existing orders and cannot be deleted. Deactivate it instead.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Failed to delete menu item' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isManager(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    }

    const updated = await db.menuItem.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating menu item:', error);
    return NextResponse.json({ error: 'Failed to update menu item' }, { status: 500 });
  }
}
