'use client';

import { useCallback, useEffect, useState } from 'react';

interface AuditLog {
  id: string;
  action: string;
  actorEmail: string | null;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | string | null;
  createdAt: string;
}

const ACTION_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Refunds', value: 'ORDER_REFUNDED' },
  { label: 'Theme changes', value: 'THEME_CHANGED' },
  { label: 'Menu hides', value: 'MENU_ITEM_HIDDEN' },
  { label: 'Menu updates', value: 'MENU_ITEM_UPDATED' },
  { label: 'Menu deletes', value: 'MENU_ITEM_DELETED' },
  { label: 'User role changes', value: 'USER_ROLE_CHANGED' },
  { label: 'Loyalty adjusts', value: 'LOYALTY_ADJUSTED' },
];

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

const ACTION_COLOR: Record<string, string> = {
  ORDER_REFUNDED: 'text-red-400 bg-red-950/40 border-red-900/50',
  ORDER_CANCELLED: 'text-red-400 bg-red-950/40 border-red-900/50',
  USER_DEACTIVATED: 'text-red-400 bg-red-950/40 border-red-900/50',
  MENU_ITEM_DELETED: 'text-red-400 bg-red-950/40 border-red-900/50',
  ADDON_DELETED: 'text-red-400 bg-red-950/40 border-red-900/50',
  THEME_CHANGED: 'text-glow-1 bg-glow-1/15 border-glow-1/40',
  USER_ROLE_CHANGED: 'text-glow-2 bg-glow-2/15 border-glow-2/40',
  LOYALTY_ADJUSTED: 'text-emerald-400 bg-emerald-950/40 border-emerald-900/50',
};

function actionColor(a: string): string {
  return ACTION_COLOR[a] ?? 'text-ink-dark bg-surface-800 border-surface-700';
}

export default function AuditClient() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState('');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (action) params.set('action', action);
      if (query.trim()) params.set('q', query.trim());
      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const data = await res.json();
      setLogs(data.logs);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, [action, query]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-bold">Audit Log</h1>
        <span className="font-mono text-xs text-ink-dark/50 uppercase tracking-wider">
          {logs.length} {logs.length === 100 ? 'most recent' : 'rows'}
        </span>
      </div>

      <div className="mb-6 bg-surface-900/50 border border-surface-700 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {ACTION_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setAction(f.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-mono uppercase tracking-wider ${
                action === f.value
                  ? 'bg-accent-500 text-surface-950'
                  : 'bg-surface-800 text-ink-dark hover:bg-surface-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by actor email or metadata (e.g. an order id)"
          className="w-full rounded bg-surface-800 border border-surface-700 px-3 py-2 text-sm"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-ink-dark/60">Loading…</div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-surface-700 bg-surface-900/40 p-8 text-center text-ink-dark/60">
          No audit entries match.
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((l) => (
            <div
              key={l.id}
              className="rounded-xl border border-surface-700 bg-surface-900/40 px-4 py-3"
            >
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <span
                  className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider ${actionColor(l.action)}`}
                >
                  {l.action}
                </span>
                <span className="text-xs text-ink-dark/50 font-mono">{fmtTime(l.createdAt)}</span>
              </div>
              <div className="mt-1.5 text-sm text-ink">
                <span className="text-ink-dark">by</span>{' '}
                <span className="font-mono">{l.actorEmail ?? '—'}</span>
                {l.targetType && (
                  <span className="text-ink-dark/70">
                    {' '}
                    · <span className="font-mono">{l.targetType}</span>
                    {l.targetId && (
                      <span className="text-ink-dark/40"> #{l.targetId.slice(-8)}</span>
                    )}
                  </span>
                )}
              </div>
              {l.metadata && (
                <pre className="mt-2 text-[11px] text-ink-dark/70 overflow-x-auto font-mono bg-surface-950/60 rounded px-2 py-1.5">
                  {typeof l.metadata === 'string'
                    ? l.metadata
                    : JSON.stringify(l.metadata, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
