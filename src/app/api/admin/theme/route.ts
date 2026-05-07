import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions, isAdmin } from '@/lib/auth';
import { THEMES, getTheme } from '@/themes';
import { setActiveTheme } from '@/lib/theme';
import { db } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const setting = await db.appSetting.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton' },
  });

  return NextResponse.json({
    activeThemeId: setting.themeId,
    themes: Object.values(THEMES).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      brand: {
        wordmark: t.brand.wordmark,
        tagline: t.brand.tagline,
        markGlyph: t.brand.markGlyph,
      },
      // Send palette so the UI can render swatches without importing the
      // server-only theme bundle.
      palette: t.palette,
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { themeId } = await request.json();
    if (!themeId || typeof themeId !== 'string') {
      return NextResponse.json({ error: 'themeId is required' }, { status: 400 });
    }
    const next = getTheme(themeId);
    if (next.id !== themeId) {
      return NextResponse.json({ error: 'Unknown themeId' }, { status: 400 });
    }
    await setActiveTheme(themeId);
    // Bust any cached layouts so the next request paints the new theme.
    revalidatePath('/', 'layout');
    return NextResponse.json({ success: true, activeThemeId: next.id });
  } catch (error) {
    console.error('Error updating theme:', error);
    return NextResponse.json({ error: 'Failed to update theme' }, { status: 500 });
  }
}
