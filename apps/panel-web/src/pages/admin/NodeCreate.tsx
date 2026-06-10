import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Download,
  HardDrive,
  MapPin,
  Network,
  Plus,
  Terminal,
} from 'lucide-react';
import { api, type AdminLocationSummary } from '../../lib/api';
import {
  DEFAULT_NODE_FORM,
  NODE_CREATE_GRADIENT,
  nodeFormToPayload,
  nodeSetupProgress,
  type NodeFormState,
} from '../../lib/node-admin';
import { NodeFormFields } from '../../components/admin/NodeFormFields';
import {
  AdminDetailBody,
  AdminDetailHero,
  AdminDetailManageLayout,
  AdminDetailPage,
  AdminFormStatus,
  AdminQuickLink,
  AdminSidebarCard,
} from '../../components/AdminDetailLayout';
import { AdminLayout, Button } from '../../components/Layout';
import { Spinner } from '../../components/ui';

export function AdminNodeCreate() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<AdminLocationSummary[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [form, setForm] = useState<NodeFormState>(DEFAULT_NODE_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const progress = nodeSetupProgress(form);

  useEffect(() => {
    api.admin
      .locations()
      .then((rows) => {
        setLocations(rows);
        if (rows.length === 1) {
          setForm((current) => ({ ...current, locationId: rows[0]!.id }));
        }
      })
      .catch(() => setError('Failed to load locations'))
      .finally(() => setLoadingLocations(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!progress.ready) return;
    setSaving(true);
    setError('');
    try {
      const created = await api.admin.createNode(nodeFormToPayload(form));
      navigate(`/admin/nodes/${created.id}?setup=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create node');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout>
      <AdminDetailPage breadcrumb={[{ label: 'Nodes', to: '/admin/nodes' }, { label: 'Add node' }]}>
        <AdminDetailHero
          gradient={NODE_CREATE_GRADIENT}
          icon={HardDrive}
          title="Add Wings node"
          subtitle="Register a new daemon host — credentials and config are generated automatically"
          stats={[
            { icon: MapPin, label: 'Locations', value: String(locations.length) },
            { icon: Network, label: 'Scheme', value: form.scheme.toUpperCase() },
            { icon: Terminal, label: 'Daemon port', value: form.daemonListen || '8080' },
            { icon: Download, label: 'Setup', value: `${progress.done}/${progress.total} ready` },
          ]}
          actions={
            <Link to="/admin/nodes">
              <Button type="button" variant="ghost" className="border border-white/15 bg-black/20 text-white hover:bg-black/30">
                Cancel
              </Button>
            </Link>
          }
        />

        <AdminDetailBody>
          {loadingLocations ? (
            <div className="flex justify-center py-20">
              <Spinner className="h-8 w-8" />
            </div>
          ) : locations.length === 0 ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-8 text-center">
              <MapPin className="mx-auto h-8 w-8 text-amber-400" />
              <p className="mt-3 text-sm font-medium text-amber-100">No locations yet</p>
              <p className="mt-1 text-xs text-amber-200/70">Create a location before adding your first node.</p>
              <Link to="/admin/locations" className="mt-4 inline-block">
                <Button type="button">Manage locations</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={submit}>
              <AdminDetailManageLayout
                sidebar={
                  <>
                    <AdminSidebarCard title="Setup checklist">
                      <ul className="space-y-2.5">
                        {progress.steps.map((step) => (
                          <li key={step.id} className="flex items-center gap-2.5 text-xs">
                            {step.done ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
                            ) : (
                              <Circle className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                            )}
                            <span className={step.done ? 'text-[var(--text)]' : 'text-[var(--muted)]'}>{step.label}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                        <div
                          className="h-full rounded-full bg-[var(--accent)] transition-all"
                          style={{ width: `${(progress.done / progress.total) * 100}%` }}
                        />
                      </div>
                    </AdminSidebarCard>

                    <AdminSidebarCard title="After creation">
                      <ol className="space-y-2 text-[11px] leading-relaxed text-[var(--muted)]">
                        <li className="flex gap-2">
                          <span className="font-semibold text-[var(--text)]">1.</span>
                          Download the generated Wings config from the node page.
                        </li>
                        <li className="flex gap-2">
                          <span className="font-semibold text-[var(--text)]">2.</span>
                          Install FeatherWings on the host and place the config at <code className="text-[10px]">/etc/pterodactyl/config.yml</code>.
                        </li>
                        <li className="flex gap-2">
                          <span className="font-semibold text-[var(--text)]">3.</span>
                          Start Wings and run diagnostics to confirm connectivity.
                        </li>
                        <li className="flex gap-2">
                          <span className="font-semibold text-[var(--text)]">4.</span>
                          Create port allocations, then deploy servers.
                        </li>
                      </ol>
                    </AdminSidebarCard>

                    <AdminSidebarCard title="Resources">
                      <AdminQuickLink
                        icon={MapPin}
                        label="Locations"
                        hint={`${locations.length} region${locations.length === 1 ? '' : 's'}`}
                        onClick={() => navigate('/admin/locations')}
                      />
                      <AdminQuickLink
                        icon={HardDrive}
                        label="All nodes"
                        hint="Back to node list"
                        onClick={() => navigate('/admin/nodes')}
                      />
                    </AdminSidebarCard>
                  </>
                }
              >
                <NodeFormFields form={form} setForm={setForm} locations={locations} />

                <AdminFormStatus error={error} />

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button type="submit" disabled={saving || !progress.ready}>
                    <Plus className="h-3.5 w-3.5" />
                    {saving ? 'Creating node…' : 'Create node'}
                    {!saving && <ArrowRight className="h-3.5 w-3.5" />}
                  </Button>
                  <Link to="/admin/nodes">
                    <Button type="button" variant="ghost">
                      Cancel
                    </Button>
                  </Link>
                  {!progress.ready && (
                    <p className="text-xs text-[var(--muted)]">Select a location and fill in name + FQDN to continue.</p>
                  )}
                </div>
              </AdminDetailManageLayout>
            </form>
          )}
        </AdminDetailBody>
      </AdminDetailPage>
    </AdminLayout>
  );
}
