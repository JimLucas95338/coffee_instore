import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions, isAdmin, isManager } from '@/lib/auth';
import { Brand } from '@/components/Brand';
import { getActiveTheme } from '@/lib/theme';
import HomeLogoutButton from './HomeLogoutButton';

export const dynamic = 'force-dynamic';

interface Tile {
  href: string;
  title: string;
  description: string;
  emoji: string;
  accent: string;
}

export default async function InStoreHome() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login?callbackUrl=/instore/home');
  }

  const role = session.user.role;
  const admin = isAdmin(role);
  const manager = isManager(role);
  const theme = await getActiveTheme();
  const e = theme.hub.tileEmoji;

  const tiles: Tile[] = [
    {
      href: '/instore/pos',
      title: 'POS',
      description: 'Take orders at the counter',
      emoji: e.pos,
      accent: 'from-accent-500 to-accent-700',
    },
    {
      href: '/instore/queue',
      title: 'Queue',
      description: 'Mark drinks as in progress, ready, picked up',
      emoji: e.queue,
      accent: 'from-glow-1 to-blue-600',
    },
    {
      href: '/instore/display',
      title: 'Customer Display',
      description: 'Menu board + live order queue',
      emoji: e.display,
      accent: 'from-glow-3 to-glow-2',
    },
    {
      href: '/instore/kiosk',
      title: 'Kiosk',
      description: 'Customer self-serve ordering',
      emoji: e.kiosk,
      accent: 'from-accent-400 to-glow-2',
    },
  ];

  tiles.push({
    href: '/help',
    title: 'Staff Guide',
    description: 'How to run the system, status flow, troubleshooting',
    emoji: e.help,
    accent: 'from-glow-1 to-surface-700',
  });

  if (admin) {
    tiles.push(
      {
        href: '/admin/menu',
        title: 'Menu Admin',
        description: 'Add, edit, hide menu items and add-ons',
        emoji: e.menuAdmin,
        accent: 'from-accent-600 to-accent-700',
      },
      {
        href: '/admin/users',
        title: 'Users',
        description: 'Manage staff accounts and roles',
        emoji: e.users,
        accent: 'from-glow-3 to-surface-700',
      }
    );
  }

  return (
    <div className="min-h-screen bg-surface-950 text-ink relative overflow-hidden">
      <div className="absolute inset-0 starfield opacity-50 pointer-events-none" />
      <header className="relative border-b border-surface-700 bg-surface-900/70 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Brand size="md" withTagline spin />
          <div className="flex items-center gap-3 text-sm">
            <div className="text-right">
              <div className="text-ink">{session.user.name || session.user.email}</div>
              <div className="text-xs text-ink-dark/60 font-mono uppercase tracking-wider">
                {role}
              </div>
            </div>
            <HomeLogoutButton />
          </div>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight">{theme.hub.title}</h1>
          <p className="text-ink-dark/60 mt-1">{theme.hub.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiles.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="group relative block rounded-2xl border border-surface-700 bg-surface-900/60 backdrop-blur p-6 hover:border-accent-500/60 hover:bg-surface-800/70 transition-all hover:-translate-y-0.5"
            >
              <div
                className={`w-12 h-12 rounded-xl mb-4 bg-gradient-to-br ${t.accent} flex items-center justify-center text-2xl shadow-lg`}
              >
                {t.emoji}
              </div>
              <div className="font-display text-lg font-semibold mb-1 text-ink">
                {t.title}
              </div>
              <div className="text-sm text-ink-dark/60">{t.description}</div>
              <div className="mt-4 text-xs text-ink-dark/40 group-hover:text-accent-400 transition-colors font-mono uppercase tracking-wider">
                {theme.hub.engageLabel}
              </div>
            </Link>
          ))}
        </div>

        {!manager && (
          <p className="mt-8 text-sm text-ink-dark/50">
            POS access requires manager or admin role. Ask an admin to upgrade your access.
          </p>
        )}
      </main>
    </div>
  );
}
