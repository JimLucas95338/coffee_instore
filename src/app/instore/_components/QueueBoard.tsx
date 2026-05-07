'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '@/components/ThemeContext';

interface QueueOrder {
  id: string;
  displayNumber: number;
  customerName: string | null;
  status: 'RECEIVED' | 'IN_PROGRESS' | 'READY' | 'PICKED_UP' | 'CANCELLED';
  items: { menuItem: { name: string } }[];
  createdAt: string;
}

function useCurrentTime() {
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return time;
}

function playChime() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174.66, now + 0.15);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0.3, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.6);

    setTimeout(() => ctx.close(), 1000);
  } catch {
    // Audio may be blocked by browser autoplay policy; silently ignore
  }
}

const POLL_INTERVAL = 5000;

interface QueueBoardProps {
  embedded?: boolean;
}

export default function QueueBoard({ embedded = false }: QueueBoardProps) {
  const theme = useTheme();
  const EmptyDisplay = theme.EmptyDisplay;
  const [received, setReceived] = useState<QueueOrder[]>([]);
  const [inProgress, setInProgress] = useState<QueueOrder[]>([]);
  const [ready, setReady] = useState<QueueOrder[]>([]);
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const [error, setError] = useState(false);

  const prevReadyIdsRef = useRef<Set<string>>(new Set());
  const isFirstFetchRef = useRef(true);
  const time = useCurrentTime();

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/instore/orders?status=RECEIVED,IN_PROGRESS,READY');
      if (!res.ok) throw new Error('fetch failed');

      const orders: QueueOrder[] = await res.json();
      setError(false);

      const nextReceived = orders
        .filter((o) => o.status === 'RECEIVED')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      const nextInProgress = orders
        .filter((o) => o.status === 'IN_PROGRESS')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      const nextReady = orders
        .filter((o) => o.status === 'READY')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const nextReadyIds = new Set(nextReady.map((o) => o.id));
      if (!isFirstFetchRef.current) {
        const prevIds = prevReadyIdsRef.current;
        const hasNewReady = nextReady.some((o) => !prevIds.has(o.id));
        if (hasNewReady) {
          playChime();
        }
      }
      isFirstFetchRef.current = false;
      prevReadyIdsRef.current = nextReadyIds;

      setReceived(nextReceived);
      setInProgress(nextInProgress);
      setReady(nextReady);

      const allIds = new Set(orders.map((o) => o.id));
      setVisible(allIds);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const hasOrders = received.length > 0 || inProgress.length > 0 || ready.length > 0;

  // Sizes adapt when embedded in split-screen
  const headerText = embedded ? 'text-2xl' : 'text-4xl';
  const columnHeader = embedded ? 'text-xl' : 'text-3xl';
  const countText = embedded ? 'text-base' : 'text-xl';
  const clockText = embedded ? 'text-lg' : 'text-2xl';
  const padding = embedded ? 'px-5' : 'px-10';
  const emptyIcon = embedded ? 'text-4xl' : 'text-6xl';
  const emptyText = embedded ? 'text-xl' : 'text-3xl';
  const orderNumberSize = embedded ? '48px' : '72px';
  const orderNameText = embedded ? 'text-xl' : 'text-3xl';
  const orderItemText = embedded ? 'text-sm' : 'text-lg';

  return (
    <div className={`flex h-full flex-col overflow-hidden bg-neutral-950 text-white ${embedded ? '' : 'fixed inset-0 select-none'}`}
         style={embedded ? undefined : { cursor: 'none' }}>

      {/* Header */}
      <header className={`flex items-center justify-between ${padding} py-6`}>
        <div className={embedded ? 'w-24' : 'w-48'} />
        <div className="flex flex-col items-center gap-1">
          <h1 className={`${headerText} font-display font-bold tracking-tight`}>
            <span className="text-accent-400">{theme.brand.wordmark.lead}</span>{' '}
            <span className="text-ink">{theme.brand.wordmark.middle}</span>{' '}
            <span className="text-ink-dark">{theme.brand.wordmark.trail}</span>
          </h1>
          {!embedded && (
            <p className="text-sm text-ink-dark/60 tracking-[0.3em] uppercase font-mono">
              {theme.brand.tagline}
            </p>
          )}
        </div>
        <div className={`${embedded ? 'w-24' : 'w-48'} text-right`}>
          <span className={`${clockText} font-mono text-neutral-400`}>{formatTime(time)}</span>
        </div>
      </header>

      {/* Connection error indicator */}
      {error && (
        <div className={`mx-5 mb-4 rounded-lg bg-red-900/40 border border-red-700 px-4 py-2 text-center text-sm text-red-300`}>
          Unable to connect. Retrying...
        </div>
      )}

      {/* Main columns */}
      {hasOrders ? (
        <div className={`flex flex-1 gap-4 ${padding} pb-6`} style={{ minHeight: 0 }}>

          {/* Received column */}
          <section className="flex-1 flex flex-col min-w-0">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-neutral-400" />
              <h2 className={`${columnHeader} font-display font-bold text-ink-dark/70 uppercase tracking-wider`}>
                {theme.status.RECEIVED}
              </h2>
              <span className={`ml-auto ${countText} text-neutral-500 font-mono`}>
                {received.length}
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="grid grid-cols-1 gap-3 auto-rows-min">
                {received.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    color="neutral"
                    isVisible={visible.has(order.id)}
                    numberSize={orderNumberSize}
                    nameText={orderNameText}
                    itemText={orderItemText}
                  />
                ))}
              </div>
            </div>
          </section>

          <div className="w-px bg-neutral-800" />

          {/* In Progress column */}
          <section className="flex-1 flex flex-col min-w-0">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
              <h2 className={`${columnHeader} font-display font-bold text-accent-400 uppercase tracking-wider`}>
                {theme.status.IN_PROGRESS}
              </h2>
              <span className={`ml-auto ${countText} text-neutral-500 font-mono`}>
                {inProgress.length}
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="grid grid-cols-1 gap-3 auto-rows-min">
                {inProgress.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    color="amber"
                    isVisible={visible.has(order.id)}
                    numberSize={orderNumberSize}
                    nameText={orderNameText}
                    itemText={orderItemText}
                  />
                ))}
              </div>
            </div>
          </section>

          <div className="w-px bg-neutral-800" />

          {/* Ready column */}
          <section className="flex-1 flex flex-col min-w-0">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              <h2 className={`${columnHeader} font-display font-bold text-glow-1 uppercase tracking-wider`}>
                {theme.status.READY}
              </h2>
              <span className={`ml-auto ${countText} text-neutral-500 font-mono`}>
                {ready.length}
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="grid grid-cols-1 gap-3 auto-rows-min">
                {ready.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    color="green"
                    isVisible={visible.has(order.id)}
                    numberSize={orderNumberSize}
                    nameText={orderNameText}
                    itemText={orderItemText}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      ) : embedded ? (
        <div className="flex-1 min-h-0">
          <EmptyDisplay />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className={`${emptyIcon} mb-4`}>&#9749;</p>
            <p className={`${emptyText} text-neutral-500 font-light`}>No orders right now</p>
            <p className="text-lg text-neutral-600 mt-2">New orders will appear here automatically</p>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  color,
  isVisible,
  numberSize,
  nameText,
  itemText,
}: {
  order: QueueOrder;
  color: 'amber' | 'green' | 'neutral';
  isVisible: boolean;
  numberSize: string;
  nameText: string;
  itemText: string;
}) {
  const colorMap = {
    amber: { border: 'border-amber-500/40', bg: 'bg-amber-500/10', number: 'text-amber-400', glow: 'shadow-amber-500/20' },
    green: { border: 'border-green-500/40', bg: 'bg-green-500/10', number: 'text-green-400', glow: 'shadow-green-500/20' },
    neutral: { border: 'border-neutral-500/40', bg: 'bg-neutral-500/10', number: 'text-neutral-300', glow: 'shadow-neutral-500/20' },
  };
  const c = colorMap[color];

  const itemSummary = order.items.map((i) => i.menuItem.name).join(', ');

  return (
    <div
      className={`
        rounded-2xl border ${c.border} ${c.bg}
        px-4 py-3 shadow-lg ${c.glow}
        transition-all duration-500 ease-out
        ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}
      `}
    >
      <div className="flex items-baseline gap-3">
        <span className={`font-extrabold leading-none tracking-tight ${c.number}`}
              style={{ fontSize: numberSize }}>
          #{order.displayNumber}
        </span>
        {order.customerName && (
          <span className={`${nameText} font-semibold text-neutral-200 truncate`}>
            {order.customerName}
          </span>
        )}
      </div>
      {itemSummary && (
        <p className={`mt-1 ${itemText} text-neutral-400 truncate`}>{itemSummary}</p>
      )}
    </div>
  );
}
