import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { authOptions, isAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

const ROLES = ['ADMIN', 'MANAGER', 'SALES_REP', 'ROASTER', 'PACKAGER'] as const;

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(ROLES).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = patchSchema.parse(body);

    const target = await db.user.findUnique({ where: { id: params.id } });
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (target.id === session.user.id) {
      if (data.role && data.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'You cannot demote yourself' },
          { status: 400 }
        );
      }
      if (data.isActive === false) {
        return NextResponse.json(
          { error: 'You cannot deactivate yourself' },
          { status: 400 }
        );
      }
    }

    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.role !== undefined) update.role = data.role;
    if (data.isActive !== undefined) update.isActive = data.isActive;
    if (data.password) update.passwordHash = await bcrypt.hash(data.password, 12);

    const user = await db.user.update({
      where: { id: params.id },
      data: update,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (params.id === session.user.id) {
    return NextResponse.json(
      { error: 'You cannot deactivate yourself' },
      { status: 400 }
    );
  }

  await db.user.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
