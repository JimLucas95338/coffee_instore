'use client';

import { useEffect, useState } from 'react';

type Role = 'ADMIN' | 'MANAGER' | 'SALES_REP' | 'ROASTER' | 'PACKAGER';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

const ROLES: Role[] = ['ADMIN', 'MANAGER', 'SALES_REP', 'ROASTER', 'PACKAGER'];

export default function UsersClient({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingPwId, setEditingPwId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const filteredUsers = users.filter((u) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      (u.name?.toLowerCase().includes(q) ?? false) ||
      u.role.toLowerCase().includes(q)
    );
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to load');
      const data = await res.json();
      setUsers(data.users);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function patchUser(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Update failed');
      return false;
    }
    return true;
  }

  async function changeRole(user: User, role: Role) {
    if (!(await patchUser(user.id, { role }))) return;
    setUsers((u) => u.map((x) => (x.id === user.id ? { ...x, role } : x)));
  }

  async function toggleActive(user: User) {
    const next = !user.isActive;
    if (!(await patchUser(user.id, { isActive: next }))) return;
    setUsers((u) => u.map((x) => (x.id === user.id ? { ...x, isActive: next } : x)));
  }

  async function resetPassword(user: User, password: string) {
    if (!(await patchUser(user.id, { password }))) return;
    setEditingPwId(null);
    alert(`Password updated for ${user.email}`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <button
          onClick={() => setShowCreate((s) => !s)}
          className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 font-semibold"
        >
          {showCreate ? 'Cancel' : '+ New user'}
        </button>
      </div>

      <div className="mb-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users by email, name, or role"
          className="w-full rounded bg-surface-800 border border-surface-700 px-3 py-2 text-sm"
        />
      </div>

      {showCreate && (
        <CreateUserForm
          onCreated={(u) => {
            setUsers((prev) => [u, ...prev]);
            setShowCreate(false);
          }}
        />
      )}

      {error && (
        <div className="mb-4 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-neutral-400">Loading…</div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-800 text-neutral-300">
              <tr>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Created</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <tr key={u.id} className="border-t border-neutral-800">
                    <td className="px-4 py-3">
                      {u.email}
                      {isSelf && <span className="ml-2 text-xs text-amber-400">(you)</span>}
                    </td>
                    <td className="px-4 py-3 text-neutral-300">{u.name || '—'}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u, e.target.value as Role)}
                        disabled={isSelf}
                        className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 disabled:opacity-50"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {u.isActive ? (
                        <span className="text-emerald-400">Active</span>
                      ) : (
                        <span className="text-neutral-500">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditingPwId(editingPwId === u.id ? null : u.id)}
                          className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700"
                        >
                          Reset password
                        </button>
                        <button
                          onClick={() => toggleActive(u)}
                          disabled={isSelf}
                          className={
                            u.isActive
                              ? 'px-3 py-1 rounded bg-red-900/50 hover:bg-red-900 disabled:opacity-50'
                              : 'px-3 py-1 rounded bg-emerald-900/50 hover:bg-emerald-900 disabled:opacity-50'
                          }
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                      {editingPwId === u.id && (
                        <ResetPasswordForm
                          onSubmit={(pw) => resetPassword(u, pw)}
                          onCancel={() => setEditingPwId(null)}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CreateUserForm({ onCreated }: { onCreated: (u: User) => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('SALES_REP');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password, role }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError((await res.json()).error || 'Failed');
      return;
    }
    const { user } = await res.json();
    onCreated(user);
    setEmail('');
    setName('');
    setPassword('');
    setRole('SALES_REP');
  }

  return (
    <form
      onSubmit={submit}
      className="mb-6 bg-neutral-900 border border-neutral-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3"
    >
      <input
        type="email"
        required
        placeholder="email@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
      />
      <input
        type="text"
        required
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
      />
      <input
        type="password"
        required
        minLength={8}
        placeholder="Password (min 8)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        className="px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 font-semibold disabled:opacity-50"
      >
        {submitting ? 'Creating…' : 'Create'}
      </button>
      {error && (
        <div className="md:col-span-5 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </form>
  );
}

function ResetPasswordForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (pw: string) => void;
  onCancel: () => void;
}) {
  const [pw, setPw] = useState('');
  return (
    <div className="mt-2 flex gap-2 justify-end">
      <input
        type="password"
        minLength={8}
        placeholder="New password (min 8)"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm"
      />
      <button
        onClick={() => pw.length >= 8 && onSubmit(pw)}
        className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-sm"
      >
        Save
      </button>
      <button
        onClick={onCancel}
        className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-sm"
      >
        Cancel
      </button>
    </div>
  );
}
