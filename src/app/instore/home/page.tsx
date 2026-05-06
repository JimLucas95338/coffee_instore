import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions, isAdmin, isManager } from '@/lib/auth';
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
      emoji: '🧾',
      accent: 'from-amber-600 to-amber-700',
    },
    {
      href: '/instore/queue',
      title: 'Queue',
      description: 'Mark drinks as in progress, ready, picked up',
      emoji: '☕',
      accent: 'from-blue-600 to-blue-700',
    },
    {
      href: '/instore/display',
      title: 'Customer Display',
      description: 'Menu board + live order queue',
      emoji: '📺',
      accent: 'from-emerald-600 to-emerald-700',
    },
    {
      href: '/instore/kiosk',
      title: 'Kiosk',
      description: 'Customer self-serve ordering',
      emoji: '🛒',
      accent: 'from-fuchsia-600 to-fuchsia-700',
    },
  ];

  if (admin) {
    tiles.push(
      {
        href: '/admin/menu',
        title: 'Menu Admin',
        description: 'Add, edit, hide menu items and add-ons',
        emoji: '📋',
        accent: 'from-orange-600 to-orange-700',
      },
      {
        href: '/admin/users',
        title: 'Users',
        description: 'Manage staff accounts and roles',
        emoji: '👥',
        accent: 'from-indigo-600 to-indigo-700',
      }
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-neutral-800 bg-neutral-900">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-neutral-500">
              Eco Delight Coffee
            </div>
            <h1 className="text-xl font-bold">Staff Hub</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="text-right">
              <div className="text-neutral-200">{session.user.name || session.user.email}</div>
              <div className="text-xs text-neutral-500">{role}</div>
            </div>
            <HomeLogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiles.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="group block rounded-2xl border border-neutral-800 bg-neutral-900 p-6 hover:border-neutral-700 hover:bg-neutral-800/50 transition-colors"
            >
              <div
                className={`w-12 h-12 rounded-xl mb-4 bg-gradient-to-br ${t.accent} flex items-center justify-center text-2xl`}
              >
                {t.emoji}
              </div>
              <div className="text-lg font-semibold mb-1">{t.title}</div>
              <div className="text-sm text-neutral-400">{t.description}</div>
              <div className="mt-4 text-xs text-neutral-500 group-hover:text-neutral-300">
                Open →
              </div>
            </Link>
          ))}
        </div>

        {!manager && (
          <p className="mt-8 text-sm text-neutral-500">
            POS access requires manager or admin role. Ask an admin to upgrade your account.
          </p>
        )}
      </main>
    </div>
  );
}
