'use client';

import { createContext, useContext } from 'react';
import type { Theme } from '@/themes';

/**
 * Public theme context — components that need brand text or status labels read
 * from this. The provider is in the root layout (server component) and seeds
 * the value from getActiveTheme().
 */
const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({
  theme,
  children,
}: {
  theme: Theme;
  children: React.ReactNode;
}) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const t = useContext(ThemeContext);
  if (!t) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return t;
}
