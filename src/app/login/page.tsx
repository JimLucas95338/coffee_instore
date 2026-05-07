'use client';

import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Brand } from '@/components/Brand';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/instore/pos';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setSubmitting(false);

    if (res?.error) {
      setError(res.error);
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 p-6 relative overflow-hidden">
      <div className="absolute inset-0 starfield opacity-60 pointer-events-none" />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm bg-surface-900/80 backdrop-blur rounded-2xl p-8 border border-surface-700 shadow-[0_0_60px_rgba(255,107,53,0.15)]"
      >
        <div className="flex flex-col items-center mb-6">
          <Brand size="lg" align="center" withTagline />
          <p className="mt-4 text-ink-dark/70 text-sm font-mono uppercase tracking-widest">
            Manager sign in
          </p>
        </div>

        <label className="block text-sm text-ink-dark mb-1">Email</label>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-lg bg-surface-800 border border-surface-600 text-ink outline-none focus:border-accent-500"
        />

        <label className="block text-sm text-ink-dark mb-1">Password</label>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-lg bg-surface-800 border border-surface-600 text-ink outline-none focus:border-accent-500"
        />

        {error && (
          <div className="mb-4 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-lg bg-accent-500 hover:bg-accent-400 text-surface-950 font-bold disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Engaging…' : 'Launch'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-950" />}>
      <LoginForm />
    </Suspense>
  );
}
