import { useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import {
  NodeDetailBreadcrumb,
  NodeDetailHero,
  NodeDetailTabNav,
} from '../../components/admin/node-detail/NodeDetailShell';
import { AdminEditLoading } from '../../components/admin/AdminEditLayout';
import { AdminDetailNotFound } from '../../components/AdminDetailLayout';
import { AdminLayout, Button } from '../../components/Layout';
import { NodeDetailActivityTab } from './node-detail/NodeDetailActivityTab';
import { NodeDetailAllocationsTab } from './node-detail/NodeDetailAllocationsTab';
import { NodeDetailAnalyticsTab } from './node-detail/NodeDetailAnalyticsTab';
import { NodeDetailDatabasesTab } from './node-detail/NodeDetailDatabasesTab';
import { NodeDetailDiagnosticsTab } from './node-detail/NodeDetailDiagnosticsTab';
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
      <form onSubmit={(e) => void save(e)} className="ds-nd-page">
        <NodeDetailBreadcrumb name={detail.name} />

        <NodeDetailHero
          detail={detail}
          wingsVersion={wingsVersion}
          freeAllocations={freeAllocations}
          onDownloadConfig={downloadConfig}
          onDiagnostics={() => {
            changeTab('diagnostics');
            void runDiagnostics();
          }}
        />

        <NodeDetailTabNav tabs={tabs} active={tab} onChange={changeTab} />

        {setupMode && tab === 'overview' ? (
          <div className="ds-nd-banner">
            <div>
              <p className="ds-text-sm font-semibold text-cyan-100">Node created — finish setup</p>
              <p className="mt-1 ds-text-xs text-cyan-200/80">
                Download the Wings config, install FeatherWings on your host, run diagnostics, then create port
                allocations.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={downloadConfig}>
                <Download className="h-3.5 w-3.5" />
                Download config
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => changeTab('allocations')}>
                Add allocations
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={dismissSetup}>
                Dismiss
              </Button>
            </div>
          </div>
        ) : null}

        {tab === 'overview' ? (
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
        ) : null}

        {tab === 'settings' ? <NodeDetailSettingsTab ctrl={ctrl} /> : null}
        {tab === 'analytics' ? <NodeDetailAnalyticsTab nodeId={nodeId} /> : null}
        {tab === 'allocations' ? <NodeDetailAllocationsTab ctrl={ctrl} /> : null}
        {tab === 'servers' ? (
          <NodeDetailServersTab ctrl={ctrl} onAnalytics={() => changeTab('analytics')} />
        ) : null}
        {tab === 'databases' ? <NodeDetailDatabasesTab nodeId={nodeId} nodeFqdn={detail.fqdn} /> : null}
        {tab === 'diagnostics' ? (
          <NodeDetailDiagnosticsTab
            diagnostics={diagnostics}
            loading={diagLoading}
            error={error}
            onRun={() => void runDiagnostics()}
          />
        ) : null}
        {tab === 'activity' ? <NodeDetailActivityTab detail={detail} /> : null}
      </form>
    </AdminLayout>
  );
}
