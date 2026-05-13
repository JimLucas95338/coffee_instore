'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  size: string | null;
  milkType: string | null;
  temperature: string | null;
  addOns: string | null;
  notes: string | null;
  menuItem: { name: string; category: string };
}

interface Order {
  id: string;
  orderNumber: string;
  displayNumber: number;
  status: string;
  customerName: string | null;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  source: string;
  createdAt: string;
  paidAt: string | null;
  refundedAt: string | null;
  refundedAmount: number | null;
  refundReason: string | null;
  refundedBy: { id: string; name: string | null; email: string } | null;
  employee: { name: string | null } | null;
  items: OrderItem[];
  loyaltyPhone?: string | null;
}

function todayRange(): { from: string; to: string } {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return { from: `${yyyy}-${mm}-${dd}`, to: `${yyyy}-${mm}-${dd}` };
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function OrdersClient() {
  const initialRange = todayRange();
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fromIso = new Date(from + 'T00:00:00').toISOString();
      // For inclusivity, set "to" to the start of the day AFTER the picked day.
      const toEnd = new Date(to + 'T00:00:00');
      toEnd.setDate(toEnd.getDate() + 1);
      const res = await fetch(
        `/api/admin/orders?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toEnd.toISOString())}`,
      );
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const data = await res.json();
      setOrders(data.orders);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  async function refund(order: Order) {
    const reason = prompt(
      `Refund order #${order.displayNumber} for $${order.total.toFixed(2)}? Enter a reason (required).`,
    );
    if (reason === null) return; // canceled
    if (!reason.trim()) {
      alert('Reason is required.');
      return;
    }
    setRefundingId(order.id);
    try {
      const res = await fetch(`/api/instore/orders/${order.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(e.error || 'Failed');
        return;
      }
      await load();
    } finally {
      setRefundingId(null);
    }
  }

  const totals = useMemo(() => {
    let gross = 0;
    let refunded = 0;
    let count = 0;
    for (const o of orders) {
      gross += o.total;
      if (o.refundedAt && o.refundedAmount) refunded += o.refundedAmount;
      if (!o.refundedAt) count++;
    }
    return { gross, refunded, net: gross - refunded, count };
  }, [orders]);

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h1 className="font-display text-2xl font-bold">Orders</h1>
        <span className="font-mono text-xs text-ink-dark/50 uppercase tracking-wider">
          {orders.length} orders
        </span>
      </div>

      <div className="mb-6 flex flex-wrap gap-3 items-end bg-surface-900/50 border border-surface-700 rounded-xl p-4">
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
        <div className="ml-auto flex gap-6 text-sm">
          <Stat label="Gross" value={`$${totals.gross.toFixed(2)}`} />
          <Stat label="Refunded" value={`$${totals.refunded.toFixed(2)}`} negative />
          <Stat label="Net" value={`$${totals.net.toFixed(2)}`} accent />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-ink-dark/60">Loading…</div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-surface-700 bg-surface-900/40 p-8 text-center text-ink-dark/60">
          No orders in this date range.
        </div>
      ) : (
        <div className="bg-surface-900/40 border border-surface-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-800/60 text-ink-dark">
              <tr>
                <th className="text-left px-4 py-3 font-mono text-xs uppercase">#</th>
                <th className="text-left px-4 py-3 font-mono text-xs uppercase">Time</th>
                <th className="text-left px-4 py-3 font-mono text-xs uppercase">Customer</th>
                <th className="text-left px-4 py-3 font-mono text-xs uppercase">Items</th>
                <th className="text-right px-4 py-3 font-mono text-xs uppercase">Total</th>
                <th className="text-left px-4 py-3 font-mono text-xs uppercase">Payment</th>
                <th className="text-left px-4 py-3 font-mono text-xs uppercase">Status</th>
                <th className="text-right px-4 py-3 font-mono text-xs uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <OrderRow
                  key={o.id}
                  order={o}
                  expanded={expandedId === o.id}
                  refunding={refundingId === o.id}
                  onToggle={() => setExpandedId(expandedId === o.id ? null : o.id)}
                  onRefund={refund}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OrderRow({
  order,
  expanded,
  refunding,
  onToggle,
  onRefund,
}: {
  order: Order;
  expanded: boolean;
  refunding: boolean;
  onToggle: () => void;
  onRefund: (o: Order) => void;
}) {
  const itemSummary = order.items.map((i) => i.menuItem.name).join(', ');
  const isRefunded = !!order.refundedAt;
  const canRefund = !isRefunded;

  return (
    <>
      <tr
        className={`border-t border-surface-700 cursor-pointer hover:bg-surface-800/40 ${
          isRefunded ? 'opacity-60' : ''
        }`}
        onClick={onToggle}
      >
        <td className="px-4 py-3 font-bold text-accent-400">#{order.displayNumber}</td>
        <td className="px-4 py-3 text-ink-dark">{fmtTime(order.createdAt)}</td>
        <td className="px-4 py-3 text-ink">{order.customerName || '—'}</td>
        <td className="px-4 py-3 text-ink-dark/70 truncate max-w-xs">{itemSummary}</td>
        <td className="px-4 py-3 text-right text-ink">${order.total.toFixed(2)}</td>
        <td className="px-4 py-3 text-ink-dark text-xs uppercase tracking-wider">
          {order.paymentMethod}
          {order.paymentStatus !== 'PAID' && (
            <span className="ml-1 text-amber-400">· {order.paymentStatus}</span>
          )}
        </td>
        <td className="px-4 py-3">
          {isRefunded ? (
            <span className="rounded-full bg-red-900/30 border border-red-900/50 text-red-400 text-[10px] uppercase tracking-wider font-mono px-2 py-0.5">
              Refunded
            </span>
          ) : (
            <span className="text-ink-dark text-xs font-mono uppercase">{order.status}</span>
          )}
        </td>
        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
          {canRefund && (
            <button
              onClick={() => onRefund(order)}
              disabled={refunding}
              className="rounded-lg border border-red-900/50 bg-red-950/30 hover:bg-red-900/40 px-3 py-1 text-xs text-red-300 disabled:opacity-50"
            >
              Refund
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-surface-950/60">
          <td colSpan={8} className="px-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <h3 className="text-xs uppercase tracking-wider text-ink-dark/50 mb-2 font-mono">
                  Items
                </h3>
                <ul className="space-y-1.5">
                  {order.items.map((item) => (
                    <li key={item.id} className="text-ink">
                      <span className="font-semibold">
                        {item.quantity > 1 && `${item.quantity}× `}
                        {item.menuItem.name}
                      </span>{' '}
                      <span className="text-ink-dark/70">
                        {[
                          item.size,
                          item.temperature,
                          item.milkType && item.milkType !== 'NONE' && item.milkType,
                        ]
                          .filter(Boolean)
                          .join(' / ')}
                      </span>
                      <span className="float-right text-ink-dark/80">
                        ${item.totalPrice.toFixed(2)}
                      </span>
                      {item.notes && (
                        <div className="text-xs italic text-ink-dark/50 mt-0.5">
                          “{item.notes}”
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-wider text-ink-dark/50 mb-2 font-mono">
                  Totals
                </h3>
                <dl className="space-y-1 text-ink-dark">
                  <Row label="Subtotal" value={`$${order.subtotal.toFixed(2)}`} />
                  <Row label="Tax" value={`$${order.tax.toFixed(2)}`} />
                  <Row label="Total" value={`$${order.total.toFixed(2)}`} bold />
                  {order.paidAt && (
                    <Row label="Paid" value={fmtDateTime(order.paidAt)} />
                  )}
                </dl>
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-wider text-ink-dark/50 mb-2 font-mono">
                  Meta
                </h3>
                <dl className="space-y-1 text-ink-dark">
                  <Row label="Source" value={order.source} />
                  <Row label="Order #" value={order.orderNumber} />
                  {order.employee?.name && <Row label="Employee" value={order.employee.name} />}
                  {order.loyaltyPhone && (
                    <Row label="Loyalty" value={order.loyaltyPhone} />
                  )}
                </dl>
              </div>
            </div>
            {isRefunded && (
              <div className="mt-4 rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm">
                <div className="font-semibold text-red-300 mb-1">
                  Refunded ${order.refundedAmount?.toFixed(2) ?? '?'}
                  {order.refundedAt && ` · ${fmtDateTime(order.refundedAt)}`}
                  {order.refundedBy &&
                    ` · by ${order.refundedBy.name || order.refundedBy.email}`}
                </div>
                {order.refundReason && (
                  <div className="text-ink-dark italic">“{order.refundReason}”</div>
                )}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function Stat({
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
    <div className="text-right">
      <div
        className={`font-display font-bold ${
          accent ? 'text-accent-400' : negative ? 'text-red-400' : 'text-ink'
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

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-dark/60">{label}</dt>
      <dd className={bold ? 'font-bold text-ink' : 'text-ink'}>{value}</dd>
    </div>
  );
}
