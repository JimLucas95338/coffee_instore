import thirdSpace from './3rd-space';
import ecoDelight from './eco-delight';
import type { Theme, ThemeId } from './types';

export const THEMES: Record<ThemeId, Theme> = {
  '3rd-space': thirdSpace,
  'eco-delight': ecoDelight,
};

export const DEFAULT_THEME_ID: ThemeId = '3rd-space';

export function getTheme(id: string | null | undefined): Theme {
  if (id && id in THEMES) return THEMES[id as ThemeId];
  return THEMES[DEFAULT_THEME_ID];
}

export function listThemes(): Theme[] {
  return Object.values(THEMES);
}

export type { Theme, ThemeId } from './types';
