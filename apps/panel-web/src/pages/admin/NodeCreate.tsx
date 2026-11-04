import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, HardDrive, MapPin, Network, Plus, Terminal } from 'lucide-react';
import { api, type AdminLocationSummary } from '../../lib/api';
import {
  DEFAULT_NODE_FORM,
  nodeFormToPayload,
  nodeSetupProgress,
  type NodeFormState,
} from '../../lib/node-admin';
import { NodeFormFields } from '../../components/admin/NodeFormFields';
import { AdminDetailBody, AdminDetailPage, AdminFormStatus } from '../../components/AdminDetailLayout';
import { AdminLayout, Button } from '../../components/Layout';
import { Spinner } from '../../components/ui';
import {
  AdminFormDock,
  AdminHero,
  AdminKpiStrip,
  AdminPageStack,
  AdminStepProgress,
  AdminToolButton,
} from '../../components/admin/primitives';

export function AdminNodeCreate() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<AdminLocationSummary[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [form, setForm] = useState<NodeFormState>(DEFAULT_NODE_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const progress = nodeSetupProgress(form);
  const nextHint = !form.locationId
    ? 'Select a location to continue.'
    : !form.name.trim()
      ? 'Enter a node name to continue.'
      : !form.fqdn.trim()
        ? 'Enter the FQDN to continue.'
        : 'Credentials and Wings config generate on the next page.';

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
        <AdminDetailBody>
          <AdminPageStack className=" ds-nd-create">
            <AdminHero
              eyebrow="Daemon host"
              title="Add Wings node"
              description="Register a new FeatherWings host. Token and config are generated automatically after create."
              actions={<AdminToolButton to="/admin/nodes">Cancel</AdminToolButton>}
            />

            <AdminKpiStrip
              label="Draft summary"
              columns={4}
              items={[
                { icon: MapPin, label: 'Locations', value: locations.length },
                { icon: Network, label: 'Scheme', value: form.scheme.toUpperCase() },
                { icon: Terminal, label: 'API port', value: form.daemonListen || '8080' },
                { icon: HardDrive, label: 'Setup', value: `${progress.done}/${progress.total}` },
              ]}
            />

            {loadingLocations ? (
              <div className="ds-nd-create-loading">
                <Spinner className="h-7 w-7" />
                <p>Loading locations…</p>
              </div>
            ) : locations.length === 0 ? (
              <div className="ds-nd-create-empty">
                <span className="ds-nd-create-empty-icon" aria-hidden>
                  <MapPin className="h-5 w-5" />
                </span>
                <h2 className="ds-nd-create-empty-title">No locations yet</h2>
                <p className="ds-nd-create-empty-desc">
                  Create a region first, then come back to register your Wings host.
                </p>
                <Link to="/admin/locations">
                  <Button type="button">Manage locations</Button>
                </Link>
              </div>
            ) : (
              <form className="ds-nd-create-layout" onSubmit={submit}>
                <div className="ds-nd-create-main">
                  <AdminStepProgress steps={progress.steps} />
                  <NodeFormFields form={form} setForm={setForm} locations={locations} />
                  <AdminFormStatus error={error} />
                </div>

                <aside className="ds-nd-create-aside">
                  <section className="ds-nd-create-aside-card">
                    <p className="ds-nd-create-aside-eyebrow">Next</p>
                    <h2 className="ds-nd-create-aside-title">After creation</h2>
                    <ol className="ds-nd-create-aside-steps">
                      <li>
                        <span>1</span>
                        Copy join-data or download the Wings YAML from the node page.
                      </li>
                      <li>
                        <span>2</span>
                        Install FeatherWings, then run <code>sudo featherwings configure</code> and paste
                        join-data.
                      </li>
                      <li>
                        <span>3</span>
                        Start Wings and run diagnostics to confirm connectivity.
                      </li>
                      <li>
                        <span>4</span>
                        Create port allocations, then deploy servers.
                      </li>
                    </ol>
                  </section>

                  <section className="ds-nd-create-aside-card">
                    <p className="ds-nd-create-aside-eyebrow">Jump</p>
                    <h2 className="ds-nd-create-aside-title">Resources</h2>
                    <div className="ds-nd-create-aside-links">
                      <Link to="/admin/locations" className="ds-nd-create-aside-link">
                        <MapPin className="h-3.5 w-3.5" aria-hidden />
                        <span>
                          <strong>Locations</strong>
                          <em>
                            {locations.length} region{locations.length === 1 ? '' : 's'}
                          </em>
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 opacity-50" aria-hidden />
                      </Link>
                      <Link to="/admin/nodes" className="ds-nd-create-aside-link">
                        <HardDrive className="h-3.5 w-3.5" aria-hidden />
                        <span>
                          <strong>All nodes</strong>
                          <em>Back to node list</em>
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
                      <AdminToolButton to="/admin/nodes">Cancel</AdminToolButton>
                      <Button type="submit" disabled={saving || !progress.ready}>
                        <Plus className="h-3.5 w-3.5" />
                        {saving ? 'Creating…' : 'Create node'}
                        {!saving ? <ArrowRight className="h-3.5 w-3.5" /> : null}
                      </Button>
                    </>
                  }
                />
              </form>
            )}
          </AdminPageStack>
        </AdminDetailBody>
      </AdminDetailPage>
    </AdminLayout>
  );
}
