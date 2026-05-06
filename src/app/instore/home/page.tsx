import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions, isAdmin, isManager } from '@/lib/auth';
import { Brand } from '@/components/Brand';
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

  const tiles: Tile[] = [
    {
      href: '/instore/pos',
      title: 'POS',
      description: 'Take orders at the counter',
      emoji: '🛰️',
      accent: 'from-saturn-500 to-saturn-700',
    },
    {
      href: '/instore/queue',
      title: 'Queue',
      description: 'Mark drinks as in progress, ready, picked up',
      emoji: '☄️',
      accent: 'from-nebula-cyan to-blue-600',
    },
    {
      href: '/instore/display',
      title: 'Customer Display',
      description: 'Menu board + live order queue',
      emoji: '🪐',
      accent: 'from-nebula-violet to-nebula-magenta',
    },
    {
      href: '/instore/kiosk',
      title: 'Kiosk',
      description: 'Customer self-serve ordering',
      emoji: '🚀',
      accent: 'from-saturn-400 to-nebula-magenta',
    },
  ];

  tiles.push({
    href: '/help',
    title: 'Staff Guide',
    description: 'How to run the system, status flow, troubleshooting',
    emoji: '📖',
    accent: 'from-nebula-cyan to-space-700',
  });

  if (admin) {
    tiles.push(
      {
        href: '/admin/menu',
        title: 'Menu Admin',
        description: 'Add, edit, hide menu items and add-ons',
        emoji: '🛸',
        accent: 'from-saturn-600 to-saturn-800',
      },
      {
        href: '/admin/users',
        title: 'Users',
        description: 'Manage staff accounts and roles',
        emoji: '👨‍🚀',
        accent: 'from-nebula-violet to-space-700',
      }
    );
  }

  return (
    <div className="min-h-screen bg-space-950 text-cream relative overflow-hidden">
      <div className="absolute inset-0 starfield opacity-50 pointer-events-none" />
      <header className="relative border-b border-space-700 bg-space-900/70 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Brand size="md" withTagline spin />
          <div className="flex items-center gap-3 text-sm">
            <div className="text-right">
              <div className="text-cream">{session.user.name || session.user.email}</div>
              <div className="text-xs text-cream-dark/60 font-mono uppercase tracking-wider">
                {role}
              </div>
            </div>
            <HomeLogoutButton />
          </div>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight">Mission Control</h1>
          <p className="text-cream-dark/60 mt-1">
            Pick a station to begin your shift.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiles.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="group relative block rounded-2xl border border-space-700 bg-space-900/60 backdrop-blur p-6 hover:border-saturn-500/60 hover:bg-space-800/70 transition-all hover:-translate-y-0.5"
            >
              <div
                className={`w-12 h-12 rounded-xl mb-4 bg-gradient-to-br ${t.accent} flex items-center justify-center text-2xl shadow-lg`}
              >
                {t.emoji}
              </div>
              <div className="font-display text-lg font-semibold mb-1 text-cream">
                {t.title}
              </div>
              <div className="text-sm text-cream-dark/60">{t.description}</div>
              <div className="mt-4 text-xs text-cream-dark/40 group-hover:text-saturn-400 transition-colors font-mono uppercase tracking-wider">
                Engage →
              </div>
            </Link>
          ))}
        </div>

        {!manager && (
          <p className="mt-8 text-sm text-cream-dark/50">
            POS access requires manager or admin role. Ask an admin to upgrade your clearance.
          </p>
        )}
      </main>
    </div>
  );
}
