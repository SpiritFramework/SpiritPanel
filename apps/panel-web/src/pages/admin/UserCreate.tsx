import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  AtSign,
  KeyRound,
  Mail,
  Plus,
  Shield,
  User,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react';
import { api } from '../../lib/api';
import {
  DEFAULT_USER_CREATE_FORM,
  USER_ROLE_META,
  userCreatePayload,
  userCreateProgress,
  type UserCreateFormState,
} from '../../lib/user-admin';
import { AdminDetailBody, AdminDetailPage, AdminFormStatus } from '../../components/AdminDetailLayout';
import { AdminLayout, Button, Input } from '../../components/Layout';
import { RoleOption } from '../../components/RoleOption';
import {
  AdminFormDock,
  AdminHero,
  AdminKpiStrip,
  AdminPageStack,
  AdminSection,
  AdminStepProgress,
  AdminToolButton,
} from '../../components/admin/primitives';

export function AdminUserCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState<UserCreateFormState>(DEFAULT_USER_CREATE_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const progress = useMemo(() => userCreateProgress(form), [form]);
  const roleMeta = USER_ROLE_META[form.role];
  const displayName =
    [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(' ') ||
    form.username.trim() ||
    '—';

  const nextHint = !form.email.trim()
    ? 'Enter an email address to continue.'
    : !form.email.includes('@')
      ? 'Use a valid email address.'
      : !form.username.trim()
        ? 'Choose a username to continue.'
        : form.password.length === 0
          ? 'Set a password to continue.'
          : form.password.length < 8
            ? 'Password should be at least 8 characters.'
            : 'Account can sign in as soon as it is created.';

  function patch(partial: Partial<UserCreateFormState>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!progress.ready || saving) return;
    setSaving(true);
    setError('');
    try {
      const created = await api.admin.createUser(userCreatePayload(form));
      navigate(`/admin/users/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout>
      <AdminDetailPage breadcrumb={[{ label: 'Users', to: '/admin/users' }, { label: 'Create user' }]}>
        <AdminDetailBody>
          <AdminPageStack className="ds-nd-create">
            <AdminHero
              eyebrow="Accounts"
              title="Create user"
              description="Add a panel account with login credentials and an access role"
              actions={<AdminToolButton to="/admin/users">Cancel</AdminToolButton>}
            />

            <AdminKpiStrip
              label="Draft summary"
              columns={4}
              items={[
                {
                  icon: AtSign,
                  label: 'Username',
                  value: form.username.trim() ? `@${form.username.trim()}` : '—',
                },
                {
                  icon: Mail,
                  label: 'Email',
                  value: form.email.trim() || '—',
                },
                {
                  icon: Shield,
                  label: 'Role',
                  value: roleMeta.label,
                  tone: form.role === 'admin' ? 'warning' : form.role === 'staff' ? 'success' : undefined,
                },
                {
                  icon: UserPlus,
                  label: 'Ready',
                  value: `${progress.done}/${progress.total}`,
                  tone: progress.ready ? 'success' : undefined,
                },
              ]}
            />

            <form className="ds-nd-create-layout" onSubmit={submit}>
              <div className="ds-nd-create-main">
                <AdminStepProgress steps={progress.steps} label="Account checklist" />

                <AdminSection
                  tone="identity"
                  icon={User}
                  eyebrow="Profile"
                  title="Identity"
                  description="Login identity and optional display name"
                >
                  <div className="ds-nd-st-fields">
                    <Input
                      label="First name"
                      value={form.firstName}
                      onChange={(e) => patch({ firstName: e.target.value })}
                      placeholder="Optional"
                    />
                    <Input
                      label="Last name"
                      value={form.lastName}
                      onChange={(e) => patch({ lastName: e.target.value })}
                      placeholder="Optional"
                    />
                    <div className="ds-nd-st-fields-span">
                      <Input
                        label="Email"
                        type="email"
                        value={form.email}
                        onChange={(e) => patch({ email: e.target.value })}
                        required
                        placeholder="user@example.com"
                      />
                    </div>
                    <div className="ds-nd-st-fields-span">
                      <Input
                        label="Username"
                        value={form.username}
                        onChange={(e) => patch({ username: e.target.value })}
                        required
                        hint="Used for login and display"
                        placeholder="demo"
                      />
                    </div>
                  </div>
                </AdminSection>

                <AdminSection
                  tone="connection"
                  icon={KeyRound}
                  eyebrow="Security"
                  title="Credentials"
                  description="Initial password for the first sign-in"
                  badge={
                    <span className="ds-nd-st-capacity-badge">
                      {form.password.length >= 8
                        ? 'Ready'
                        : form.password.length > 0
                          ? `${form.password.length}/8`
                          : 'Required'}
                    </span>
                  }
                >
                  <Input
                    label="Password"
                    type="password"
                    value={form.password}
                    onChange={(e) => patch({ password: e.target.value })}
                    required
                    hint="Minimum 8 characters"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </AdminSection>

                <AdminSection
                  tone="wings"
                  icon={Shield}
                  eyebrow="Access"
                  title="Role"
                  description="Controls what this account can do in the panel"
                >
                  <div className="ds-usr-create-roles">
                    <RoleOption
                      active={form.role === 'user'}
                      icon={User}
                      title="User"
                      description="Can manage their own servers and profile"
                      onClick={() => patch({ role: 'user' })}
                    />
                    <RoleOption
                      active={form.role === 'staff'}
                      icon={UserCog}
                      title="Staff"
                      description="Light admin: tickets, suspend, read-only infra"
                      onClick={() => patch({ role: 'staff' })}
                    />
                    <RoleOption
                      active={form.role === 'admin'}
                      icon={Shield}
                      title="Admin"
                      description="Full access to the admin panel"
                      onClick={() => patch({ role: 'admin' })}
                    />
                  </div>
                </AdminSection>

                <AdminFormStatus error={error || undefined} />
              </div>

              <aside className="ds-nd-create-aside">
                <section className="ds-nd-create-aside-card">
                  <p className="ds-nd-create-aside-eyebrow">Live draft</p>
                  <h2 className="ds-nd-create-aside-title">Preview</h2>
                  <div className="ds-nd-st-connection-preview-rows">
                    <div className="ds-nd-st-connection-preview-row">
                      <span>Name</span>
                      <code>{displayName}</code>
                    </div>
                    <div className="ds-nd-st-connection-preview-row">
                      <span>Login</span>
                      <code>{form.username.trim() ? `@${form.username.trim()}` : '—'}</code>
                    </div>
                    <div className="ds-nd-st-connection-preview-row">
                      <span>Email</span>
                      <code>{form.email.trim() || '—'}</code>
                    </div>
                  </div>
                  <div className="ds-nd-st-dock-tags">
                    <span className="ds-nd-tag">{roleMeta.label}</span>
                    <span className="ds-nd-tag">
                      {form.password.length >= 8 ? 'Password set' : 'No password'}
                    </span>
                    <span className="ds-nd-tag">{progress.ready ? 'Ready' : 'Incomplete'}</span>
                  </div>
                </section>

                <section className="ds-nd-create-aside-card">
                  <p className="ds-nd-create-aside-eyebrow">Next</p>
                  <h2 className="ds-nd-create-aside-title">After creation</h2>
                  <ol className="ds-nd-create-aside-steps">
                    <li>
                      <span>1</span>
                      The account can sign in with the email/username and password you set.
                    </li>
                    <li>
                      <span>2</span>
                      You&apos;ll land on the user detail page to adjust role, suspend, or API keys.
                    </li>
                    <li>
                      <span>3</span>
                      Assign or provision servers for this owner when you&apos;re ready.
                    </li>
                  </ol>
                  <p className="ds-nd-st-choice-hint mt-3">{roleMeta.summary}</p>
                </section>

                <section className="ds-nd-create-aside-card">
                  <p className="ds-nd-create-aside-eyebrow">Jump</p>
                  <h2 className="ds-nd-create-aside-title">Resources</h2>
                  <div className="ds-nd-create-aside-links">
                    <Link to="/admin/users" className="ds-nd-create-aside-link">
                      <Users className="h-3.5 w-3.5" aria-hidden />
                      <span>
                        <strong>All users</strong>
                        <em>Back to account list</em>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 opacity-50" aria-hidden />
                    </Link>
                    <Link to="/admin/servers/new" className="ds-nd-create-aside-link">
                      <UserPlus className="h-3.5 w-3.5" aria-hidden />
                      <span>
                        <strong>Provision server</strong>
                        <em>Create a server for an owner</em>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 opacity-50" aria-hidden />
                    </Link>
                  </div>
                </section>
              </aside>

              <AdminFormDock
                title={progress.ready ? 'Ready to create' : 'Almost there'}
                hint={nextHint}
                actions={
                  <>
                    <AdminToolButton to="/admin/users">Cancel</AdminToolButton>
                    <Button type="submit" disabled={saving || !progress.ready}>
                      <Plus className="h-3.5 w-3.5" />
                      {saving ? 'Creating…' : 'Create user'}
                      {!saving ? <ArrowRight className="h-3.5 w-3.5" /> : null}
                    </Button>
                  </>
                }
              />
            </form>
          </AdminPageStack>
        </AdminDetailBody>
      </AdminDetailPage>
    </AdminLayout>
  );
}
