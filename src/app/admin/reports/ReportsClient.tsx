'use client';

import { useCallback, useEffect, useState } from 'react';

interface Totals {
  gross: number;
  refunded: number;
  net: number;
  tax: number;
  orderCount: number;
  refundCount: number;
  avgTicket: number;
}

interface DailyBucket {
  date: string;
  gross: number;
  net: number;
  orders: number;
}

interface ItemRanking {
  menuItemId: string | null;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
}

interface ReportData {
  totals: Totals;
  daily: DailyBucket[];
  byPaymentMethod: Record<string, { gross: number; count: number }>;
  topItems: ItemRanking[];
  byCategory: Record<string, { quantity: number; revenue: number }>;
}

function isoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const PRESETS: { label: string; days: number }[] = [
  { label: 'Today', days: 0 },
  { label: 'Last 7 days', days: 6 },
  { label: 'Last 30 days', days: 29 },
];

export default function ReportsClient() {
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 6);

  const [from, setFrom] = useState(isoDate(sevenDaysAgo));
  const [to, setTo] = useState(isoDate(today));
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fromIso = new Date(from + 'T00:00:00').toISOString();
      const toEnd = new Date(to + 'T00:00:00');
      toEnd.setDate(toEnd.getDate() + 1);
      const res = await fetch(
        `/api/admin/reports?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toEnd.toISOString())}`,
      );
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      setData(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  function applyPreset(days: number) {
    const t = new Date();
    const f = new Date();
    f.setDate(t.getDate() - days);
    setFrom(isoDate(f));
    setTo(isoDate(t));
  }

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-bold">Reports</h1>
        {data && (
          <span className="font-mono text-xs text-ink-dark/50 uppercase tracking-wider">
            {data.totals.orderCount} orders
          </span>
        )}
      </div>

      <div className="mb-6 bg-surface-900/50 border border-surface-700 rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <label className="block text-sm">
          <span className="block text-xs text-ink-dark/60 mb-1">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded bg-surface-800 border border-surface-700 px-3 py-1.5 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="block text-xs text-ink-dark/60 mb-1">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded bg-surface-800 border border-surface-700 px-3 py-1.5 text-sm"
          />
        </label>
        <div className="flex gap-2 ml-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p.days)}
              className="rounded-lg border border-surface-700 bg-surface-800/60 hover:bg-surface-700 px-3 py-1.5 text-xs text-ink-dark"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading || !data ? (
        <div className="text-ink-dark/60">Loading…</div>
      ) : (
        <div className="space-y-8">
          {/* Headline cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card label="Gross sales" value={`$${data.totals.gross.toFixed(2)}`} accent />
            <Card label="Net (after refunds)" value={`$${data.totals.net.toFixed(2)}`} />
            <Card label="Orders" value={String(data.totals.orderCount)} />
            <Card label="Avg ticket" value={`$${data.totals.avgTicket.toFixed(2)}`} />
            <Card
              label="Refunds"
              value={`$${data.totals.refunded.toFixed(2)} · ${data.totals.refundCount}`}
              negative
            />
            <Card label="Tax collected" value={`$${data.totals.tax.toFixed(2)}`} />
          </div>

          {/* Revenue by day */}
          <Section title="Revenue by day">
            <DailyBars rows={data.daily} />
          </Section>

          {/* Top items */}
          <Section title="Top items by quantity">
            {data.topItems.length === 0 ? (
              <p className="text-ink-dark/60 text-sm">No items sold in this range.</p>
            ) : (
              <BarTable
                rows={data.topItems.map((i) => ({
                  label: i.name,
                  sublabel: i.category,
                  value: i.quantity,
                  trailing: `$${i.revenue.toFixed(2)}`,
                }))}
              />
            )}
          </Section>

          {/* By category */}
          <Section title="Revenue by category">
            {Object.keys(data.byCategory).length === 0 ? (
              <p className="text-ink-dark/60 text-sm">No categories yet.</p>
            ) : (
              <BarTable
                rows={Object.entries(data.byCategory)
                  .map(([cat, v]) => ({
                    label: cat,
                    value: v.revenue,
                    trailing: `${v.quantity} sold`,
                  }))
                  .sort((a, b) => b.value - a.value)}
                valuePrefix="$"
              />
            )}
          </Section>

          {/* By payment method */}
          <Section title="By payment method">
            <BarTable
              rows={Object.entries(data.byPaymentMethod).map(([m, v]) => ({
                label: m,
                value: v.gross,
                trailing: `${v.count} orders`,
              }))}
              valuePrefix="$"
            />
          </Section>
        </div>
      )}
    </div>
  );
}

function Card({
  label,
  value,
  accent,
  negative,
}: {
  label: string;
  value: string;
  accent?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="rounded-xl border border-surface-700 bg-surface-900/50 p-4">
      <div
        className={`font-display text-2xl font-bold ${
          accent ? 'text-accent-400' : negative ? 'text-red-400' : 'text-ink'
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wider text-ink-dark/50 font-mono">
        {label}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-ink-dark/60 mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

function DailyBars({ rows }: { rows: DailyBucket[] }) {
  if (rows.length === 0) {
    return <p className="text-ink-dark/60 text-sm">No data.</p>;
  }
  const max = Math.max(...rows.map((r) => r.gross), 1);
  return (
    <div className="bg-surface-900/40 border border-surface-700 rounded-xl p-4 space-y-2">
      {rows.map((r) => (
        <div key={r.date}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-ink-dark/70 font-mono">{r.date}</span>
            <span className="text-ink">
              ${r.gross.toFixed(2)}{' '}
              <span className="text-ink-dark/50">({r.orders})</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent-500 to-accent-400"
              style={{ width: `${(r.gross / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

interface BarTableRow {
  label: string;
  sublabel?: string;
  value: number;
  trailing?: string;
}

function BarTable({ rows, valuePrefix = '' }: { rows: BarTableRow[]; valuePrefix?: string }) {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="bg-surface-900/40 border border-surface-700 rounded-xl p-4 space-y-2">
      {rows.map((r, i) => (
        <div key={`${r.label}-${i}`}>
          <div className="flex justify-between items-baseline text-sm mb-1">
            <span>
              <span className="text-ink">{r.label}</span>
              {r.sublabel && (
                <span className="ml-2 text-[10px] text-ink-dark/40 uppercase tracking-wider font-mono">
                  {r.sublabel}
                </span>
              )}
            </span>
            <span className="text-ink-dark">
              <span className="text-ink font-semibold">
                {valuePrefix}
                {valuePrefix === '$' ? r.value.toFixed(2) : r.value}
              </span>
              {r.trailing && (
                <span className="ml-2 text-[11px] text-ink-dark/50">{r.trailing}</span>
              )}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-800 overflow-hidden">
            <div
              className="h-full bg-accent-500/60"
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
