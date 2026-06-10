import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Box,
  Egg,
  Layers,
  Server,
  Terminal,
  Trash2,
  Variable,
} from 'lucide-react';
import { api, type AdminEggDetail, type UpdateAdminEggInput } from '../../lib/api';
import { sanitizeImageSrc } from '../../lib/safe-url';
import {
  AdminCopyButton,
  AdminDetailBody,
  AdminDetailHero,
  AdminDetailLoading,
  AdminDetailManageLayout,
  AdminDetailNotFound,
  AdminDetailPage,
  AdminDetailTabs,
  AdminFormStatus,
  AdminInfoRow,
  AdminMetaRow,
  AdminQuickLink,
  AdminSaveBar,
  AdminSection,
  AdminSettingsPanel,
  AdminSidebarCard,
} from '../../components/AdminDetailLayout';
import { AdminLayout, Button, Input, Textarea } from '../../components/Layout';
import { Checkbox } from '../../components/Checkbox';
import { EggVariablesEditor } from '../../components/EggVariablesEditor';

const EGG_GRADIENT = 'linear-gradient(135deg, #78350f 0%, #d97706 45%, #451a03 100%)';

type Tab = 'manage' | 'variables' | 'config';

export function AdminEggDetail() {
  const { eggId = '' } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<AdminEggDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('manage');
  const [form, setForm] = useState<UpdateAdminEggInput>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState<'id' | 'uuid' | null>(null);
  const [reimportJson, setReimportJson] = useState('');
  const [reimporting, setReimporting] = useState(false);
  const [reimportError, setReimportError] = useState('');
  const [reimported, setReimported] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const e = await api.admin.egg(eggId);
      setDetail(e);
      setForm({ name: e.name, description: e.description, enabled: e.enabled, logoUrl: e.logoUrl ?? '' });
    } catch {
      setDetail(null);
      setError('Failed to load egg');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [eggId]);

  const hasChanges = useMemo(() => {
    if (!detail) return false;
    return (
      form.name !== detail.name ||
      (form.description ?? '') !== detail.description ||
      (form.enabled ?? true) !== detail.enabled ||
      (form.logoUrl ?? '') !== (detail.logoUrl ?? '')
    );
  }, [detail, form]);

  const dockerImageEntries = useMemo(
    () => (detail ? Object.entries(detail.dockerImages) : []),
    [detail],
  );

  function resetForm() {
    if (!detail) return;
    setForm({ name: detail.name, description: detail.description, enabled: detail.enabled, logoUrl: detail.logoUrl ?? '' });
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
      await api.admin.updateEgg(eggId, form);
      await load();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update egg');
    } finally {
      setSaving(false);
    }
  }

  async function deleteEgg() {
    setSaving(true);
    setError('');
    try {
      await api.admin.deleteEgg(eggId);
      navigate(detail ? `/admin/nests/${detail.nestId}` : '/admin/nests');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete egg');
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

  async function reimport() {
    setReimporting(true);
    setReimportError('');
    setReimported(false);
    try {
      const parsed = JSON.parse(reimportJson);
      await api.admin.reimportEgg(eggId, parsed);
      setReimportJson('');
      setReimported(true);
      await load();
    } catch (err) {
      setReimportError(
        err instanceof SyntaxError
          ? 'That is not valid JSON. Paste a Pterodactyl egg export (egg-*.json).'
          : err instanceof Error
            ? err.message
            : 'Failed to re-import egg',
      );
    } finally {
      setReimporting(false);
    }
  }

  async function onReimportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReimportJson(await file.text());
    e.target.value = '';
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
        <AdminDetailNotFound message={error || 'Egg not found'} backTo="/admin/nests" backLabel="Back to nests" />
      </AdminLayout>
    );
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'manage', label: 'Manage' },
    { id: 'variables', label: 'Variables', count: detail.variables.length },
    { id: 'config', label: 'Config' },
  ];

  const canDelete = detail.serverCount === 0;

  return (
    <AdminLayout>
      <AdminDetailPage
        breadcrumb={[
          { label: 'Nests', to: '/admin/nests' },
          { label: detail.nest.name, to: `/admin/nests/${detail.nestId}` },
          { label: detail.name },
        ]}
      >
        <AdminDetailHero
          gradient={EGG_GRADIENT}
          icon={Egg}
          title={detail.name}
          subtitle={detail.description || 'No description'}
          meta={`by ${detail.author}`}
          badges={
            !detail.enabled ? (
              <span className="rounded-full border border-amber-400/30 bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                Disabled
              </span>
            ) : undefined
          }
          stats={[
            { icon: Layers, label: 'Nest', value: detail.nest.name },
            { icon: Variable, label: 'Variables', value: String(detail.variables.length) },
            { icon: Server, label: 'Servers', value: String(detail.serverCount) },
            { icon: Box, label: 'Images', value: String(dockerImageEntries.length) },
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
                        {detail.variables.length} variables · {detail.serverCount} server{detail.serverCount === 1 ? '' : 's'}
                      </p>
                    </AdminSidebarCard>

                    <AdminSidebarCard title="Nest">
                      <Link to={`/admin/nests/${detail.nestId}`} className="flex items-center gap-1.5 text-sm font-medium hover:accent-text">
                        <Layers className="h-3.5 w-3.5 text-[var(--muted)]" />
                        {detail.nest.name}
                      </Link>
                    </AdminSidebarCard>

                    <AdminSidebarCard title="Identifiers">
                      <dl className="space-y-2">
                        <AdminInfoRow label="Internal ID" value={detail.id} mono truncate />
                        <AdminMetaRow label="UUID" value={detail.uuid} mono truncate copy={() => copyText(detail.uuid, 'uuid')} copied={copied === 'uuid'} />
                      </dl>
                      <div className="mt-3 flex gap-2">
                        <AdminCopyButton label={copied === 'id' ? 'Copied' : 'Copy ID'} active={copied === 'id'} onClick={() => copyText(detail.id, 'id')} />
                        <AdminCopyButton label={copied === 'uuid' ? 'Copied' : 'Copy UUID'} active={copied === 'uuid'} onClick={() => copyText(detail.uuid, 'uuid')} />
                      </div>
                    </AdminSidebarCard>

                    <AdminSidebarCard title="Go to">
                      <AdminQuickLink icon={Variable} label="Variables" hint={`${detail.variables.length} defined`} onClick={() => setTab('variables')} />
                      <AdminQuickLink icon={Terminal} label="Config" hint="Startup & docker" onClick={() => setTab('config')} />
                    </AdminSidebarCard>
                  </>
                }
              >
                <AdminSettingsPanel title="Egg details" description="Display name and availability" icon={Egg}>
                  <Input label="Name" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  <div className="mt-3">
                    <Textarea label="Description" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                  </div>
                  <div className="mt-3">
                    <Input
                      label="Logo URL"
                      hint="PNG or WebP over https — shown on server cards and sidebar"
                      value={form.logoUrl ?? ''}
                      onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                      placeholder="https://example.com/minecraft-icon.png"
                    />
                    {(form.logoUrl ?? '').trim() && sanitizeImageSrc(form.logoUrl) ? (
                      <div className="mt-2 flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]/50 p-2.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/20">
                          <img
                            src={sanitizeImageSrc(form.logoUrl)!}
                            alt=""
                            className="h-7 w-7 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <p className="text-[11px] text-[var(--muted)]">Preview</p>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-3">
                    <Checkbox
                      checked={form.enabled ?? true}
                      onChange={(checked) => setForm({ ...form, enabled: checked })}
                      label="Enabled"
                      description="Disabled eggs cannot be selected when creating new servers"
                    />
                  </div>
                </AdminSettingsPanel>

                <AdminSettingsPanel title="Danger zone" description="Permanently remove this egg" icon={Trash2} tone="danger">
                  {!confirmDelete ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-[var(--muted)]">
                        {canDelete
                          ? 'This action cannot be undone.'
                          : 'Remove all servers using this egg before deleting.'}
                      </p>
                      <Button type="button" variant="danger" disabled={!canDelete} onClick={() => setConfirmDelete(true)}>
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete egg
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                      <p className="flex items-start gap-2 text-xs text-red-300">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        Delete <strong className="font-semibold">{detail.name}</strong> permanently?
                      </p>
                      <div className="mt-3 flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                        <Button type="button" variant="danger" disabled={saving} onClick={deleteEgg}>
                          {saving ? 'Deleting…' : 'Confirm delete'}
                        </Button>
                      </div>
                    </div>
                  )}
                </AdminSettingsPanel>

                <AdminFormStatus error={error} saved={saved} />
              </AdminDetailManageLayout>

              <AdminSaveBar hasChanges={hasChanges} saving={saving} error={error} saved={saved} onReset={resetForm} />
            </form>
          )}

          {tab === 'variables' && (
            <AdminSection title={`Variables (${detail.variables.length})`} icon={Variable}>
              <EggVariablesEditor eggId={eggId} variables={detail.variables} onSaved={load} />
            </AdminSection>
          )}

          {tab === 'config' && (
            <div className="space-y-5">
              <AdminSettingsPanel
                title="Re-import egg"
                description="Update scripts, docker images, config files, and variables from an updated Pterodactyl egg export. The egg's identity and attached servers are preserved."
                icon={Egg}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium transition hover:border-[var(--accent)]/40">
                    Upload egg-*.json
                    <input type="file" accept=".json,application/json" className="hidden" onChange={onReimportFile} />
                  </label>
                  <span className="text-[11px] text-[var(--muted)]">or paste the JSON below</span>
                </div>
                <div className="mt-3">
                  <Textarea
                    label="Egg JSON"
                    value={reimportJson}
                    onChange={(e) => {
                      setReimportJson(e.target.value);
                      setReimported(false);
                      setReimportError('');
                    }}
                    rows={6}
                    placeholder='{ "meta": { "version": "PTDL_v2" }, "name": "..." }'
                    className="font-mono text-[11px]"
                  />
                </div>
                <AdminFormStatus error={reimportError} saved={reimported} />
                <div className="mt-3 flex justify-end">
                  <Button type="button" disabled={!reimportJson.trim() || reimporting} onClick={reimport}>
                    {reimporting ? 'Updating…' : 'Update from JSON'}
                  </Button>
                </div>
              </AdminSettingsPanel>

              <AdminSettingsPanel title="Startup command" description="Command executed when the server starts" icon={Terminal}>
                <pre className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3 font-mono text-[11px] leading-relaxed text-[var(--text)]">
                  {detail.startup}
                </pre>
                <p className="mt-2 text-[11px] text-[var(--muted)]">Stop signal: <code className="font-mono">{detail.configStop}</code></p>
              </AdminSettingsPanel>

              <AdminSettingsPanel title="Docker images" description="Available container images for this egg" icon={Box}>
                {dockerImageEntries.length === 0 ? (
                  <p className="text-xs text-[var(--muted)]">No docker images configured.</p>
                ) : (
                  <ul className="space-y-2">
                    {dockerImageEntries.map(([label, image]) => (
                      <li key={label} className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]/40 px-3 py-2">
                        <p className="text-[10px] uppercase text-[var(--muted)]">{label}</p>
                        <p className="mt-0.5 truncate font-mono text-[11px]">{image}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </AdminSettingsPanel>

              {detail.features.length > 0 && (
                <AdminSettingsPanel title="Features" icon={Server}>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.features.map((f) => (
                      <span key={f} className="rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-medium accent-text">{f}</span>
                    ))}
                  </div>
                </AdminSettingsPanel>
              )}

              <AdminSettingsPanel title="Install script" description="Container and entrypoint for provisioning" icon={Box}>
                <dl className="space-y-3">
                  <AdminMetaRow label="Container" value={detail.scriptContainer} mono truncate />
                  <AdminMetaRow label="Entry" value={detail.scriptEntry} mono />
                  <AdminInfoRow label="Privileged" value={detail.scriptPrivileged ? 'Yes' : 'No'} />
                  {detail.updateUrl && <AdminMetaRow label="Update URL" value={detail.updateUrl} mono truncate />}
                </dl>
                {detail.scriptInstall && (
                  <pre className="mt-3 max-h-48 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3 font-mono text-[10px] leading-relaxed">
                    {detail.scriptInstall}
                  </pre>
                )}
              </AdminSettingsPanel>
            </div>
          )}
        </AdminDetailBody>
      </AdminDetailPage>
    </AdminLayout>
  );
}
