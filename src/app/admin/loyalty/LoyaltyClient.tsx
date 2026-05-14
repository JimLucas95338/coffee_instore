'use client';

import { useCallback, useEffect, useState } from 'react';

interface Member {
  id: string;
  phone: string;
  name: string | null;
  points: number;
  totalSpent: number;
  createdAt: string;
}

interface Transaction {
  id: string;
  points: number;
  type: string;
  description: string;
  createdAt: string;
}

interface RecentOrder {
  id: string;
  displayNumber: number;
  total: number;
  createdAt: string;
  refundedAt: string | null;
}

interface MemberDetail {
  member: Member & { transactions: Transaction[] };
  recentOrders: RecentOrder[];
}

function formatPhone(p: string): string {
  if (p.length !== 10) return p;
  return `(${p.slice(0, 3)}) ${p.slice(3, 6)}-${p.slice(6)}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function LoyaltyClient() {
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/loyalty${query ? `?q=${encodeURIComponent(query)}` : ''}`,
      );
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const data = await res.json();
      setMembers(data.members);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    (async () => {
      const res = await fetch(`/api/admin/loyalty/${selectedId}`);
      if (!cancelled) {
        if (res.ok) {
          setDetail(await res.json());
        } else {
          setDetail(null);
        }
        setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function adjust(direction: 1 | -1) {
    if (!selectedId || !detail) return;
    const amountStr = prompt(
      `How many points to ${direction > 0 ? 'GRANT' : 'REVOKE'} for ${
        detail.member.name || formatPhone(detail.member.phone)
      }?`,
      '10',
    );
    if (amountStr === null) return;
    const amount = parseInt(amountStr, 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Enter a positive whole number.');
      return;
    }
    const reason = prompt('Reason (required):');
    if (reason === null) return;
    if (!reason.trim()) {
      alert('Reason is required.');
      return;
    }
    const res = await fetch(`/api/admin/loyalty/${selectedId}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta: amount * direction, reason: reason.trim() }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      alert(e.error || 'Failed');
      return;
    }
    // Refresh both list and detail
    await load();
    const r = await fetch(`/api/admin/loyalty/${selectedId}`);
    if (r.ok) setDetail(await r.json());
  }

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h1 className="font-display text-2xl font-bold">Loyalty Members</h1>
        <span className="font-mono text-xs text-ink-dark/50 uppercase tracking-wider">
          {members.length}
        </span>
      </div>

      <div className="mb-4 bg-surface-900/50 border border-surface-700 rounded-xl p-4">
        <label className="block text-sm">
          <span className="block text-xs text-ink-dark/60 mb-1">
            Search by phone or name
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="916-555-1234 or 'Sarah'"
            className="w-full rounded bg-surface-800 border border-surface-700 px-3 py-2 text-sm"
          />
        </label>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* List */}
        <div className="bg-surface-900/40 border border-surface-700 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-6 text-ink-dark/60">Loading…</div>
          ) : members.length === 0 ? (
            <div className="p-6 text-ink-dark/60 text-sm">
              {query ? 'No matches.' : 'No members yet.'}
            </div>
          ) : (
            <ul className="divide-y divide-surface-700">
              {members.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => setSelectedId(m.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-surface-800/50 ${
                      selectedId === m.id ? 'bg-surface-800/70' : ''
                    }`}
                  >
                    <div className="flex justify-between items-baseline">
                      <span className="text-ink font-semibold">
                        {m.name || formatPhone(m.phone)}
                      </span>
                      <span className="font-mono text-accent-400 text-sm">
                        {m.points} pts
                      </span>
                    </div>
                    <div className="text-xs text-ink-dark/60 mt-0.5">
                      {m.name && <span>{formatPhone(m.phone)} · </span>}
                      ${m.totalSpent.toFixed(2)} lifetime
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Detail */}
        <div className="bg-surface-900/40 border border-surface-700 rounded-xl p-5">
          {!selectedId ? (
            <p className="text-ink-dark/50 text-sm text-center py-12">
              Select a member to view details.
            </p>
          ) : detailLoading || !detail ? (
            <p className="text-ink-dark/60">Loading…</p>
          ) : (
            <>
              <div className="mb-4">
                <h2 className="font-display text-xl font-bold">
                  {detail.member.name || 'Anonymous member'}
                </h2>
                <p className="text-sm text-ink-dark/60 font-mono">
                  {formatPhone(detail.member.phone)}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <Stat label="Points" value={String(detail.member.points)} accent />
                <Stat
                  label="Redeem value"
                  value={`$${(Math.floor(detail.member.points / 100) * 5).toFixed(2)}`}
                />
                <Stat
                  label="Lifetime"
                  value={`$${detail.member.totalSpent.toFixed(2)}`}
                />
              </div>

              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => adjust(1)}
                  className="flex-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                >
                  + Grant points
                </button>
                <button
                  onClick={() => adjust(-1)}
                  className="flex-1 rounded-lg bg-red-900/50 hover:bg-red-900 px-3 py-2 text-sm font-semibold text-red-200"
                >
                  − Revoke points
                </button>
              </div>

              <h3 className="font-mono text-xs uppercase tracking-wider text-ink-dark/50 mb-2">
                Recent transactions
              </h3>
              {detail.member.transactions.length === 0 ? (
                <p className="text-ink-dark/50 text-sm">No transactions yet.</p>
              ) : (
                <ul className="space-y-1.5 mb-6 text-sm">
                  {detail.member.transactions.map((t) => (
                    <li key={t.id} className="flex justify-between items-baseline">
                      <span>
                        <span
                          className={`font-mono mr-2 ${
                            t.points >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {t.points >= 0 ? '+' : ''}
                          {t.points}
                        </span>
                        <span className="text-ink-dark">{t.description}</span>
                      </span>
                      <span className="text-xs text-ink-dark/40">
                        {formatDateTime(t.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <h3 className="font-mono text-xs uppercase tracking-wider text-ink-dark/50 mb-2">
                Recent orders
              </h3>
              {detail.recentOrders.length === 0 ? (
                <p className="text-ink-dark/50 text-sm">No orders yet.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {detail.recentOrders.map((o) => (
                    <li key={o.id} className="flex justify-between">
                      <span className="text-ink">
                        #{o.displayNumber}{' '}
                        <span className="text-ink-dark/60 text-xs">
                          {formatDateTime(o.createdAt)}
                        </span>
                      </span>
                      <span
                        className={`text-ink ${o.refundedAt ? 'line-through text-ink-dark/40' : ''}`}
                      >
                        ${o.total.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-surface-700 bg-surface-900/60 p-2 text-center">
      <div
        className={`font-display text-xl font-bold ${
          accent ? 'text-accent-400' : 'text-ink'
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-ink-dark/50 font-mono">
        {label}
      </div>
    </div>
  );
}
