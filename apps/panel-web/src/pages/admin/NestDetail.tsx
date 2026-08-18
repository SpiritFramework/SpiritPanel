import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Egg,
  Layers,
  Server,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import { api, type AdminNestDetail, type UpdateAdminNestInput } from '../../lib/api';
import {
  AdminCopyButton,
  AdminDetailBody,
  AdminDetailHero,
  AdminDetailLoading,
  AdminDetailManageLayout,
  AdminDetailNotFound,
  AdminDetailPage,
  AdminDetailTabs,
  AdminInfoRow,
  AdminQuickLink,
  AdminRelatedTable,
  AdminSaveBar,
  AdminSection,
  AdminSettingsPanel,
  AdminSidebarCard,
} from '../../components/AdminDetailLayout';
import { AdminLayout, Button, Input, Textarea } from '../../components/Layout';
import { ImportEggModal } from '../../components/ImportEggModal';
import { EmptyState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { isFullPanelAdmin } from '../../lib/roles';

const NEST_GRADIENT = 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 45%, #2e1065 100%)';

type Tab = 'manage' | 'eggs';

export function AdminNestDetail() {
  const { nestId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fullAdmin = isFullPanelAdmin(user);

  const [detail, setDetail] = useState<AdminNestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('manage');
  const [form, setForm] = useState<UpdateAdminNestInput>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [copied, setCopied] = useState<'id' | 'uuid' | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const n = await api.admin.nest(nestId);
      setDetail(n);
      setForm({ name: n.name, description: n.description, author: n.author });
    } catch {
      setDetail(null);
      setError('Failed to load nest');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [nestId]);

  const hasChanges = useMemo(() => {
    if (!detail) return false;
    return (
      form.name !== detail.name ||
      (form.description ?? '') !== detail.description ||
      (form.author ?? '') !== detail.author
    );
  }, [detail, form]);

  function resetForm() {
    if (!detail) return;
    setForm({ name: detail.name, description: detail.description, author: detail.author });
    setError('');
    setSaved(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!detail) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api.admin.updateNest(nestId, form);
      await load();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update nest');
    } finally {
      setSaving(false);
    }
  }

  async function deleteNest() {
    setSaving(true);
    setError('');
    try {
      await api.admin.deleteNest(nestId);
      navigate('/admin/nests');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete nest');
      setConfirmDelete(false);
    } finally {
      setSaving(false);
    }
  }

  async function copyText(text: string, key: 'id' | 'uuid') {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  if (loading) {
    return (
      <AdminLayout>
        <AdminDetailLoading />
      </AdminLayout>
    );
  }

  if (!detail) {
    return (
      <AdminLayout>
        <AdminDetailNotFound message={error || 'Nest not found'} backTo="/admin/nests" backLabel="Back to nests" />
      </AdminLayout>
    );
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'manage', label: 'Manage' },
    { id: 'eggs', label: 'Eggs', count: detail.eggCount },
  ];

  const canDelete = detail.serverCount === 0;

  return (
    <AdminLayout>
      <AdminDetailPage breadcrumb={[{ label: 'Nests', to: '/admin/nests' }, { label: detail.name }]}>
        <AdminDetailHero
          gradient={NEST_GRADIENT}
          icon={Layers}
          title={detail.name}
          subtitle={detail.description || 'No description'}
          meta={detail.author}
          actions={
            fullAdmin ? (
            <Button type="button" variant="ghost" onClick={() => setShowImport(true)}>
              <Upload className="h-3.5 w-3.5" />
              Import egg
            </Button>
            ) : undefined
          }
          stats={[
            { icon: Egg, label: 'Eggs', value: String(detail.eggCount) },
            { icon: Server, label: 'Servers', value: String(detail.serverCount) },
            { icon: User, label: 'Author', value: detail.author.split('@')[0] ?? detail.author, className: 'col-span-2 sm:col-span-1' },
          ]}
        />

        <AdminDetailTabs tabs={tabs} active={tab} onChange={setTab} />

        <AdminDetailBody>
          {tab === 'manage' && (
            <form onSubmit={save} className="flex flex-col gap-4">
              <AdminDetailManageLayout
                sidebar={
                  <>
                    <AdminSidebarCard title="Overview">
                      <p className="text-sm font-medium">{detail.name}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {detail.eggCount} egg{detail.eggCount === 1 ? '' : 's'} · {detail.serverCount} server{detail.serverCount === 1 ? '' : 's'}
                      </p>
                    </AdminSidebarCard>

                    <AdminSidebarCard title="Identifiers">
                      <dl className="space-y-2">
                        <AdminInfoRow label="Internal ID" value={detail.id} mono truncate />
                      </dl>
                      <div className="mt-3 flex gap-2">
                        <AdminCopyButton label={copied === 'id' ? 'Copied' : 'Copy ID'} active={copied === 'id'} onClick={() => copyText(detail.id, 'id')} />
                        <AdminCopyButton label={copied === 'uuid' ? 'Copied' : 'Copy UUID'} active={copied === 'uuid'} onClick={() => copyText(detail.uuid, 'uuid')} />
                      </div>
                    </AdminSidebarCard>

                    <AdminSidebarCard title="Go to">
                      <AdminQuickLink icon={Egg} label="Eggs" hint={`${detail.eggCount} in this nest`} onClick={() => setTab('eggs')} />
                    </AdminSidebarCard>
                  </>
                }
              >
                {fullAdmin ? (
                <>
                <AdminSettingsPanel title="Nest details" description="Name, description, and author contact" icon={Layers}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input label="Name" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    <Input label="Author" value={form.author ?? ''} onChange={(e) => setForm({ ...form, author: e.target.value })} />
                  </div>
                  <div className="mt-3">
                    <Textarea label="Description" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                  </div>
                </AdminSettingsPanel>

                <AdminSettingsPanel title="Danger zone" description="Permanently remove this nest and all its eggs" icon={Trash2} tone="danger">
                  {!confirmDelete ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-[var(--muted)]">
                        {canDelete
                          ? 'Deleting a nest removes all eggs inside it.'
                          : 'Remove all servers using eggs in this nest before deleting.'}
                      </p>
                      <Button type="button" variant="danger" disabled={!canDelete} onClick={() => setConfirmDelete(true)}>
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete nest
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                      <p className="flex items-start gap-2 text-xs text-red-300">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        Delete <strong className="font-semibold">{detail.name}</strong> and all {detail.eggCount} egg{detail.eggCount === 1 ? '' : 's'}?
                      </p>
                      <div className="mt-3 flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                        <Button type="button" variant="danger" disabled={saving} onClick={deleteNest}>
                          {saving ? 'Deleting…' : 'Confirm delete'}
                        </Button>
                      </div>
                    </div>
                  )}
                </AdminSettingsPanel>
                </>
                ) : (
                  <AdminSettingsPanel title="Nest details" description="Read-only view" icon={Layers}>
                    <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                      <div><dt className="text-[11px] text-[var(--muted)]">Name</dt><dd className="font-medium">{detail.name}</dd></div>
                      <div><dt className="text-[11px] text-[var(--muted)]">Author</dt><dd>{detail.author}</dd></div>
                      <div className="sm:col-span-2"><dt className="text-[11px] text-[var(--muted)]">Description</dt><dd>{detail.description || '—'}</dd></div>
                    </dl>
                  </AdminSettingsPanel>
                )}
              </AdminDetailManageLayout>

              {fullAdmin && (
                <AdminSaveBar hasChanges={hasChanges} saving={saving} error={error} saved={saved} onReset={resetForm} />
              )}
            </form>
          )}

          {tab === 'eggs' && (
            <AdminSection title={`Eggs in ${detail.name} (${detail.eggs.length})`} icon={Egg}>
              {detail.eggs.length === 0 ? (
                <div className="space-y-3">
                  <EmptyState title="No eggs" description="Import a PTDL_v2 JSON egg into this nest." />
                  <div className="flex justify-center">
                    {fullAdmin && (
                    <Button type="button" onClick={() => setShowImport(true)}>
                      <Upload className="h-3.5 w-3.5" />
                      Import egg
                    </Button>
                    )}
                  </div>
                </div>
              ) : (
                <AdminRelatedTable
                  columns={['Egg', 'Author', 'Usage', 'Status']}
                  legend={<span className="inline-flex items-center gap-1"><Server className="h-3 w-3" /> Servers using egg</span>}
                  rows={detail.eggs.map((egg) => ({
                    key: egg.id,
                    href: `/admin/eggs/${egg.id}`,
                    cells: [
                      <div className="min-w-[140px]">
                        <p className="truncate text-sm font-medium group-hover:accent-text">{egg.name}</p>
                      </div>,
                      <p className="min-w-[120px] truncate text-[11px] text-[var(--muted)]">{egg.author}</p>,
                      <div className="flex gap-1.5">
                        <span className="rounded-md bg-[var(--bg-elevated)] px-2 py-1 text-[10px] tabular-nums text-[var(--muted)]">
                          {egg.variableCount} var{egg.variableCount === 1 ? '' : 's'}
                        </span>
                        <span className="rounded-md bg-[var(--bg-elevated)] px-2 py-1 text-[10px] tabular-nums text-[var(--muted)]">
                          {egg.serverCount} srv
                        </span>
                      </div>,
                      !egg.enabled ? (
                        <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">Disabled</span>
                      ) : (
                        <span className="inline-flex rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">Active</span>
                      ),
                    ],
                  }))}
                />
              )}
            </AdminSection>
          )}
        </AdminDetailBody>
      </AdminDetailPage>

      {fullAdmin && showImport && (
        <ImportEggModal
          defaultNestId={nestId}
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false);
            load();
          }}
        />
      )}
    </AdminLayout>
  );
}
