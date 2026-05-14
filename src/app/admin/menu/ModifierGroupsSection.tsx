'use client';

import { useCallback, useEffect, useState } from 'react';

interface Modifier {
  id: string;
  name: string;
  priceDelta: number;
  sortOrder: number;
  isActive: boolean;
}

interface Group {
  id: string;
  name: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  sortOrder: number;
  modifiers: Modifier[];
  menuItems: { menuItemId: string; menuItem: { name: string } }[];
}

interface MenuItemRef {
  id: string;
  name: string;
  category: string;
}

export default function ModifierGroupsSection({
  menuItems,
}: {
  menuItems: MenuItemRef[];
}) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/modifier-groups');
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      setGroups((await res.json()).groups);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">
          Modifier groups
        </h2>
        <button
          onClick={() => setShowCreate((s) => !s)}
          className="rounded-lg bg-accent-600 hover:bg-accent-500 px-3 py-1.5 text-xs font-semibold text-white"
        >
          {showCreate ? 'Cancel' : '+ New group'}
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {showCreate && (
        <CreateGroupForm
          onCreated={async () => {
            setShowCreate(false);
            await load();
          }}
        />
      )}

      {loading ? (
        <div className="text-neutral-400">Loading…</div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-500">
          No modifier groups yet. Use these for &quot;pick 1 milk&quot;,
          &quot;syrups&quot;, etc. — anything with required or limited choices
          per item.
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              menuItems={menuItems}
              expanded={expandedId === g.id}
              onToggle={() =>
                setExpandedId(expandedId === g.id ? null : g.id)
              }
              onChanged={load}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CreateGroupForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [required, setRequired] = useState(false);
  const [min, setMin] = useState('0');
  const [max, setMax] = useState('1');

  async function submit() {
    if (!name.trim()) return alert('Name required');
    const res = await fetch('/api/admin/modifier-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        required,
        minSelections: parseInt(min, 10) || 0,
        maxSelections: parseInt(max, 10) || 1,
      }),
    });
    if (!res.ok) return alert((await res.json()).error || 'Failed');
    setName('');
    setRequired(false);
    setMin('0');
    setMax('1');
    onCreated();
  }

  return (
    <div className="mb-3 rounded-xl border border-accent-700/50 bg-accent-950/20 p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <input
          type="text"
          placeholder="Name (e.g. Milk, Syrups)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm md:col-span-2"
        />
        <label className="flex items-center gap-2 px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="accent-accent-600"
          />
          <span>Required</span>
        </label>
        <div className="flex gap-1">
          <input
            type="number"
            placeholder="min"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            className="w-1/2 rounded bg-neutral-800 border border-neutral-700 px-2 py-2 text-sm"
            min="0"
          />
          <input
            type="number"
            placeholder="max"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            className="w-1/2 rounded bg-neutral-800 border border-neutral-700 px-2 py-2 text-sm"
            min="1"
          />
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={submit}
          className="rounded-lg bg-accent-500 hover:bg-accent-400 px-4 py-2 text-sm font-semibold text-surface-950"
        >
          Create
        </button>
      </div>
    </div>
  );
}

function GroupCard({
  group,
  menuItems,
  expanded,
  onToggle,
  onChanged,
}: {
  group: Group;
  menuItems: MenuItemRef[];
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => Promise<void>;
}) {
  const attachedIds = new Set(group.menuItems.map((m) => m.menuItemId));

  async function deleteGroup() {
    if (
      !confirm(
        `Delete "${group.name}"? It will be removed from ${group.menuItems.length} menu item(s).`,
      )
    ) {
      return;
    }
    const res = await fetch('/api/admin/modifier-groups', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: group.id }),
    });
    if (!res.ok) return alert((await res.json()).error || 'Failed');
    await onChanged();
  }

  async function patchGroup(body: Record<string, unknown>) {
    const res = await fetch('/api/admin/modifier-groups', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: group.id, ...body }),
    });
    if (!res.ok) return alert((await res.json()).error || 'Failed');
    await onChanged();
  }

  async function addModifier() {
    const name = prompt('Modifier name?');
    if (!name?.trim()) return;
    const priceStr = prompt('Price delta (e.g. 0, 0.75)?', '0');
    if (priceStr === null) return;
    const priceDelta = parseFloat(priceStr) || 0;
    const res = await fetch(`/api/admin/modifier-groups/${group.id}/modifiers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), priceDelta }),
    });
    if (!res.ok) return alert((await res.json()).error || 'Failed');
    await onChanged();
  }

  async function deleteModifier(modifierId: string, name: string) {
    if (!confirm(`Delete modifier "${name}"?`)) return;
    const res = await fetch(`/api/admin/modifier-groups/${group.id}/modifiers`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modifierId }),
    });
    if (!res.ok) return alert((await res.json()).error || 'Failed');
    await onChanged();
  }

  async function toggleAttach(itemId: string, attach: boolean) {
    const url = `/api/admin/menu/${itemId}/groups`;
    const res = attach
      ? await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupId: group.id }),
        })
      : await fetch(url, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupId: group.id }),
        });
    if (!res.ok) return alert((await res.json()).error || 'Failed');
    await onChanged();
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-neutral-800/50"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-semibold text-ink">{group.name}</span>
          {group.required && (
            <span className="rounded-full bg-accent-500/15 border border-accent-500/40 text-accent-400 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5">
              Required
            </span>
          )}
          <span className="text-xs text-ink-dark/60 font-mono">
            min {group.minSelections} · max {group.maxSelections}
          </span>
          <span className="text-xs text-ink-dark/60">
            {group.modifiers.length} options · {group.menuItems.length} items
          </span>
        </div>
        <span className="text-ink-dark/40 text-xs">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className="border-t border-neutral-800 px-4 py-4 space-y-4">
          {/* Group settings */}
          <div className="flex flex-wrap gap-2 items-center">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={group.required}
                onChange={(e) => patchGroup({ required: e.target.checked })}
                className="accent-accent-600"
              />
              <span>Required</span>
            </label>
            <label className="text-sm flex items-center gap-1">
              <span className="text-ink-dark/60 text-xs">min</span>
              <input
                type="number"
                min="0"
                defaultValue={group.minSelections}
                onBlur={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v) && v !== group.minSelections) {
                    patchGroup({ minSelections: v });
                  }
                }}
                className="w-16 rounded bg-neutral-800 border border-neutral-700 px-2 py-1 text-sm"
              />
            </label>
            <label className="text-sm flex items-center gap-1">
              <span className="text-ink-dark/60 text-xs">max</span>
              <input
                type="number"
                min="1"
                defaultValue={group.maxSelections}
                onBlur={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v) && v !== group.maxSelections) {
                    patchGroup({ maxSelections: v });
                  }
                }}
                className="w-16 rounded bg-neutral-800 border border-neutral-700 px-2 py-1 text-sm"
              />
            </label>
            <button
              onClick={deleteGroup}
              className="ml-auto rounded-lg border border-red-900/50 bg-red-950/30 hover:bg-red-900/40 px-3 py-1 text-xs text-red-300"
            >
              Delete group
            </button>
          </div>

          {/* Modifiers */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs uppercase tracking-wider text-ink-dark/50 font-mono">
                Options
              </h4>
              <button
                onClick={addModifier}
                className="rounded bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1 text-xs"
              >
                + Add option
              </button>
            </div>
            {group.modifiers.length === 0 ? (
              <p className="text-sm text-ink-dark/50">No options yet.</p>
            ) : (
              <ul className="space-y-1">
                {group.modifiers.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between rounded bg-neutral-950/40 px-3 py-1.5 text-sm"
                  >
                    <span className="text-ink">{m.name}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-ink-dark/60">
                        {m.priceDelta > 0 ? `+$${m.priceDelta.toFixed(2)}` : 'free'}
                      </span>
                      <button
                        onClick={() => deleteModifier(m.id, m.name)}
                        className="text-red-400 hover:bg-red-900/40 rounded px-1.5 py-0.5 text-xs"
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Attach to menu items */}
          <div>
            <h4 className="mb-2 text-xs uppercase tracking-wider text-ink-dark/50 font-mono">
              Attach to menu items
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
              {menuItems.map((item) => {
                const isAttached = attachedIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleAttach(item.id, !isAttached)}
                    className={
                      isAttached
                        ? 'rounded px-2 py-1.5 text-xs text-left bg-accent-500/20 border border-accent-500/50 text-accent-300'
                        : 'rounded px-2 py-1.5 text-xs text-left bg-neutral-950/40 border border-neutral-800 text-ink-dark hover:bg-neutral-800'
                    }
                  >
                    <span className="block truncate">{item.name}</span>
                    <span className="block text-[10px] text-ink-dark/40">
                      {item.category}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
