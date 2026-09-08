import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { AdminEditLoading } from '../../components/admin/AdminEditLayout';
import { AdminDetailNotFound } from '../../components/AdminDetailLayout';
import { EggConfigDashboard } from '../../components/admin/egg-detail/EggConfigDashboard';
import { EggDetailSaveBar } from '../../components/admin/egg-detail/EggDetailSaveBar';
import {
  EggDetailHeader,
  EggDetailTabNav,
} from '../../components/admin/egg-detail/EggDetailShell';
import { EggManageDashboard } from '../../components/admin/egg-detail/EggManageDashboard';
import { EggOverviewDashboard } from '../../components/admin/egg-detail/EggOverviewDashboard';
import { EggVariablesDashboard } from '../../components/admin/egg-detail/EggVariablesDashboard';
import { AdminLayout } from '../../components/Layout';
import { readEggDetailTab, type EggDetailTab } from './egg-detail/helpers';
import { useEggDetail } from './egg-detail/useEggDetail';

export function AdminEggDetail() {
  const { eggId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const ctrl = useEggDetail(eggId);
  const { detail, loading, error } = ctrl;

  const tab = readEggDetailTab(searchParams.get('tab'));

  const tabs = useMemo(
    () =>
      detail
        ? [
            { id: 'overview' as const, label: 'Overview' },
            { id: 'manage' as const, label: 'Manage' },
            { id: 'variables' as const, label: 'Variables', count: detail.variables.length },
            { id: 'config' as const, label: 'Config' },
          ]
        : [],
    [detail],
  );

  function changeTab(next: EggDetailTab) {
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
          message={error || 'Egg not found'}
          backTo="/admin/nests"
          backLabel="Back to nests"
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <form onSubmit={(e) => void ctrl.save(e)} className="ds-egg-page">
        <div className="ds-egg-header-wrap">
          <EggDetailHeader detail={detail} />
          <EggDetailTabNav tabs={tabs} active={tab} onChange={changeTab} />
        </div>

        {tab === 'overview' ? (
          <EggOverviewDashboard
            ctrl={ctrl}
            nav={{
              onManage: () => changeTab('manage'),
              onVariables: () => changeTab('variables'),
              onConfig: () => changeTab('config'),
            }}
          />
        ) : null}

        {tab === 'manage' ? (
          <>
            <EggManageDashboard ctrl={ctrl} />
            <EggDetailSaveBar ctrl={ctrl} />
          </>
        ) : null}

        {tab === 'variables' ? <EggVariablesDashboard ctrl={ctrl} /> : null}

        {tab === 'config' ? <EggConfigDashboard ctrl={ctrl} /> : null}
      </form>
    </AdminLayout>
  );
}
