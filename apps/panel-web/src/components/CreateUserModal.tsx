import { useState } from 'react';
import { Shield, User, UserCog, UserPlus } from 'lucide-react';
import { api, type CreateAdminUserInput } from '../lib/api';
import { Button, Input } from './Layout';
import { ModalShell } from './ModalShell';
import { RoleOption } from './RoleOption';

export function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<CreateAdminUserInput>({
    email: '',
    username: '',
    password: '',
    role: 'user',
    firstName: '',
    lastName: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.admin.createUser(form);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      onClose={onClose}
      wide
      header={
        <div className="relative overflow-hidden border-b border-[var(--border)] pr-12">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/25 via-transparent to-transparent" />
          <div className="relative flex items-start gap-3 px-5 py-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl accent-bg shadow-lg">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">Create user</h2>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Add a new panel account with login credentials and role
              </p>
            </div>
          </div>
        </div>
      }
    >
      <form onSubmit={submit} className="p-5">
        <section className="mb-5">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Profile
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="First name"
              value={form.firstName ?? ''}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              placeholder="Optional"
            />
            <Input
              label="Last name"
              value={form.lastName ?? ''}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              placeholder="Optional"
            />
            <div className="sm:col-span-2">
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <Input
              label="Username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              placeholder="Used for login and display"
            />
          </div>
        </section>

        <section className="mb-5">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Security
          </h3>
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            placeholder="Minimum 8 characters recommended"
          />
        </section>

        <section className="mb-5">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Access level
          </h3>
          <div className="grid gap-2 sm:grid-cols-3">
            <RoleOption
              active={form.role === 'user'}
              icon={User}
              title="User"
              description="Can manage their own servers and profile"
              onClick={() => setForm({ ...form, role: 'user' })}
            />
            <RoleOption
              active={form.role === 'staff'}
              icon={UserCog}
              title="Staff"
              description="Light admin: tickets, suspend, read-only infra"
              onClick={() => setForm({ ...form, role: 'staff' })}
            />
            <RoleOption
              active={form.role === 'admin'}
              icon={Shield}
              title="Admin"
              description="Full access to the admin panel"
              onClick={() => setForm({ ...form, role: 'admin' })}
            />
          </div>
        </section>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating…' : 'Create user'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
