import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ExternalLink,
  FolderOpen,
  Github,
  Package,
  Pencil,
  Plus,
  Star,
  Store,
  Trash2,
} from 'lucide-react';
import { api, type AdminMarketplacePlugin, type MarketplacePluginInput } from '../../lib/api';
import { DEFAULT_MARKETPLACE, type PanelMarketplaceSettings } from '../../lib/panel-settings';
import { AdminLayout, Button, Input, Select, Textarea } from '../../components/Layout';
import { Checkbox } from '../../components/Checkbox';
import {
  AdminDetailBody,
  AdminDetailHero,
  AdminDetailPage,
  AdminFormStatus,
  AdminSaveBar,
  AdminSettingsPanel,
} from '../../components/AdminDetailLayout';
import { Badge, ConfirmDialog, DsIcon, EmptyState, Skeleton } from '../../components/ui';

const EMPTY_FORM: MarketplacePluginInput = {
  slug: '',
  name: '',
  description: '',
  category: 'script',
  tags: [],
  githubOwner: '',
  githubRepo: '',
  githubRef: 'latest-release',
  githubAsset: null,
  installPath: '/resources/[scripts-marketplace]/my-resource',
  cfgResource: 'my-resource',
  cfgAction: 'ensure',
  cfgFile: '/server.cfg',
  dependencies: [],
  featured: false,
  enabled: true,
  sortOrder: 0,
  iconUrl: null,
};

const CATEGORY_OPTIONS = [
  { value: 'library', label: 'Library' },
  { value: 'script', label: 'Script' },
  { value: 'map', label: 'Map' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'other', label: 'Other' },
];

export function AdminMarketplacePage() {
  const [plugins, setPlugins] = useState<AdminMarketplacePlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<AdminMarketplacePlugin | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<MarketplacePluginInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [marketplace, setMarketplace] = useState<PanelMarketplaceSettings>(DEFAULT_MARKETPLACE);
  const [togglingMarketplace, setTogglingMarketplace] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminMarketplacePlugin | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async () => {
    const data = await api.admin.marketplacePlugins();
    setPlugins(data);
  }, []);

  useEffect(() => {
    setLoading(true);
    void (async () => {
      try {
        await refresh();
      } catch {
        setError('Failed to load marketplace plugins');
      }
      try {
        const s = await api.admin.settings();
        setMarketplace({ ...DEFAULT_MARKETPLACE, ...(s.marketplace as PanelMarketplaceSettings | undefined) });
      } catch {
        // Settings load is optional — catalog still works with defaults.
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  async function updateMarketplaceSetting(patch: Partial<typeof marketplace>) {
    setTogglingMarketplace(true);
    setError('');
    const next = { ...marketplace, ...patch };
    try {
      await api.admin.updateSettings({ marketplace: next });
      setMarketplace(next);
      setStatus('Marketplace settings saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update marketplace setting');
    } finally {
      setTogglingMarketplace(false);
    }
  }

  function openCreate() {
    setCreating(true);
    setEditing(null);
    setForm(EMPTY_FORM);
    setStatus('');
  }

  function openEdit(plugin: AdminMarketplacePlugin) {
    setCreating(false);
    setEditing(plugin);
    setForm({
      slug: plugin.slug,
      name: plugin.name,
      description: plugin.description,
      category: plugin.category,
      tags: plugin.tags,
      githubOwner: plugin.githubOwner,
      githubRepo: plugin.githubRepo,
      githubRef: plugin.githubRef,
      githubAsset: plugin.githubAsset ?? null,
      installPath: plugin.installPath,
      cfgResource: plugin.cfgResource,
      cfgAction: plugin.cfgAction,
      cfgFile: plugin.cfgFile,
      dependencies: plugin.dependencies,
      featured: plugin.featured,
      enabled: plugin.enabled,
      sortOrder: plugin.sortOrder,
      iconUrl: plugin.iconUrl ?? null,
    });
    setStatus('');
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  async function saveForm(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setStatus('');
    setError('');
    try {
      const payload = {
        ...form,
        tags: splitCsv(form.tags as unknown as string),
        dependencies: splitCsv(form.dependencies as unknown as string),
      };
      if (editing) {
        await api.admin.updateMarketplacePlugin(editing.id, payload);
        setStatus('Plugin updated.');
      } else {
        await api.admin.createMarketplacePlugin(payload);
        setStatus('Plugin created.');
      }
      await refresh();
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    try {
      await api.admin.deleteMarketplacePlugin(deleteTarget.id);
      await refresh();
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  const showForm = creating || editing;

  return (
    <AdminLayout>
      <AdminDetailPage
        breadcrumb={[
          { label: 'Admin', to: '/admin' },
          { label: 'Marketplace' },
        ]}
      >
        <AdminDetailHero
          title="FiveM Marketplace"
          subtitle="Curate GitHub resources for one-click install on FiveM servers. Files are pulled from GitHub at install time — nothing is uploaded to your panel."
          icon={Package}
          stats={[
            { label: 'User access', value: marketplace.enabled ? 'On' : 'Off' },
            { label: 'Catalog entries', value: String(plugins.length) },
            { label: 'Enabled', value: String(plugins.filter((p) => p.enabled).length) },
            { label: 'Featured', value: String(plugins.filter((p) => p.featured).length) },
          ]}
          actions={
            <Button onClick={openCreate}>
              <DsIcon icon={Plus} />
              Add plugin
            </Button>
          }
        />

        <AdminDetailBody>
          {error && <AdminFormStatus error={error} />}
          {status && <AdminFormStatus saved />}

          <AdminSettingsPanel
            title="User access"
            description="Control whether FiveM server owners can browse and install from this catalog"
            icon={Store}
          >
            <div className="space-y-3">
              <Checkbox
                label="Enable FiveM marketplace for users"
                description="When disabled, the marketplace tab is hidden and install APIs are blocked. You can still edit the catalog here."
                checked={marketplace.enabled}
                disabled={togglingMarketplace}
                onChange={(enabled) => void updateMarketplaceSetting({ enabled })}
              />
              <Checkbox
                label="Show host catalog"
                description="Curated plugins from this page. Disable for GitHub-only mode."
                checked={marketplace.allowCatalog}
                disabled={togglingMarketplace || !marketplace.enabled}
                onChange={(allowCatalog) => void updateMarketplaceSetting({ allowCatalog })}
              />
              <Checkbox
                label="Allow GitHub installs"
                description="Discover tab with popular scripts, search, and custom install paths."
                checked={marketplace.allowGithubInstalls}
                disabled={togglingMarketplace || !marketplace.enabled}
                onChange={(allowGithubInstalls) => void updateMarketplaceSetting({ allowGithubInstalls })}
              />
            </div>
          </AdminSettingsPanel>

          {showForm ? (
            <form onSubmit={saveForm} className="flex flex-col gap-4">
              <AdminSettingsPanel title="Plugin details" description="Shown in the server marketplace browser." icon={Package}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Slug"
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    placeholder="ox-lib"
                    required
                    disabled={!!editing}
                  />
                  <Input
                    label="Name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                  <Select
                    label="Category"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as MarketplacePluginInput['category'] }))}
                  >
                    {CATEGORY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="Sort order"
                    type="number"
                    value={String(form.sortOrder)}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                  />
                </div>
                <Textarea
                  label="Description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  required
                />
                <Input
                  label="Tags (comma-separated)"
                  value={Array.isArray(form.tags) ? form.tags.join(', ') : ''}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value as unknown as string[] }))}
                  placeholder="library, esx, qb"
                />
              </AdminSettingsPanel>

              <AdminSettingsPanel title="GitHub source" description="Public repo — release or source archive is downloaded on install." icon={Github}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Owner"
                    value={form.githubOwner}
                    onChange={(e) => setForm((f) => ({ ...f, githubOwner: e.target.value }))}
                    placeholder="CommunityOx"
                    required
                  />
                  <Input
                    label="Repository"
                    value={form.githubRepo}
                    onChange={(e) => setForm((f) => ({ ...f, githubRepo: e.target.value }))}
                    placeholder="ox_lib"
                    required
                  />
                  <Input
                    label="Ref"
                    value={form.githubRef}
                    onChange={(e) => setForm((f) => ({ ...f, githubRef: e.target.value }))}
                    placeholder="latest-release or v1.0.0"
                  />
                  <Input
                    label="Asset name (optional)"
                    value={form.githubAsset ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, githubAsset: e.target.value || null }))}
                    placeholder="ox_lib.zip"
                  />
                </div>
              </AdminSettingsPanel>

              <AdminSettingsPanel title="Install rules" description="Where files land and how server.cfg is updated." icon={FolderOpen}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Install path"
                    value={form.installPath}
                    onChange={(e) => setForm((f) => ({ ...f, installPath: e.target.value }))}
                    placeholder="/resources/[ox]/ox_lib"
                    required
                  />
                  <Input
                    label="CFG resource name"
                    value={form.cfgResource}
                    onChange={(e) => setForm((f) => ({ ...f, cfgResource: e.target.value }))}
                    required
                  />
                  <Select
                    label="CFG action"
                    value={form.cfgAction}
                    onChange={(e) => setForm((f) => ({ ...f, cfgAction: e.target.value as 'ensure' | 'start' }))}
                  >
                    <option value="ensure">ensure</option>
                    <option value="start">start</option>
                  </Select>
                  <Input
                    label="CFG file"
                    value={form.cfgFile}
                    onChange={(e) => setForm((f) => ({ ...f, cfgFile: e.target.value }))}
                  />
                  <Input
                    label="Dependencies (slugs, comma-separated)"
                    value={Array.isArray(form.dependencies) ? form.dependencies.join(', ') : ''}
                    onChange={(e) => setForm((f) => ({ ...f, dependencies: e.target.value as unknown as string[] }))}
                    placeholder="ox-lib"
                  />
                </div>
                <div className="flex flex-wrap gap-4 pt-2">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                    />
                    Featured
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={form.enabled}
                      onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                    />
                    Enabled
                  </label>
                </div>
              </AdminSettingsPanel>

              <AdminSaveBar hasChanges saving={saving} onReset={closeForm} />
            </form>
          ) : loading ? (
            <div className="ds-marketplace-grid" aria-hidden>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-xl" />
              ))}
            </div>
          ) : plugins.length === 0 ? (
            <EmptyState
              icon={<DsIcon icon={Package} className="ds-icon--md" />}
              title="No plugins yet"
              description="Add your first FiveM resource from GitHub."
              action={
                <Button onClick={openCreate}>
                  <DsIcon icon={Plus} />
                  Add plugin
                </Button>
              }
            />
          ) : (
            <div className="ds-marketplace-grid">
              {plugins.map((plugin) => (
                <article key={plugin.id} className="ds-marketplace-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold">{plugin.name}</h3>
                        {plugin.featured && (
                          <Badge tone="info">
                            <Star className="h-3 w-3" />
                            Featured
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">{plugin.slug}</p>
                    </div>
                    <Badge tone={plugin.enabled ? 'success' : 'neutral'}>
                      {plugin.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>

                  <p className="line-clamp-2 text-xs leading-relaxed text-[var(--muted)]">{plugin.description}</p>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
                    <Badge tone="neutral" className="capitalize">{plugin.category}</Badge>
                    <span className="tabular-nums">{plugin.installCount} installs</span>
                  </div>

                  <a
                    href={plugin.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {plugin.githubOwner}/{plugin.githubRepo}
                    <ExternalLink className="h-3 w-3" />
                  </a>

                  <div className="mt-auto flex gap-2 border-t border-[var(--border)] pt-3">
                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => openEdit(plugin)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setDeleteTarget(plugin)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </AdminDetailBody>
      </AdminDetailPage>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete plugin"
        description={`Remove "${deleteTarget?.name}" from the catalog?`}
        detail="Servers that already installed this resource are not affected."
        confirmLabel="Delete"
        loading={deleting}
      />
    </AdminLayout>
  );
}

function splitCsv(value: string | string[]): string[] {
  if (Array.isArray(value)) return value;
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
