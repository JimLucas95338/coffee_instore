'use client';

import { signOut } from 'next-auth/react';

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="px-3 py-1.5 rounded-lg bg-space-800 hover:bg-space-700 border border-space-700 text-cream"
    >
      Sign out
    </button>
  );
}
