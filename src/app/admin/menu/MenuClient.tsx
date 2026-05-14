'use client';

import { useEffect, useState } from 'react';
import AddOnsSection from './AddOnsSection';

const CATEGORIES = ['ESPRESSO', 'DRIP', 'COLD', 'TEA', 'FOOD', 'RETAIL'] as const;
type Category = (typeof CATEGORIES)[number];

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  basePrice: number;
  mediumPrice: number | null;
  largePrice: number | null;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  allowSizes: boolean;
  allowMilk: boolean;
  allowTemp: boolean;
}

type Draft = {
  name: string;
  description: string;
  category: Category;
  basePrice: string;
  mediumPrice: string;
  largePrice: string;
  imageUrl: string;
  sortOrder: string;
  allowSizes: boolean;
  allowMilk: boolean;
  allowTemp: boolean;
};

const emptyDraft: Draft = {
  name: '',
  description: '',
  category: 'ESPRESSO',
  basePrice: '',
  mediumPrice: '',
  largePrice: '',
  imageUrl: '',
  sortOrder: '0',
  allowSizes: true,
  allowMilk: true,
  allowTemp: true,
};

function toDraft(item: MenuItem): Draft {
  return {
    name: item.name,
    description: item.description ?? '',
    category: (CATEGORIES as readonly string[]).includes(item.category)
      ? (item.category as Category)
      : 'ESPRESSO',
    basePrice: String(item.basePrice),
    mediumPrice: item.mediumPrice == null ? '' : String(item.mediumPrice),
    largePrice: item.largePrice == null ? '' : String(item.largePrice),
    imageUrl: item.imageUrl ?? '',
    sortOrder: String(item.sortOrder),
    allowSizes: item.allowSizes,
    allowMilk: item.allowMilk,
    allowTemp: item.allowTemp,
  };
}

function draftToBody(d: Draft) {
  return {
    name: d.name.trim(),
    description: d.description.trim() || null,
    category: d.category,
    basePrice: parseFloat(d.basePrice),
    mediumPrice: d.mediumPrice ? parseFloat(d.mediumPrice) : null,
    largePrice: d.largePrice ? parseFloat(d.largePrice) : null,
    imageUrl: d.imageUrl.trim() || null,
    sortOrder: parseInt(d.sortOrder, 10) || 0,
    allowSizes: d.allowSizes,
    allowMilk: d.allowMilk,
    allowTemp: d.allowTemp,
  };
}

export default function MenuClient() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [showCreate, setShowCreate] = useState(false);
  const [query, setQuery] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/instore/menu?all=true');
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const data = await res.json();
      setItems(data.items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createItem() {
    const res = await fetch('/api/instore/menu/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draftToBody(draft)),
    });
    if (!res.ok) {
      alert((await res.json()).error || 'Create failed');
      return;
    }
    setDraft(emptyDraft);
    setShowCreate(false);
    await load();
  }

  async function saveEdit(id: string) {
    const res = await fetch('/api/instore/menu/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...draftToBody(draft) }),
    });
    if (!res.ok) {
      alert((await res.json()).error || 'Save failed');
      return;
    }
    setEditingId(null);
    await load();
  }

  async function toggleActive(item: MenuItem) {
    const res = await fetch('/api/instore/menu/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
    });
    if (!res.ok) {
      alert((await res.json()).error || 'Failed');
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isActive: !item.isActive } : i))
    );
  }

  async function deleteItem(item: MenuItem) {
    if (!confirm(`Delete "${item.name}"? This is permanent.`)) return;
    const res = await fetch('/api/instore/menu/items', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Delete failed');
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  }

  function startEdit(item: MenuItem) {
    setEditingId(item.id);
    setDraft(toDraft(item));
    setShowCreate(false);
  }

  // Apply search filter then group by category
  const q = query.trim().toLowerCase();
  const filteredItems = q
    ? items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.description?.toLowerCase().includes(q) ?? false) ||
          i.category.toLowerCase().includes(q),
      )
    : items;
  const grouped: Record<string, MenuItem[]> = {};
  for (const item of filteredItems) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }
  const orderedCategories = (CATEGORIES as readonly string[]).filter((c) => grouped[c]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Menu</h1>
        <button
          onClick={() => {
            setShowCreate((s) => !s);
            setEditingId(null);
            setDraft(emptyDraft);
          }}
          className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 font-semibold"
        >
          {showCreate ? 'Cancel' : '+ New item'}
        </button>
      </div>

      <div className="mb-6">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search menu items by name, description, or category"
          className="w-full rounded bg-surface-800 border border-surface-700 px-3 py-2 text-sm"
        />
      </div>

      {showCreate && (
        <div className="mb-6 bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-3">New menu item</h2>
          <ItemForm draft={draft} setDraft={setDraft} onSubmit={createItem} submitLabel="Create" />
        </div>
      )}

      {error && (
        <div className="mb-4 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <AddOnsSection />

      {loading ? (
        <div className="text-neutral-400">Loading…</div>
      ) : (
        orderedCategories.map((cat) => (
          <section key={cat} className="mb-8">
            <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3">
              {cat}
            </h2>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-neutral-800 text-neutral-300">
                  <tr>
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Prices (S/M/L)</th>
                    <th className="text-left px-4 py-3">Options</th>
                    <th className="text-left px-4 py-3">Sort</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped[cat].map((item) =>
                    editingId === item.id ? (
                      <tr key={item.id} className="border-t border-neutral-800 bg-neutral-950/50">
                        <td colSpan={6} className="px-4 py-4">
                          <ItemForm
                            draft={draft}
                            setDraft={setDraft}
                            onSubmit={() => saveEdit(item.id)}
                            onCancel={() => setEditingId(null)}
                            submitLabel="Save"
                          />
                        </td>
                      </tr>
                    ) : (
                      <tr key={item.id} className="border-t border-neutral-800">
                        <td className="px-4 py-3">
                          <div className="font-medium">{item.name}</div>
                          {item.description && (
                            <div className="text-xs text-neutral-500 mt-0.5">
                              {item.description}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-neutral-300">
                          ${item.basePrice.toFixed(2)}
                          {item.mediumPrice != null && ` / $${item.mediumPrice.toFixed(2)}`}
                          {item.largePrice != null && ` / $${item.largePrice.toFixed(2)}`}
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-400">
                          {[
                            item.allowSizes && 'sizes',
                            item.allowMilk && 'milk',
                            item.allowTemp && 'temp',
                          ]
                            .filter(Boolean)
                            .join(' • ') || '—'}
                        </td>
                        <td className="px-4 py-3 text-neutral-400">{item.sortOrder}</td>
                        <td className="px-4 py-3">
                          {item.isActive ? (
                            <span className="text-emerald-400">Active</span>
                          ) : (
                            <span className="text-neutral-500">Hidden</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => startEdit(item)}
                              className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => toggleActive(item)}
                              className={
                                item.isActive
                                  ? 'px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700'
                                  : 'px-3 py-1 rounded bg-emerald-900/50 hover:bg-emerald-900'
                              }
                            >
                              {item.isActive ? 'Hide' : 'Show'}
                            </button>
                            <button
                              onClick={() => deleteItem(item)}
                              className="px-3 py-1 rounded bg-red-900/50 hover:bg-red-900"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function ItemForm({
  draft,
  setDraft,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel: string;
}) {
  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft({ ...draft, [key]: value });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Field label="Name">
        <input
          type="text"
          value={draft.name}
          onChange={(e) => set('name', e.target.value)}
          className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
          required
        />
      </Field>
      <Field label="Category">
        <select
          value={draft.category}
          onChange={(e) => set('category', e.target.value as Category)}
          className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Description" className="md:col-span-2">
        <input
          type="text"
          value={draft.description}
          onChange={(e) => set('description', e.target.value)}
          className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
        />
      </Field>
      <Field label="Base price ($)">
        <input
          type="number"
          step="0.01"
          min="0"
          value={draft.basePrice}
          onChange={(e) => set('basePrice', e.target.value)}
          className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
          required
        />
      </Field>
      <Field label="Sort order">
        <input
          type="number"
          value={draft.sortOrder}
          onChange={(e) => set('sortOrder', e.target.value)}
          className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
        />
      </Field>
      <Field label="Medium price ($, optional)">
        <input
          type="number"
          step="0.01"
          min="0"
          value={draft.mediumPrice}
          onChange={(e) => set('mediumPrice', e.target.value)}
          className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
        />
      </Field>
      <Field label="Large price ($, optional)">
        <input
          type="number"
          step="0.01"
          min="0"
          value={draft.largePrice}
          onChange={(e) => set('largePrice', e.target.value)}
          className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
        />
      </Field>
      <Field label="Image URL (optional)" className="md:col-span-2">
        <input
          type="url"
          value={draft.imageUrl}
          onChange={(e) => set('imageUrl', e.target.value)}
          className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
        />
      </Field>
      <div className="md:col-span-2 flex flex-wrap gap-4">
        <Toggle
          label="Allow sizes"
          checked={draft.allowSizes}
          onChange={(v) => set('allowSizes', v)}
        />
        <Toggle
          label="Allow milk"
          checked={draft.allowMilk}
          onChange={(v) => set('allowMilk', v)}
        />
        <Toggle
          label="Allow temp"
          checked={draft.allowTemp}
          onChange={(v) => set('allowTemp', v)}
        />
      </div>
      <div className="md:col-span-2 flex justify-end gap-2 pt-2">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded bg-neutral-800 hover:bg-neutral-700"
          >
            Cancel
          </button>
        )}
        <button
          onClick={onSubmit}
          disabled={!draft.name.trim() || !draft.basePrice}
          className="px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 font-semibold disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs text-neutral-400 mb-1">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-amber-600"
      />
      <span className="text-sm text-neutral-300">{label}</span>
    </label>
  );
}
