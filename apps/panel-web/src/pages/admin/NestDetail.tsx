import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { AdminEditLoading } from '../../components/admin/AdminEditLayout';
import { AdminDetailNotFound } from '../../components/AdminDetailLayout';
import { ImportEggModal } from '../../components/ImportEggModal';
import { NestDetailSaveBar } from '../../components/admin/nest-detail/NestDetailSaveBar';
import {
  NestDetailHeader,
  NestDetailTabNav,
} from '../../components/admin/nest-detail/NestDetailShell';
import { NestEggsDashboard } from '../../components/admin/nest-detail/NestEggsDashboard';
import { NestManageDashboard } from '../../components/admin/nest-detail/NestManageDashboard';
import { NestOverviewDashboard } from '../../components/admin/nest-detail/NestOverviewDashboard';
import { AdminLayout } from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { isFullPanelAdmin } from '../../lib/roles';
import { readNestDetailTab, type NestDetailTab } from './nest-detail/helpers';
import { useNestDetail } from './nest-detail/useNestDetail';

export function AdminNestDetail() {
  const { nestId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const fullAdmin = isFullPanelAdmin(user);
  const [showImport, setShowImport] = useState(false);

  const ctrl = useNestDetail(nestId);
  const { detail, loading, error, load } = ctrl;

  const tab = readNestDetailTab(searchParams.get('tab'));

  const tabs = useMemo(
    () =>
      detail
        ? [
            { id: 'overview' as const, label: 'Overview' },
            { id: 'manage' as const, label: 'Manage' },
            { id: 'eggs' as const, label: 'Eggs', count: detail.eggCount },
          ]
        : [],
    [detail],
  );

  function changeTab(next: NestDetailTab) {
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
          message={error || 'Nest not found'}
          backTo="/admin/nests"
          backLabel="Back to nests"
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <form onSubmit={(e) => void ctrl.save(e)} className="ds-nst-page">
        <div className="ds-nst-header-wrap">
          <NestDetailHeader
            detail={detail}
            fullAdmin={fullAdmin}
            onImport={fullAdmin ? () => setShowImport(true) : undefined}
          />
          <NestDetailTabNav tabs={tabs} active={tab} onChange={changeTab} />
        </div>

        {tab === 'overview' ? (
          <NestOverviewDashboard
            ctrl={ctrl}
            nav={{
              onManage: () => changeTab('manage'),
              onEggs: () => changeTab('eggs'),
            }}
          />
        ) : null}

        {tab === 'manage' ? (
          <>
            <NestManageDashboard ctrl={ctrl} fullAdmin={fullAdmin} />
            {fullAdmin ? <NestDetailSaveBar ctrl={ctrl} /> : null}
          </>
        ) : null}

        {tab === 'eggs' ? (
          <NestEggsDashboard
            ctrl={ctrl}
            fullAdmin={fullAdmin}
            onImport={() => setShowImport(true)}
          />
        ) : null}
      </form>

      {fullAdmin && showImport ? (
        <ImportEggModal
          defaultNestId={nestId}
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false);
            void load();
          }}
        />
      ) : null}
    </AdminLayout>
  );
}
