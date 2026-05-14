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

const SUGGESTED_CATEGORIES = ['SYRUP', 'TOPPING', 'EXTRA', 'GENERAL'];

export default function AddOnsSection() {
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Draft for create/edit
  const [draft, setDraft] = useState({
    name: '',
    price: '',
    category: 'SYRUP',
    sortOrder: '0',
  });

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

  function startEdit(a: AddOn) {
    setEditingId(a.id);
    setShowCreate(false);
    setDraft({
      name: a.name,
      price: String(a.price),
      category: a.category,
      sortOrder: String(a.sortOrder),
    });
  }

  function startCreate() {
    setShowCreate(true);
    setEditingId(null);
    setDraft({ name: '', price: '', category: 'SYRUP', sortOrder: '0' });
  }

  function cancel() {
    setShowCreate(false);
    setEditingId(null);
  }

  async function save() {
    if (!draft.name.trim() || !draft.price) {
      alert('Name and price are required.');
      return;
    }
    const body = {
      name: draft.name.trim(),
      price: parseFloat(draft.price),
      category: draft.category.toUpperCase().trim(),
      sortOrder: parseInt(draft.sortOrder, 10) || 0,
    };
    const url = '/api/instore/menu/addons';
    const res = editingId
      ? await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...body }),
        })
      : await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
    if (!res.ok) {
      alert((await res.json()).error || 'Failed');
      return;
    }
    cancel();
    await load();
  }

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
      prev.map((a) => (a.id === addOn.id ? { ...a, isActive: next } : a)),
    );
  }

  async function remove(addOn: AddOn) {
    if (!confirm(`Delete "${addOn.name}"? This is permanent.`)) return;
    setBusyId(addOn.id);
    const res = await fetch('/api/instore/menu/addons', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: addOn.id }),
    });
    setBusyId(null);
    if (!res.ok) {
      alert((await res.json()).error || 'Failed');
      return;
    }
    setAddOns((prev) => prev.filter((a) => a.id !== addOn.id));
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
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">
          Add-ons
        </h2>
        {!showCreate && !editingId && (
          <button
            onClick={startCreate}
            className="rounded-lg bg-accent-600 hover:bg-accent-500 px-3 py-1.5 text-xs font-semibold text-white"
          >
            + New add-on
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {(showCreate || editingId) && (
        <div className="mb-3 rounded-xl border border-accent-700/50 bg-accent-950/20 p-4">
          <h3 className="text-xs uppercase tracking-wider text-accent-400 mb-2 font-mono">
            {editingId ? 'Edit add-on' : 'New add-on'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              type="text"
              placeholder="Name (e.g. Vanilla Syrup)"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="rounded bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
            />
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Price ($)"
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: e.target.value })}
              className="rounded bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
            />
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              className="rounded bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
            >
              {SUGGESTED_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Sort order"
              value={draft.sortOrder}
              onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })}
              className="rounded bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={cancel}
              className="rounded-lg bg-neutral-800 hover:bg-neutral-700 px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={save}
              className="rounded-lg bg-accent-500 hover:bg-accent-400 px-4 py-2 text-sm font-semibold text-surface-950"
            >
              {editingId ? 'Save' : 'Create'}
            </button>
          </div>
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
                  <div
                    key={a.id}
                    className={
                      a.isActive
                        ? 'flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-900/30 border border-emerald-800/60'
                        : 'flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-800/50 border border-neutral-700'
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{a.name}</div>
                      <div className="text-xs text-neutral-400">
                        +${a.price.toFixed(2)} ·{' '}
                        <span className={a.isActive ? 'text-emerald-400' : 'text-neutral-500'}>
                          {a.isActive ? 'Available' : 'Hidden'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-2 flex shrink-0 gap-1">
                      <button
                        onClick={() => toggle(a)}
                        disabled={busyId === a.id}
                        className="rounded px-1.5 py-0.5 text-xs text-neutral-300 hover:bg-neutral-700 disabled:opacity-50"
                        title={a.isActive ? 'Hide' : 'Show'}
                      >
                        {a.isActive ? '👁' : '⊘'}
                      </button>
                      <button
                        onClick={() => startEdit(a)}
                        disabled={busyId === a.id}
                        className="rounded px-1.5 py-0.5 text-xs text-neutral-300 hover:bg-neutral-700 disabled:opacity-50"
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => remove(a)}
                        disabled={busyId === a.id}
                        className="rounded px-1.5 py-0.5 text-xs text-red-400 hover:bg-red-900/40 disabled:opacity-50"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
