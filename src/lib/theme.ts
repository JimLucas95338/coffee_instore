import 'server-only';
import { db } from './db';
import { getTheme, DEFAULT_THEME_ID, type Theme } from '@/themes';

/**
 * Read the active theme id from the singleton AppSetting row, creating it on
 * first call. Falls back to DEFAULT_THEME_ID if the DB is unreachable so the
 * app can still render before Postgres comes up.
 */
export async function getActiveTheme(): Promise<Theme> {
  try {
    const setting = await db.appSetting.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton', themeId: DEFAULT_THEME_ID },
    });
    return getTheme(setting.themeId);
  } catch {
    return getTheme(DEFAULT_THEME_ID);
  }
}

export async function setActiveTheme(themeId: string): Promise<Theme> {
  const next = getTheme(themeId);
  await db.appSetting.upsert({
    where: { id: 'singleton' },
    update: { themeId: next.id },
    create: { id: 'singleton', themeId: next.id },
  });
  return next;
}

/**
 * Render the theme's palette as CSS custom properties on `:root`. Inserted as
 * an inline <style> in the root layout so the active theme paints on first
 * paint without a flash.
 */
export function renderThemeStyle(theme: Theme): string {
  const p = theme.palette;
  return `:root{--color-surface-950:${p.surface[950]};--color-surface-900:${p.surface[900]};--color-surface-800:${p.surface[800]};--color-surface-700:${p.surface[700]};--color-surface-600:${p.surface[600]};--color-accent-300:${p.accent[300]};--color-accent-400:${p.accent[400]};--color-accent-500:${p.accent[500]};--color-accent-600:${p.accent[600]};--color-accent-700:${p.accent[700]};--color-ink:${p.ink.DEFAULT};--color-ink-dark:${p.ink.dark};--color-glow-1:${p.glow[1]};--color-glow-2:${p.glow[2]};--color-glow-3:${p.glow[3]};}`;
}
