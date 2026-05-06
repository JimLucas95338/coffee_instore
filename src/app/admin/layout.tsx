import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions, isAdmin } from '@/lib/auth';
import { Brand } from '@/components/Brand';
import LogoutButton from './_components/LogoutButton';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login?callbackUrl=/admin/users');
  }
  if (!isAdmin(session.user.role)) {
    redirect('/instore/kiosk');
  }

  return (
    <div className="min-h-screen bg-space-950 text-cream relative overflow-hidden">
      <div className="absolute inset-0 starfield opacity-30 pointer-events-none" />
      <header className="relative border-b border-space-700 bg-space-900/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/instore/home">
              <Brand size="sm" />
            </Link>
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-saturn-400">
              Admin
            </span>
            <nav className="flex gap-5 text-sm">
              <Link href="/admin/menu" className="text-cream-dark/80 hover:text-saturn-400 transition-colors">
                Menu
              </Link>
              <Link href="/admin/users" className="text-cream-dark/80 hover:text-saturn-400 transition-colors">
                Users
              </Link>
              <Link href="/instore/home" className="text-cream-dark/80 hover:text-saturn-400 transition-colors">
                Hub
              </Link>
              <Link href="/instore/pos" className="text-cream-dark/80 hover:text-saturn-400 transition-colors">
                POS
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-cream-dark/60">{session.user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="relative max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
