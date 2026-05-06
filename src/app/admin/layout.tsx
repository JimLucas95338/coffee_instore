import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions, isAdmin } from '@/lib/auth';
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
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-neutral-800 bg-neutral-900">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-bold text-lg">Eco Delight Admin</span>
            <nav className="flex gap-4 text-sm">
              <Link href="/admin/users" className="text-neutral-300 hover:text-white">
                Users
              </Link>
              <Link href="/instore/pos" className="text-neutral-300 hover:text-white">
                POS
              </Link>
              <Link href="/instore/kiosk" className="text-neutral-300 hover:text-white">
                Kiosk
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-neutral-400">
              {session.user.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
