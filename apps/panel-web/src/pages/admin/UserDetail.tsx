import { useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { ApiKeysPanel } from '../../components/ApiKeysPanel';
import { AdminEditLoading } from '../../components/admin/AdminEditLayout';
import { AdminDetailNotFound } from '../../components/AdminDetailLayout';
import { UserAccountDashboard } from '../../components/admin/user-detail/UserAccountDashboard';
import { UserActivityDashboard } from '../../components/admin/user-detail/UserActivityDashboard';
import { UserDetailSaveBar } from '../../components/admin/user-detail/UserDetailSaveBar';
import {
  UserDetailHeader,
  UserDetailTabNav,
} from '../../components/admin/user-detail/UserDetailShell';
import { UserOverviewDashboard } from '../../components/admin/user-detail/UserOverviewDashboard';
import { UserServersDashboard } from '../../components/admin/user-detail/UserServersDashboard';
import { AdminLayout } from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { isFullPanelAdmin } from '../../lib/roles';
import { readUserDetailTab, type UserDetailTab } from './user-detail/helpers';
import { useUserDetail } from './user-detail/useUserDetail';

export function AdminUserDetail() {
  const { userId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  const fullAdmin = isFullPanelAdmin(currentUser);
  const isSelf = userId === currentUser?.id;

  const ctrl = useUserDetail(userId);
  const { detail, loading, error, loadKeys, userKeys, keysLoading, creatingKey, setCreatingKey, load } =
    ctrl;

  const tab = readUserDetailTab(searchParams.get('tab'));

  useEffect(() => {
    if (tab === 'keys') void loadKeys();
  }, [tab, loadKeys]);

  const tabs = useMemo(
    () =>
      detail
        ? [
            { id: 'overview' as const, label: 'Overview' },
            { id: 'account' as const, label: 'Manage' },
            {
              id: 'servers' as const,
              label: 'Servers',
              count: detail.serverCount + detail.subuserCount,
            },
            { id: 'keys' as const, label: 'API keys', count: detail.apiKeyCount },
            { id: 'activity' as const, label: 'Activity', count: detail.activityCount },
          ]
        : [],
    [detail],
  );

  function changeTab(next: UserDetailTab) {
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
          message={error || 'User not found'}
          backTo="/admin/users"
          backLabel="Back to users"
        />
      </AdminLayout>
    );
  }

  const targetIsAdmin = detail.role === 'admin' || detail.rootAdmin || detail.role === 'staff';

  return (
    <AdminLayout>
      <form onSubmit={(e) => void ctrl.save(e)} className="ds-ud-page">
        <div className="ds-ud-header-wrap">
          <UserDetailHeader
            detail={detail}
            isSelf={isSelf}
            onCopyEmail={() => void ctrl.copyText(detail.email, 'email')}
            copied={ctrl.copied === 'email'}
          />
          <UserDetailTabNav tabs={tabs} active={tab} onChange={changeTab} />
        </div>

        {tab === 'overview' ? (
          <UserOverviewDashboard
            ctrl={ctrl}
            nav={{
              onAccount: () => changeTab('account'),
              onServers: () => changeTab('servers'),
              onKeys: () => changeTab('keys'),
              onActivity: () => changeTab('activity'),
            }}
          />
        ) : null}

        {tab === 'account' ? (
          <>
            <UserAccountDashboard ctrl={ctrl} fullAdmin={fullAdmin} isSelf={isSelf} />
            <UserDetailSaveBar ctrl={ctrl} fullAdmin={fullAdmin} />
          </>
        ) : null}

        {tab === 'servers' ? <UserServersDashboard ctrl={ctrl} /> : null}

        {tab === 'keys' ? (
          <div className="ds-ud-keys">
            <ApiKeysPanel
              title={`API keys for @${detail.username}`}
              description={
                !fullAdmin
                  ? 'API keys for this user (view only).'
                  : targetIsAdmin
                    ? 'Manage account and application API keys for this admin user.'
                    : 'Manage account API keys for this user.'
              }
              apiBase={targetIsAdmin ? '/api/client or /api/application' : '/api/client'}
              keys={userKeys}
              loading={keysLoading}
              creating={creatingKey}
              onRefresh={async () => {
                await loadKeys();
                await load();
              }}
              allowApplicationKeys={fullAdmin && targetIsAdmin}
              onCreate={async ({ memo, keyType }) => {
                if (!fullAdmin) throw new Error('Only full admins can create API keys');
                setCreatingKey(true);
                try {
                  return await api.admin.createUserApiKey(userId, { memo, keyType });
                } finally {
                  setCreatingKey(false);
                }
              }}
              onDelete={async (keyId) => {
                if (!fullAdmin) throw new Error('Only full admins can revoke API keys');
                await api.admin.deleteUserApiKey(userId, keyId);
              }}
            />
          </div>
        ) : null}

        {tab === 'activity' ? <UserActivityDashboard ctrl={ctrl} /> : null}
      </form>
    </AdminLayout>
  );
}
