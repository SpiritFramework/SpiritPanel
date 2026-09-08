import { useRef, useState } from 'react';
import { ConfirmModal } from '../../ConfirmModal';
import { useServerSubusers } from '../../../hooks/useServerSubusers';
import { SubusersHeader } from './SubusersHeader';
import { SubusersStatsRow } from './SubusersStatsRow';
import { SubusersInvitePanel } from './SubusersInvitePanel';
import { SubusersListPanel } from './SubusersListPanel';

export function ServerSubusersDashboard() {
  const sub = useServerSubusers();
  const [refreshing, setRefreshing] = useState(false);
  const inviteRef = useRef<HTMLDivElement>(null);

  async function handleRefresh() {
    setRefreshing(true);
    await sub.load();
    window.setTimeout(() => setRefreshing(false), 400);
  }

  function scrollToInvite() {
    inviteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const input = inviteRef.current?.querySelector('input[type="email"]');
    if (input instanceof HTMLInputElement) input.focus();
  }

  return (
    <>
      <div className="ds-srv-sub-shell">
        <SubusersHeader
          serverName={sub.server.name}
          eggName={sub.server.egg.name}
          eggLogoUrl={sub.server.egg.logoUrl}
          totalCount={sub.subusers.length}
          refreshing={refreshing}
          onRefresh={() => void handleRefresh()}
          onInvite={scrollToInvite}
        />

        <div className="ds-srv-sub-body">
          {!sub.loading ? (
            <SubusersStatsRow
              total={sub.subusers.length}
              avgPermissions={sub.avgPermissions}
              totalPermissionsGranted={sub.totalPermissionsGranted}
              catalogSize={sub.catalogSize}
            />
          ) : null}

          <div ref={inviteRef}>
            <SubusersInvitePanel
              email={sub.email}
              permissions={sub.permissions}
              adding={sub.adding}
              onEmailChange={sub.setEmail}
              onPermissionsChange={sub.setPermissions}
              onSubmit={() => void sub.addSubuser()}
            />
          </div>

          <SubusersListPanel
            loading={sub.loading}
            error={sub.loadError || sub.error}
            subusers={sub.subusers}
            filteredSubusers={sub.filteredSubusers}
            search={sub.search}
            hasSearch={sub.hasSearch}
            editingId={sub.editingId}
            editPermissions={sub.editPermissions}
            savingEdit={sub.savingEdit}
            onSearchChange={sub.setSearch}
            onToggleEdit={sub.toggleEdit}
            onCancelEdit={sub.cancelEdit}
            onEditPermissionsChange={sub.setEditPermissions}
            onSaveEdit={(id) => void sub.saveEdit(id)}
            onRemove={sub.setRemoveTarget}
          />
        </div>
      </div>

      <ConfirmModal
        open={sub.removeTarget !== null}
        title="Remove this subuser?"
        detail={sub.removeTarget?.user.email}
        description={`${sub.removeTarget?.user.username ?? 'This user'} will lose all access to this server immediately.`}
        confirmLabel="Remove subuser"
        tone="danger"
        loading={sub.removeLoading}
        onClose={() => sub.setRemoveTarget(null)}
        onConfirm={() => void sub.confirmRemove()}
      />
    </>
  );
}
