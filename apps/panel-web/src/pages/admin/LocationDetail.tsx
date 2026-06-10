import { useEffect, useMemo, useState } from 'react';

import { Link, useNavigate, useParams } from 'react-router-dom';

import {

  AlertTriangle,

  Globe,

  MapPin,

  Network,

  Server,

  Trash2,

} from 'lucide-react';

import { api, type AdminLocationDetail, type UpdateAdminLocationInput } from '../../lib/api';

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

import { AdminLayout, Button, Input } from '../../components/Layout';

import { EmptyState } from '../../components/ui';



const LOCATION_GRADIENT = 'linear-gradient(135deg, #064e3b 0%, #047857 45%, #022c22 100%)';



type Tab = 'manage' | 'nodes';



export function AdminLocationDetail() {

  const { locationId = '' } = useParams();

  const navigate = useNavigate();



  const [detail, setDetail] = useState<AdminLocationDetail | null>(null);

  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<Tab>('manage');

  const [form, setForm] = useState<UpdateAdminLocationInput>({});

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');

  const [saved, setSaved] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const [copied, setCopied] = useState<'id' | 'uuid' | null>(null);



  async function load() {

    setLoading(true);

    setError('');

    try {

      const loc = await api.admin.location(locationId);

      setDetail(loc);

      setForm({ short: loc.short, long: loc.long });

    } catch {

      setDetail(null);

      setError('Failed to load location');

    } finally {

      setLoading(false);

    }

  }



  useEffect(() => {

    load();

  }, [locationId]);



  const hasChanges = useMemo(() => {

    if (!detail) return false;

    return form.short !== detail.short || form.long !== detail.long;

  }, [detail, form]);



  function resetForm() {

    if (!detail) return;

    setForm({ short: detail.short, long: detail.long });

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

      await api.admin.updateLocation(locationId, form);

      await load();

      setSaved(true);

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Failed to update location');

    } finally {

      setSaving(false);

    }

  }



  async function deleteLocation() {

    setSaving(true);

    setError('');

    try {

      await api.admin.deleteLocation(locationId);

      navigate('/admin/locations');

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Failed to delete location');

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

        <AdminDetailNotFound message={error || 'Location not found'} backTo="/admin/locations" backLabel="Back to locations" />

      </AdminLayout>

    );

  }



  const tabs: { id: Tab; label: string; count?: number }[] = [

    { id: 'manage', label: 'Manage' },

    { id: 'nodes', label: 'Nodes', count: detail.nodeCount },

  ];



  const created = new Date(detail.createdAt).toLocaleDateString(undefined, {

    month: 'long',

    day: 'numeric',

    year: 'numeric',

  });



  return (

    <AdminLayout>

      <AdminDetailPage breadcrumb={[{ label: 'Locations', to: '/admin/locations' }, { label: detail.short }]}>

        <AdminDetailHero

          gradient={LOCATION_GRADIENT}

          icon={Globe}

          title={detail.short}

          subtitle={detail.long}

          meta={`Created ${created}`}

          badges={

            <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/80">

              Region

            </span>

          }

          stats={[

            { icon: Network, label: 'Nodes', value: String(detail.nodeCount) },

            { icon: Server, label: 'Servers', value: String(detail.serverCount) },

            { icon: MapPin, label: 'Display name', value: detail.long, className: 'col-span-2 sm:col-span-1' },

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

                      <p className="text-sm font-medium">{detail.long}</p>

                      <p className="mt-1 text-xs text-[var(--muted)]">

                        {detail.nodeCount === 0

                          ? 'No nodes assigned to this region'

                          : `${detail.nodeCount} node${detail.nodeCount === 1 ? '' : 's'} · ${detail.serverCount} server${detail.serverCount === 1 ? '' : 's'}`}

                      </p>

                    </AdminSidebarCard>



                    <AdminSidebarCard title="Identifiers">

                      <dl className="space-y-2">

                        <AdminInfoRow label="Short code" value={detail.short} mono />

                        <AdminInfoRow label="Internal ID" value={detail.id} mono truncate />

                      </dl>

                      <div className="mt-3 flex gap-2">

                        <AdminCopyButton label={copied === 'id' ? 'Copied' : 'Copy ID'} active={copied === 'id'} onClick={() => copyText(detail.id, 'id')} />

                        <AdminCopyButton label={copied === 'uuid' ? 'Copied' : 'Copy UUID'} active={copied === 'uuid'} onClick={() => copyText(detail.uuid, 'uuid')} />

                      </div>

                    </AdminSidebarCard>



                    <AdminSidebarCard title="Go to">

                      <AdminQuickLink icon={Network} label="Nodes" hint={`${detail.nodeCount} in this region`} onClick={() => setTab('nodes')} />

                    </AdminSidebarCard>

                  </>

                }

              >

                <AdminSettingsPanel title="Location details" description="Short code and display name shown across the panel" icon={MapPin}>

                  <div className="grid gap-3 sm:grid-cols-2">

                    <Input

                      label="Short code"

                      value={form.short ?? ''}

                      onChange={(e) => setForm({ ...form, short: e.target.value.toLowerCase() })}

                      required

                      maxLength={32}

                      placeholder="us-east"

                    />

                    <Input

                      label="Display name"

                      value={form.long ?? ''}

                      onChange={(e) => setForm({ ...form, long: e.target.value })}

                      required

                      placeholder="US East (New York)"

                    />

                  </div>

                  <p className="mt-3 text-[11px] text-[var(--muted)]">

                    The short code appears on node cards and filters. Changing it updates badges everywhere this location is referenced.

                  </p>

                </AdminSettingsPanel>



                <AdminSettingsPanel title="Danger zone" description="Permanently remove this location" icon={Trash2} tone="danger">

                  {!confirmDelete ? (

                    <div className="flex flex-wrap items-center justify-between gap-3">

                      <p className="text-xs text-[var(--muted)]">

                        {detail.nodeCount > 0

                          ? 'Remove or reassign all nodes before deleting this location.'

                          : 'This action cannot be undone.'}

                      </p>

                      <Button type="button" variant="danger" disabled={detail.nodeCount > 0} onClick={() => setConfirmDelete(true)}>

                        <Trash2 className="h-3.5 w-3.5" />

                        Delete location

                      </Button>

                    </div>

                  ) : (

                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">

                      <p className="flex items-start gap-2 text-xs text-red-300">

                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />

                        Are you sure? This will permanently delete <strong className="font-semibold">{detail.short}</strong>.

                      </p>

                      <div className="mt-3 flex justify-end gap-2">

                        <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>

                        <Button type="button" variant="danger" disabled={saving} onClick={deleteLocation}>

                          {saving ? 'Deleting…' : 'Confirm delete'}

                        </Button>

                      </div>

                    </div>

                  )}

                </AdminSettingsPanel>

              </AdminDetailManageLayout>



              <AdminSaveBar hasChanges={hasChanges} saving={saving} error={error} saved={saved} onReset={resetForm} />

            </form>

          )}



          {tab === 'nodes' && (

            <AdminSection title={`Nodes in ${detail.short} (${detail.nodes.length})`} icon={Network}>

              {detail.nodes.length === 0 ? (

                <div className="space-y-3">

                  <EmptyState title="No nodes" description="Create a node and assign it to this location." />

                  <div className="flex justify-center">

                    <Link to="/admin/nodes"><Button type="button">Go to nodes</Button></Link>

                  </div>

                </div>

              ) : (

                <AdminRelatedTable
                  columns={['Node', 'Connection', 'Usage', 'Status']}
                  legend={<span className="inline-flex items-center gap-1"><Server className="h-3 w-3" /> Servers on node</span>}
                  rows={detail.nodes.map((node) => ({
                    key: node.id,
                    href: `/admin/nodes/${node.id}`,
                    cells: [
                      <div className="min-w-[140px]">
                        <p className="truncate text-sm font-medium group-hover:accent-text">{node.name}</p>
                      </div>,
                      <p className="min-w-[120px] truncate font-mono text-[11px] text-[var(--muted)]">{node.fqdn}</p>,
                      <div className="flex gap-1.5">
                        <span className="rounded-md bg-[var(--bg-elevated)] px-2 py-1 text-[10px] tabular-nums text-[var(--muted)]">
                          {node.serverCount} srv
                        </span>
                        <span className="rounded-md bg-[var(--bg-elevated)] px-2 py-1 text-[10px] tabular-nums text-[var(--muted)]">
                          {node.allocationCount} ports
                        </span>
                      </div>,
                      node.maintenanceMode ? (
                        <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">Maintenance</span>
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

    </AdminLayout>

  );

}


