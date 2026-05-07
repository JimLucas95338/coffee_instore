'use client';

import { signOut } from 'next-auth/react';

export default function HomeLogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 border border-surface-700 text-ink text-sm"
    >
      Sign out
    </button>
  );
}
