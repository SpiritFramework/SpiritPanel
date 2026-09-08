import { useState } from 'react';
import { ConfirmModal } from '../../ConfirmModal';
import { useServerNetwork } from '../../../hooks/useServerNetwork';
import { NetworkHeader } from './NetworkHeader';
import { NetworkStatsRow } from './NetworkStatsRow';
import { NetworkConnectPanel } from './NetworkConnectPanel';
import { NetworkDomainPanel } from './NetworkDomainPanel';
import { NetworkListPanel } from './NetworkListPanel';

export function ServerNetworkDashboard() {
  const net = useServerNetwork();
  const [refreshing, setRefreshing] = useState(false);

  const canCreateUi = net.access.canCreateAllocations && net.canCreate;

  async function handleRefresh() {
    setRefreshing(true);
    await net.load();
    window.setTimeout(() => setRefreshing(false), 400);
  }

  return (
    <>
      <div className="ds-srv-net-shell">
        <NetworkHeader
          serverName={net.server.name}
          eggName={net.server.egg.name}
          eggLogoUrl={net.server.egg.logoUrl}
          used={net.used}
          limit={net.limit}
          refreshing={refreshing}
          canCreate={canCreateUi}
          atLimit={net.atLimit}
          creating={net.working === 'create'}
          onRefresh={() => void handleRefresh()}
          onCreate={() => void net.handleAutoAssign()}
        />

        <div className="ds-srv-net-body">
          {!net.loading ? (
            <>
              <NetworkStatsRow
                used={net.used}
                limit={net.limit}
                slotsLeft={net.slotsLeft}
                usagePercent={net.usagePercent}
                primaryPort={net.primary?.port ?? null}
                additionalCount={net.additionalCount}
                atLimit={net.atLimit}
              />

              <NetworkConnectPanel
                joinAddress={net.joinAddress}
                connection={net.connection}
                primaryPort={net.primary?.port ?? null}
                defaultPort={net.server.defaultAllocation.port}
                nodeName={net.server.node.name}
                nodeFqdn={net.server.node.fqdn ?? net.connection?.node.fqdn}
                copiedKey={net.copiedKey}
                onCopy={(text, key) => void net.copyText(text, key)}
              />

              {net.domainInfo ? (
                <NetworkDomainPanel
                  domainInfo={net.domainInfo}
                  slugDraft={net.slugDraft}
                  previewFqdn={net.previewFqdn}
                  baseDomain={net.baseDomain}
                  working={net.working}
                  access={net.access}
                  onSlugChange={net.sanitizeSlug}
                  onSave={() => void net.handleSaveDomain()}
                  onPrefer={(prefer) => void net.handlePrefer(prefer)}
                  onDelete={() => net.setDeleteDomainOpen(true)}
                />
              ) : null}
            </>
          ) : null}

          <NetworkListPanel
            loading={net.loading}
            error={net.error}
            allocations={net.allocations}
            filteredAllocations={net.filteredAllocations}
            search={net.search}
            filter={net.filter}
            hasActiveFilters={net.hasActiveFilters}
            limit={net.limit}
            canCreateFromApi={net.canCreate}
            working={net.working}
            copiedKey={net.copiedKey}
            access={net.access}
            onSearchChange={net.setSearch}
            onFilterChange={net.setFilter}
            onCreate={() => void net.handleAutoAssign()}
            onCopy={(text, key) => void net.copyText(text, key)}
            onSetPrimary={(id) => void net.handleSetPrimary(id)}
            onDelete={(alloc) => net.setDeleteTarget({ id: alloc.id, address: alloc.address })}
          />
        </div>
      </div>

      <ConfirmModal
        open={net.deleteTarget !== null}
        title="Remove this allocation?"
        detail={net.deleteTarget?.address}
        description="This unassigns the port from your server. Restart the server for binding changes to take effect on the running container."
        confirmLabel="Remove allocation"
        tone="warning"
        loading={net.deleteLoading}
        onClose={() => net.setDeleteTarget(null)}
        onConfirm={() => void net.confirmDeleteAllocation()}
      />

      <ConfirmModal
        open={net.deleteDomainOpen}
        title="Remove subdomain?"
        description="This deletes the Cloudflare DNS record. Players using the subdomain will stop connecting until you create a new one."
        confirmLabel="Remove subdomain"
        tone="warning"
        loading={net.deleteLoading}
        onClose={() => net.setDeleteDomainOpen(false)}
        onConfirm={() => void net.confirmDeleteDomain()}
      />
    </>
  );
}
