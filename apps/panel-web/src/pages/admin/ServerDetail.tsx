import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { formatAllocationAddress } from '../../lib/allocation';
import { AdminEditLoading } from '../../components/admin/AdminEditLayout';
import { AdminDetailNotFound } from '../../components/AdminDetailLayout';
import { AdminServerNetwork } from '../../components/admin/AdminServerNetwork';
import { ServerActivityDashboard } from '../../components/admin/server-detail/ServerActivityDashboard';
import { ServerDetailSaveBar } from '../../components/admin/server-detail/ServerDetailSaveBar';
import {
  ServerDetailHeader,
  ServerDetailTabNav,
} from '../../components/admin/server-detail/ServerDetailShell';
import { ServerManageDashboard } from '../../components/admin/server-detail/ServerManageDashboard';
import { ServerOverviewDashboard } from '../../components/admin/server-detail/ServerOverviewDashboard';
import { AdminLayout } from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { isFullPanelAdmin } from '../../lib/roles';
import { readServerDetailTab, type ServerDetailTab } from './server-detail/helpers';
import { useServerDetail } from './server-detail/useServerDetail';

export function AdminServerDetail() {
  const { serverId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  const fullAdmin = isFullPanelAdmin(currentUser);

  const ctrl = useServerDetail(serverId, fullAdmin);
  const { detail, loading, error } = ctrl;

  const tab = readServerDetailTab(searchParams.get('tab'));

  const tabs = useMemo(
    () =>
      detail
        ? [
            { id: 'overview' as const, label: 'Overview' },
            { id: 'manage' as const, label: 'Manage' },
            { id: 'network' as const, label: 'Network' },
            {
              id: 'activity' as const,
              label: 'Activity',
              count: detail.recentActivity.length,
            },
          ]
        : [],
    [detail],
  );

  function changeTab(next: ServerDetailTab) {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        params.set('tab', next);
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
        <AdminDetailNotFound
          message={error || 'Server not found'}
          backTo="/admin/servers"
          backLabel="Back to servers"
        />
      </AdminLayout>
    );
  }

  const address = formatAllocationAddress(detail.defaultAllocation, { fqdn: detail.node.fqdn });

  return (
    <AdminLayout>
      <form onSubmit={(e) => void ctrl.save(e)} className="ds-asd-page">
        <div className="ds-asd-header-wrap">
          <ServerDetailHeader
            detail={detail}
            fullAdmin={fullAdmin}
            copied={ctrl.copied === 'address'}
            onCopyAddress={() => void ctrl.copyText(address, 'address')}
          />
          <ServerDetailTabNav tabs={tabs} active={tab} onChange={changeTab} />
        </div>

        {tab === 'overview' ? (
          <ServerOverviewDashboard
            ctrl={ctrl}
            fullAdmin={fullAdmin}
            nav={{
              onManage: () => changeTab('manage'),
              onNetwork: () => changeTab('network'),
              onActivity: () => changeTab('activity'),
            }}
          />
        ) : null}

        {tab === 'manage' ? (
          <>
            <ServerManageDashboard ctrl={ctrl} fullAdmin={fullAdmin} />
            <ServerDetailSaveBar ctrl={ctrl} fullAdmin={fullAdmin} />
          </>
        ) : null}

        {tab === 'network' ? (
          <AdminServerNetwork serverId={detail.id} nodeId={detail.node.id} fqdn={detail.node.fqdn} />
        ) : null}

        {tab === 'activity' ? <ServerActivityDashboard ctrl={ctrl} fullAdmin={fullAdmin} /> : null}
            </form>
    </AdminLayout>
  );
}
