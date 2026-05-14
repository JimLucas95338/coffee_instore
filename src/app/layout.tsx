import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { getActiveTheme, renderThemeStyle } from '@/lib/theme';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

// Theme is read from the DB on every request — never prerender the layout
// statically, otherwise switching themes wouldn't take effect until a redeploy.
export const dynamic = 'force-dynamic';

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
  themeColor: '#0a0e27',
};

export async function generateMetadata(): Promise<Metadata> {
  const theme = await getActiveTheme();
  return {
    title: `${theme.brand.fullName} — In Store`,
    description: `In-store ordering for ${theme.brand.fullName}: kiosk, POS, customer display, and queue.`,
    manifest: '/manifest.webmanifest',
    applicationName: theme.brand.fullName,
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: theme.brand.fullName,
    },
    icons: {
      icon: [
        { url: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
        { url: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
      ],
      apple: '/icon-512.svg',
    },
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
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
