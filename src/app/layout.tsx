import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { getActiveTheme, renderThemeStyle } from '@/lib/theme';

const display = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
});

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export async function generateMetadata(): Promise<Metadata> {
  const theme = await getActiveTheme();
  return {
    title: `${theme.brand.fullName} — In Store`,
    description: `In-store ordering for ${theme.brand.fullName}: kiosk, POS, customer display, and queue.`,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = await getActiveTheme();
  return (
    <html
      lang="en"
      data-theme={theme.id}
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: renderThemeStyle(theme) }} />
      </head>
      <body className="font-sans">
        <Providers theme={theme}>{children}</Providers>
      </body>
    </html>
  );
}
