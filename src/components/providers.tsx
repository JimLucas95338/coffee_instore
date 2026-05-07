'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from './ThemeContext';
import type { Theme } from '@/themes';

export function Providers({
  children,
  theme,
}: {
  children: React.ReactNode;
  theme: Theme;
}) {
  return (
    <SessionProvider>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </SessionProvider>
  );
}
