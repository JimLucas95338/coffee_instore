'use client';

import { useEffect, useState } from 'react';

interface AddOn {
  id: string;
  name: string;
  price: number;
  category: string;
  isActive: boolean;
  sortOrder: number;
}

export default function AddOnsSection() {
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/instore/menu/addons');
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const data = await res.json();
      setAddOns(data.addOns);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(addOn: AddOn) {
    setBusyId(addOn.id);
    const next = !addOn.isActive;
    const res = await fetch('/api/instore/menu/addons', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: addOn.id, isActive: next }),
    });
    setBusyId(null);
    if (!res.ok) {
      alert((await res.json()).error || 'Failed');
      return;
    }
    setAddOns((prev) =>
      prev.map((a) => (a.id === addOn.id ? { ...a, isActive: next } : a))
    );
  }

  // Group by category
  const grouped: Record<string, AddOn[]> = {};
  for (const a of addOns) {
    if (!grouped[a.category]) grouped[a.category] = [];
    grouped[a.category].push(a);
  }
  const orderedCategories = Object.keys(grouped).sort();

  return (
    <section className="mb-8">
      <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3">
        Add-ons
      </h2>

      {error && (
        <div className="mb-3 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-neutral-400">Loading…</div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-4">
          {orderedCategories.map((cat) => (
            <div key={cat}>
              <h3 className="text-xs text-neutral-500 uppercase mb-2">{cat}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {grouped[cat].map((a) => (
                  <button
                    key={a.id}
                    onClick={() => toggle(a)}
                    disabled={busyId === a.id}
                    className={
                      a.isActive
                        ? 'flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-900/30 border border-emerald-800/60 hover:bg-emerald-900/50 disabled:opacity-50 text-left'
                        : 'flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-800/50 border border-neutral-700 hover:bg-neutral-800 disabled:opacity-50 text-left'
                    }
                  >
                    <div>
                      <div className="font-medium text-sm">{a.name}</div>
                      <div className="text-xs text-neutral-400">+${a.price.toFixed(2)}</div>
                    </div>
                    <span
                      className={
                        a.isActive
                          ? 'text-xs text-emerald-400'
                          : 'text-xs text-neutral-500'
                      }
                    >
                      {a.isActive ? 'Available' : 'Hidden'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
