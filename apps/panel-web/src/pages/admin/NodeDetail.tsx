import { useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Activity,
  Database,
  Download,
  Gauge,
  HardDrive,
  MapPin,
  Network,
  Server,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { NodeAnalyticsPanel } from '../../components/admin/NodeAnalyticsPanel';
import { NodeDiagnosticsPanel } from '../../components/admin/NodeDiagnosticsPanel';
import { AdminEditLoading } from '../../components/admin/AdminEditLayout';
import { DatabaseHostsPanel } from '../../components/DatabaseHostsPanel';
import {
  AdminActivityTimeline,
  AdminDetailBody,
  AdminDetailHero,
  AdminDetailNotFound,
  AdminDetailPage,
  AdminDetailTabs,
  AdminSettingsPanel,
} from '../../components/AdminDetailLayout';
import { AdminLayout, Button } from '../../components/Layout';
import { EmptyState, StatusPill } from '../../components/ui';
import { formatActivityTime } from '../../lib/activity';
import { nodeHeroGradient } from '../../lib/node-admin';
import { NodeDetailAllocationsTab } from './node-detail/NodeDetailAllocationsTab';
import { NodeDetailOverviewTab } from './node-detail/NodeDetailOverviewTab';
import { NodeDetailServersTab } from './node-detail/NodeDetailServersTab';
import { NodeDetailSettingsTab } from './node-detail/NodeDetailSettingsTab';
import { readNodeDetailTab, type NodeDetailTab } from './node-detail/helpers';
import { useNodeDetail } from './node-detail/useNodeDetail';

export function AdminNodeDetail() {
  const { nodeId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const setupMode = searchParams.get('setup') === '1';

  const ctrl = useNodeDetail(nodeId);
  const { detail, loading, error, save, downloadConfig, runDiagnostics, diagLoading, diagnostics } = ctrl;

  const tab = readNodeDetailTab(searchParams.get('tab'));

  useEffect(() => {
    if (tab === 'diagnostics' && !diagnostics && !diagLoading && detail) {
      void runDiagnostics();
    }
  }, [tab, detail?.id]);

  const tabs = useMemo(
    () => [
      { id: 'overview' as const, label: 'Overview' },
      { id: 'settings' as const, label: 'Settings' },
      { id: 'analytics' as const, label: 'Analytics' },
      { id: 'allocations' as const, label: 'Allocations', count: detail?.allocationCount },
      { id: 'servers' as const, label: 'Servers', count: detail?.serverCount },
      { id: 'databases' as const, label: 'Databases' },
      { id: 'diagnostics' as const, label: 'Diagnostics' },
      { id: 'activity' as const, label: 'Activity', count: detail?.recentActivity.length },
    ],
    [detail],
  );

  function changeTab(next: NodeDetailTab) {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        params.set('tab', next);
        if (next !== 'overview') params.delete('setup');
        return params;
      },
      { replace: true },
    );
  }

  function dismissSetup() {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        params.delete('setup');
        return params;
      },
      { replace: true },
    );
  }

  if (loading) {
    return (
      <AdminLayout>
        <AdminEditLoading />
      </AdminLayout>
    );
  }

  if (!detail) {
    return (
      <AdminLayout>
        <AdminDetailNotFound message={error || 'Node not found'} backTo="/admin/nodes" backLabel="Back to nodes" />
      </AdminLayout>
    );
  }

  const wingsVersion =
    detail.system && typeof detail.system.version === 'string' ? detail.system.version : null;
  const freeAllocations = detail.allocationCount - detail.assignedAllocations;

  return (
    <AdminLayout>
      <form onSubmit={(e) => void save(e)} className="node-edit-page">
        <AdminDetailPage breadcrumb={[{ label: 'Nodes', to: '/admin/nodes' }, { label: detail.name }]}>
          <AdminDetailHero
            gradient={nodeHeroGradient(detail)}
            icon={HardDrive}
            title={detail.name}
            subtitle={
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  {detail.location.short} — {detail.location.long}
                </span>
                <span className="hidden text-white/30 sm:inline">·</span>
                <span className="font-mono text-white/75">{detail.fqdn}</span>
              </div>
            }
            badges={
              <>
                <StatusPill
                  label={detail.maintenanceMode ? 'Maintenance' : detail.online ? 'Online' : 'Offline'}
                  tone={detail.maintenanceMode ? 'warning' : detail.online ? 'success' : 'danger'}
                  onDark
                  pulse={detail.online && !detail.maintenanceMode}
                />
                {detail.behindProxy && (
                  <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/85">
                    Proxy
                  </span>
                )}
              </>
            }
            actions={
              <>
                <Button
                  type="button"
                  variant="ghost"
                  className="border border-white/15 bg-black/20 text-white hover:bg-black/30"
                  onClick={downloadConfig}
                >
                  <Download className="h-3.5 w-3.5" />
                  Wings config
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="border border-white/15 bg-black/20 text-white hover:bg-black/30"
                  onClick={() => {
                    changeTab('diagnostics');
                    void runDiagnostics();
                  }}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Diagnostics
                </Button>
              </>
            }
            stats={[
              { icon: Server, label: 'Servers', value: String(detail.serverCount) },
              { icon: Gauge, label: 'Allocations', value: `${detail.assignedAllocations} / ${detail.allocationCount}` },
              { icon: Network, label: 'Free ports', value: String(freeAllocations) },
              { icon: Terminal, label: 'Wings', value: wingsVersion ?? (detail.online ? 'Connected' : 'Offline') },
            ]}
          />

          <AdminDetailTabs tabs={tabs} active={tab} onChange={changeTab} />

          <AdminDetailBody>
            {setupMode && tab === 'overview' && (
              <div className="node-edit-setup-banner">
                <div>
                  <p className="text-sm font-semibold text-cyan-100">Node created — finish setup</p>
                  <p className="mt-1 text-xs leading-relaxed text-cyan-200/80">
                    Download the Wings config, install FeatherWings on your host, run diagnostics, then create port
                    allocations.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={downloadConfig}>
                    <Download className="h-3.5 w-3.5" />
                    Download config
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => changeTab('allocations')}>
                    Add allocations
                  </Button>
                  <Button type="button" variant="ghost" onClick={dismissSetup}>
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

            {tab === 'overview' && (
              <NodeDetailOverviewTab
                ctrl={ctrl}
                onDiagnostics={() => {
                  changeTab('diagnostics');
                  void runDiagnostics();
                }}
                onAllocations={() => changeTab('allocations')}
                onServers={() => changeTab('servers')}
                onAnalytics={() => changeTab('analytics')}
              />
            )}

            {tab === 'settings' && <NodeDetailSettingsTab ctrl={ctrl} />}

            {tab === 'analytics' && (
              <AdminSettingsPanel
                title="Node analytics"
                description="Live usage and historical trends across all servers on this node"
                icon={Activity}
              >
                <NodeAnalyticsPanel nodeId={nodeId} />
              </AdminSettingsPanel>
            )}

            {tab === 'allocations' && <NodeDetailAllocationsTab ctrl={ctrl} />}

            {tab === 'servers' && (
              <NodeDetailServersTab ctrl={ctrl} onAnalytics={() => changeTab('analytics')} />
            )}

            {tab === 'databases' && (
              <AdminSettingsPanel
                title="Database hosts"
                description="MySQL hosts available for servers on this node"
                icon={Database}
              >
                <DatabaseHostsPanel nodeId={nodeId} nodeFqdn={detail.fqdn} />
              </AdminSettingsPanel>
            )}

            {tab === 'diagnostics' && (
              <NodeDiagnosticsPanel
                diagnostics={diagnostics}
                loading={diagLoading}
                error={error}
                onRun={() => void runDiagnostics()}
              />
            )}

            {tab === 'activity' && (
              <AdminSettingsPanel title="Activity log" description="Recent panel events for this node" icon={Activity}>
                {detail.recentActivity.length === 0 ? (
                  <EmptyState title="No activity yet" description="Node events will appear here." />
                ) : (
                  <AdminActivityTimeline
                    entries={detail.recentActivity}
                    renderMeta={(entry) => (
                      <>
                        {entry.actor?.username && `${entry.actor.username} · `}
                        {formatActivityTime(entry.timestamp)}
                      </>
                    )}
                  />
                )}
              </AdminSettingsPanel>
            )}
          </AdminDetailBody>
        </AdminDetailPage>
      </form>
    </AdminLayout>
  );
}
