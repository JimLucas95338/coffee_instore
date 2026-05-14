'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '@/components/ThemeContext';
import { usePrintSettings } from '@/lib/instore/print-settings';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrderStatus = 'RECEIVED' | 'IN_PROGRESS' | 'READY' | 'PICKED_UP' | 'CANCELLED';

interface OrderItem {
  id: string;
  quantity: number;
  size: string | null;
  milkType: string | null;
  temperature: string | null;
  addOns: string | null; // JSON array
  notes: string | null;
  menuItem: { name: string; category: string };
}

interface Order {
  id: string;
  orderNumber: string;
  displayNumber: number;
  customerName: string | null;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  source: string;
  total: number;
  createdAt: string;
  // Optional — depending on what the orders endpoint returns
  updatedAt?: string;
  items: OrderItem[];
}

const POLL_MS = 4000;

const SIZE_LABEL: Record<string, string> = {
  SMALL: 'SM',
  MEDIUM: 'MD',
  LARGE: 'LG',
};

const MILK_LABEL: Record<string, string> = {
  WHOLE: 'Whole',
  TWO_PERCENT: '2%',
  OAT: 'Oat',
  ALMOND: 'Almond',
  SOY: 'Soy',
  COCONUT: 'Coconut',
  NONE: 'No milk',
};

function parseAddOns(s: string | null): { name: string; price: number }[] {
  if (!s) return [];
  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function useTicker(intervalMs = 1000): number {
  const [, setT] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setT((x) => x + 1), intervalMs);
    return () => clearInterval(i);
  }, [intervalMs]);
  return Date.now();
}

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BarStation() {
  const theme = useTheme();
  const printSettings = usePrintSettings();
  const now = useTicker(1000);

  const [orders, setOrders] = useState<Order[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [avgMakeMs, setAvgMakeMs] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Sound on new order
  const knownIdsRef = useRef<Set<string>>(new Set());
  const isFirstFetchRef = useRef(true);

  const fetchActive = useCallback(async () => {
    try {
      const res = await fetch('/api/instore/orders?status=RECEIVED,IN_PROGRESS,READY');
      if (!res.ok) throw new Error('fetch failed');
      const data: Order[] = await res.json();
      setError(false);

      // Detect new orders (only after the first fetch)
      const nextIds = new Set(data.map((o) => o.id));
      if (!isFirstFetchRef.current) {
        const isNew = data.some((o) => !knownIdsRef.current.has(o.id));
        if (isNew) playBlip();
      }
      isFirstFetchRef.current = false;
      knownIdsRef.current = nextIds;

      // Sort by created time ascending (oldest first — make those next)
      data.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      setOrders(data);
    } catch {
      setError(true);
    }
  }, []);

  const fetchTodayStats = useCallback(async () => {
    try {
      // We piggy-back on /api/instore/orders without a status filter — that
      // returns "today's" orders per the existing implementation. From there
      // we can compute count and average make-time client-side.
      const res = await fetch('/api/instore/orders');
      if (!res.ok) return;
      const data: Order[] = await res.json();
      setTodayCount(data.length);

      // Average make-time: createdAt → updatedAt where status >= READY
      const completed = data.filter(
        (o) => o.status === 'READY' || o.status === 'PICKED_UP',
      );
      if (completed.length > 0 && completed[0].updatedAt) {
        const sum = completed.reduce((acc, o) => {
          const start = new Date(o.createdAt).getTime();
          const end = new Date(o.updatedAt!).getTime();
          return acc + Math.max(0, end - start);
        }, 0);
        setAvgMakeMs(sum / completed.length);
      } else {
        setAvgMakeMs(null);
      }
    } catch {
      // ignore stats errors silently
    }
  }, []);

  // Live order stream via SSE, with a polling fallback if the EventSource
  // fails to connect (older proxies, captive portals).
  useEffect(() => {
    let es: EventSource | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let fellBack = false;

    function applyOrders(rawOrders: Order[]) {
      setError(false);

      const nextIds = new Set(rawOrders.map((o) => o.id));
      if (!isFirstFetchRef.current) {
        const isNew = rawOrders.some((o) => !knownIdsRef.current.has(o.id));
        if (isNew) playBlip();
      }
      isFirstFetchRef.current = false;
      knownIdsRef.current = nextIds;

      // Oldest first — those need to be made next.
      const sorted = [...rawOrders].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      setOrders(sorted);
    }

    function startPolling() {
      fellBack = true;
      fetchActive();
      pollInterval = setInterval(fetchActive, POLL_MS);
    }

    try {
      es = new EventSource('/api/instore/orders/stream?status=RECEIVED,IN_PROGRESS,READY');
      es.addEventListener('orders', (event) => {
        try {
          applyOrders(JSON.parse((event as MessageEvent).data));
        } catch {
          // ignore malformed payloads — next event will recover
        }
      });
      es.addEventListener('error', () => {
        // EventSource auto-reconnects; only fall back to polling if it keeps
        // failing. CLOSED means the browser gave up.
        if (es && es.readyState === EventSource.CLOSED && !fellBack) {
          es.close();
          startPolling();
        }
      });
    } catch {
      startPolling();
    }

    fetchTodayStats();
    const statsInterval = setInterval(fetchTodayStats, 30_000);

    return () => {
      es?.close();
      if (pollInterval) clearInterval(pollInterval);
      clearInterval(statsInterval);
    };
  }, [fetchActive, fetchTodayStats]);

  // Stats derived
  const ordersLastHour = useMemo(() => {
    const cutoff = now - 60 * 60 * 1000;
    return orders.filter((o) => new Date(o.createdAt).getTime() >= cutoff).length;
  }, [orders, now]);

  const counts = useMemo(() => {
    const c = { received: 0, inProgress: 0, ready: 0 };
    for (const o of orders) {
      if (o.status === 'RECEIVED') c.received++;
      else if (o.status === 'IN_PROGRESS') c.inProgress++;
      else if (o.status === 'READY') c.ready++;
    }
    return c;
  }, [orders]);

  // ---- Actions ----
  async function advance(order: Order, next: OrderStatus) {
    setBusyId(order.id);
    try {
      const res = await fetch(`/api/instore/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(e.error || 'Failed');
        return;
      }
      await fetchActive();
    } finally {
      setBusyId(null);
    }
  }

  async function cancel(order: Order) {
    if (
      !confirm(
        `Cancel order #${order.displayNumber}${
          order.customerName ? ` for ${order.customerName}` : ''
        }?`,
      )
    ) {
      return;
    }
    setBusyId(order.id);
    try {
      const res = await fetch(`/api/instore/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(e.error || 'Failed');
        return;
      }
      await fetchActive();
    } finally {
      setBusyId(null);
    }
  }

  async function reprint(order: Order) {
    const format = printSettings.printerType === 'receipt' ? 'receipt' : 'thermal';
    const url = `/api/instore/orders/${order.id}/label?format=${format}`;
    if (printSettings.printerType === 'none') {
      window.open(url, '_blank');
      return;
    }
    try {
      const res = await fetch(url);
      if (!res.ok) {
        alert('Failed to fetch label');
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = blobUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(blobUrl);
        }, 5000);
      };
    } catch {
      alert('Failed to print label');
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 text-ink">
      {/* ---- Header ---- */}
      <header className="border-b border-surface-700 bg-surface-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold">Bar Station</h1>
            <p className="text-xs text-ink-dark/60 font-mono uppercase tracking-[0.25em]">
              {theme.brand.fullName}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <StatusPill color="ink-dark" label={theme.status.RECEIVED} count={counts.received} />
            <StatusPill color="accent" label={theme.status.IN_PROGRESS} count={counts.inProgress} />
            <StatusPill color="glow-1" label={theme.status.READY} count={counts.ready} />
          </div>
        </div>

        {/* Stats strip */}
        <div className="border-t border-surface-700 bg-surface-900/40">
          <div className="max-w-6xl mx-auto px-6 py-2 grid grid-cols-3 gap-4 text-center">
            <Stat label="Today" value={String(todayCount)} />
            <Stat label="Last hour" value={String(ordersLastHour)} />
            <Stat
              label="Avg make"
              value={avgMakeMs == null ? '—' : formatElapsed(avgMakeMs)}
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-400">
            Connection error — retrying…
          </div>
        )}

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-surface-700 bg-surface-900/40 p-12 text-center">
            <p className="text-3xl mb-3">{theme.hub.tileEmoji.queue}</p>
            <p className="text-lg text-ink-dark">No orders right now.</p>
            <p className="text-sm text-ink-dark/50 mt-1">
              New orders appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                now={now}
                busy={busyId === order.id}
                onAdvance={advance}
                onCancel={cancel}
                onReprint={reprint}
                inProgressLabel={theme.status.IN_PROGRESS}
                readyLabel={theme.status.READY}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

function OrderCard({
  order,
  now,
  busy,
  onAdvance,
  onCancel,
  onReprint,
  inProgressLabel,
  readyLabel,
}: {
  order: Order;
  now: number;
  busy: boolean;
  onAdvance: (o: Order, next: OrderStatus) => void;
  onCancel: (o: Order) => void;
  onReprint: (o: Order) => void;
  inProgressLabel: string;
  readyLabel: string;
}) {
  const created = new Date(order.createdAt).getTime();
  const elapsed = formatElapsed(now - created);
  const isReady = order.status === 'READY';
  const isInProgress = order.status === 'IN_PROGRESS';
  const isReceived = order.status === 'RECEIVED';

  const borderColor = isReady
    ? 'border-glow-1/60'
    : isInProgress
      ? 'border-accent-500/60'
      : 'border-surface-700';
  const bgTint = isReady
    ? 'bg-glow-1/5'
    : isInProgress
      ? 'bg-accent-500/5'
      : 'bg-surface-900/40';

  return (
    <div
      className={`rounded-2xl border ${borderColor} ${bgTint} p-5 transition-colors`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <div className="flex items-baseline gap-3">
            <span className="font-display text-4xl font-bold text-accent-400 leading-none">
              #{order.displayNumber}
            </span>
            {order.customerName && (
              <span className="text-xl font-semibold text-ink">{order.customerName}</span>
            )}
          </div>
          <p className="mt-1 text-xs text-ink-dark/50 font-mono uppercase tracking-wider">
            {order.source === 'KIOSK' ? 'Kiosk' : 'Counter'} · {order.paymentMethod}
            {order.paymentStatus === 'PENDING' && ' · UNPAID'}
          </p>
        </div>
        <div className="text-right">
          <div
            className={`font-mono text-2xl font-bold ${
              now - created > 8 * 60 * 1000
                ? 'text-red-400'
                : now - created > 4 * 60 * 1000
                  ? 'text-accent-400'
                  : 'text-ink-dark'
            }`}
          >
            {elapsed}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-ink-dark/40 font-mono">
            elapsed
          </div>
        </div>
      </div>

      {/* Items */}
      <ul className="space-y-3 mb-4">
        {order.items.map((item) => (
          <li key={item.id} className="border-l-2 border-accent-500/40 pl-3">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold text-ink">
                {item.quantity > 1 && `${item.quantity}× `}
                {item.menuItem.name}
              </span>
            </div>
            <div className="text-sm text-ink-dark/80 mt-0.5">
              {[
                item.size && SIZE_LABEL[item.size],
                item.temperature,
                item.milkType && item.milkType !== 'NONE' && MILK_LABEL[item.milkType],
              ]
                .filter(Boolean)
                .join(' · ') || (item.menuItem.category === 'FOOD' ? '' : 'Default')}
            </div>
            {parseAddOns(item.addOns).map((a, i) => (
              <div key={i} className="text-sm text-accent-400">
                + {a.name}
              </div>
            ))}
            {item.notes && (
              <div className="mt-1 text-sm italic text-ink-dark">“{item.notes}”</div>
            )}
          </li>
        ))}
      </ul>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-700/50">
        <div className="flex flex-wrap gap-2">
          {isReceived && (
            <button
              onClick={() => onAdvance(order, 'IN_PROGRESS')}
              disabled={busy}
              className="rounded-lg bg-accent-500 hover:bg-accent-400 px-4 py-2 text-sm font-bold text-surface-950 disabled:opacity-50"
            >
              Start {inProgressLabel}
            </button>
          )}
          {isInProgress && (
            <button
              onClick={() => onAdvance(order, 'READY')}
              disabled={busy}
              className="rounded-lg bg-glow-1 hover:bg-glow-1/80 px-4 py-2 text-sm font-bold text-surface-950 disabled:opacity-50"
            >
              Mark {readyLabel}
            </button>
          )}
          {isReady && (
            <button
              onClick={() => onAdvance(order, 'PICKED_UP')}
              disabled={busy}
              className="rounded-lg bg-surface-700 hover:bg-surface-600 px-4 py-2 text-sm font-bold text-ink disabled:opacity-50"
            >
              Picked up
            </button>
          )}
          <button
            onClick={() => onReprint(order)}
            className="rounded-lg border border-surface-700 bg-surface-800/60 hover:bg-surface-700 px-3 py-2 text-sm text-ink-dark"
          >
            🖨 Label
          </button>
        </div>
        <button
          onClick={() => onCancel(order)}
          disabled={busy}
          className="rounded-lg border border-red-900/40 bg-red-950/20 hover:bg-red-900/30 px-3 py-2 text-xs text-red-400 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function StatusPill({
  color,
  label,
  count,
}: {
  color: 'ink-dark' | 'accent' | 'glow-1';
  label: string;
  count: number;
}) {
  const colorMap = {
    'ink-dark': 'bg-surface-800 text-ink-dark border-surface-700',
    accent: 'bg-accent-500/15 text-accent-400 border-accent-500/40',
    'glow-1': 'bg-glow-1/15 text-glow-1 border-glow-1/40',
  };
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-mono uppercase tracking-wider ${colorMap[color]}`}
    >
      {label} <span className="font-bold">{count}</span>
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-display text-xl font-bold text-ink">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-ink-dark/50 font-mono">
        {label}
      </div>
    </div>
  );
}

function playBlip() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
    setTimeout(() => ctx.close(), 500);
  } catch {
    // browser may block audio until user interacts
  }
}
