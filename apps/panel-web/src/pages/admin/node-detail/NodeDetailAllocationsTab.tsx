import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gauge, Network, Trash2 } from 'lucide-react';
import { formatAllocationAddress } from '../../../lib/allocation';
import type { AdminNodeDetail } from '../../../lib/api';
import { AdminFormStatus, AdminSettingsPanel } from '../../../components/AdminDetailLayout';
import { Button, Input } from '../../../components/Layout';
import { EmptyState } from '../../../components/ui';
import type { NodeDetailController } from './useNodeDetail';

function AllocationTableRow({
  alloc,
  fqdn,
  saving,
  selected,
  onToggleSelect,
  onSaveAlias,
  onDelete,
}: {
  alloc: AdminNodeDetail['allocations'][number];
  fqdn: string;
  saving: boolean;
  selected: boolean;
  onToggleSelect: (id: string, checked: boolean) => void;
  onSaveAlias: (id: string, alias: string) => void;
  onDelete: (id: string) => void;
}) {
  const [alias, setAlias] = useState(alloc.alias ?? '');
  useEffect(() => {
    setAlias(alloc.alias ?? '');
  }, [alloc.alias]);

  const aliasChanged = (alloc.alias ?? '') !== alias.trim();
  const statusLabel = alloc.isPrimary ? 'Primary' : alloc.assigned ? 'Assigned' : 'Available';
  const statusClass = alloc.isPrimary
    ? 'node-edit-alloc-chip--primary'
    : alloc.assigned
      ? 'node-edit-alloc-chip--assigned'
      : 'node-edit-alloc-chip--free';

  return (
    <tr className="node-edit-alloc-row">
      <td className="px-3 py-2.5">
        {!alloc.assigned ? (
          <input
            type="checkbox"
            checked={selected}
            disabled={saving}
            onChange={(e) => onToggleSelect(alloc.id, e.target.checked)}
            className="h-3.5 w-3.5 rounded border-[var(--border)] bg-[var(--bg-elevated)] accent-[var(--accent)]"
            aria-label={`Select ${alloc.ip}:${alloc.port}`}
          />
        ) : null}
      </td>
      <td className="px-3 py-2.5 font-mono text-xs">{formatAllocationAddress(alloc, { fqdn })}</td>
      <td className="px-3 py-2.5 font-mono text-xs text-[var(--muted)]">
        {alloc.ip}:{alloc.port}
      </td>
      <td className="px-3 py-2.5">
        <Input
          value={alias}
          placeholder="—"
          onChange={(e) => setAlias(e.target.value)}
          onBlur={() => aliasChanged && onSaveAlias(alloc.id, alias)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (aliasChanged) onSaveAlias(alloc.id, alias);
            }
          }}
          className="h-7 py-1 text-[11px]"
        />
      </td>
      <td className="px-3 py-2.5">
        <span className={`node-edit-alloc-chip ${statusClass}`}>{statusLabel}</span>
      </td>
      <td className="px-3 py-2.5">
        {alloc.server ? (
          <Link to={`/admin/servers/${alloc.server.id}`} className="text-xs hover:accent-text">
            {alloc.server.name}
          </Link>
        ) : (
          <span className="text-[var(--muted)]">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-right">
        {!alloc.assigned && (
          <Button variant="ghost" disabled={saving} onClick={() => onDelete(alloc.id)}>
            <Trash2 className="h-3.5 w-3.5 text-red-400" />
          </Button>
        )}
      </td>
    </tr>
  );
}

function AllocationMobileCard({
  alloc,
  fqdn,
  saving,
  selected,
  onToggleSelect,
  onSaveAlias,
  onDelete,
}: {
  alloc: AdminNodeDetail['allocations'][number];
  fqdn: string;
  saving: boolean;
  selected: boolean;
  onToggleSelect: (id: string, checked: boolean) => void;
  onSaveAlias: (id: string, alias: string) => void;
  onDelete: (id: string) => void;
}) {
  const [alias, setAlias] = useState(alloc.alias ?? '');
  useEffect(() => {
    setAlias(alloc.alias ?? '');
  }, [alloc.alias]);

  const aliasChanged = (alloc.alias ?? '') !== alias.trim();
  const statusLabel = alloc.isPrimary ? 'Primary' : alloc.assigned ? 'Assigned' : 'Available';
  const statusClass = alloc.isPrimary
    ? 'node-edit-alloc-chip--primary'
    : alloc.assigned
      ? 'node-edit-alloc-chip--assigned'
      : 'node-edit-alloc-chip--free';

  return (
    <div className="node-edit-alloc-mobile">
      <div className="node-edit-alloc-mobile-head">
        {!alloc.assigned ? (
          <input
            type="checkbox"
            checked={selected}
            disabled={saving}
            onChange={(e) => onToggleSelect(alloc.id, e.target.checked)}
            className="h-3.5 w-3.5 rounded border-[var(--border)] accent-[var(--accent)]"
          />
        ) : (
          <span className="w-3.5" />
        )}
        <span className="font-mono text-sm font-medium">{alloc.port}</span>
        <span className={`node-edit-alloc-chip ${statusClass}`}>{statusLabel}</span>
      </div>
      <p className="mt-1 font-mono text-[11px] text-[var(--muted)]">
        {formatAllocationAddress(alloc, { fqdn })}
      </p>
      {alloc.server ? (
        <Link to={`/admin/servers/${alloc.server.id}`} className="mt-1 block text-xs hover:accent-text">
          {alloc.server.name}
        </Link>
      ) : null}
      <div className="mt-2 flex items-center gap-2">
        <Input
          value={alias}
          placeholder="Alias"
          onChange={(e) => setAlias(e.target.value)}
          onBlur={() => aliasChanged && onSaveAlias(alloc.id, alias)}
          className="h-7 flex-1 py-1 text-[11px]"
        />
        {!alloc.assigned && (
          <Button variant="ghost" disabled={saving} onClick={() => onDelete(alloc.id)}>
            <Trash2 className="h-3.5 w-3.5 text-red-400" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function NodeDetailAllocationsTab({ ctrl }: { ctrl: NodeDetailController }) {
  const {
    detail,
    saving,
    error,
    allocForm,
    setAllocForm,
    allocNotice,
    selectedAllocIds,
    setSelectedAllocIds,
    allocationGroups,
    selectedFreeCount,
    createAllocations,
    saveAllocationAlias,
    deleteAllocation,
    toggleAllocationSelection,
    toggleIpSelection,
    deleteFreeOnIp,
    deleteSelectedAllocations,
  } = ctrl;

  if (!detail) return null;

  return (
    <div className="node-edit-allocations space-y-5">
      <AdminSettingsPanel
        title="Create allocations"
        description="Bind IP addresses and port ranges for game servers"
        icon={Gauge}
      >
        <div className="node-edit-alloc-create">
          <Input
            label="Bind IP"
            value={allocForm.ip}
            onChange={(e) => setAllocForm({ ...allocForm, ip: e.target.value })}
            required
            hint="0.0.0.0 or a public IP on this host"
          />
          <Input
            label="Ports"
            value={allocForm.ports}
            onChange={(e) => setAllocForm({ ...allocForm, ports: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void createAllocations();
              }
            }}
            required
            hint="25565, 25565-25585, or mixed lists"
          />
          <div className="flex items-end">
            <Button type="button" disabled={saving} onClick={() => void createAllocations()}>
              Create allocations
            </Button>
          </div>
        </div>
        {allocNotice && <p className="node-edit-notice node-edit-notice--success">{allocNotice}</p>}
        <AdminFormStatus error={error} />
      </AdminSettingsPanel>

      <AdminSettingsPanel
        title={`Port assignments (${detail.allocations.length})`}
        description="Grouped by bind IP — assigned ports cannot be deleted until unassigned"
        icon={Network}
      >
        {detail.allocations.length === 0 ? (
          <EmptyState title="No allocations" description="Create a port range to assign servers." />
        ) : (
          <div className="space-y-4">
            <div className="node-edit-alloc-toolbar">
              <p className="text-[11px] text-[var(--muted)]">
                {selectedFreeCount > 0
                  ? `${selectedFreeCount} unassigned port(s) selected`
                  : 'Select free ports to bulk delete'}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={saving || selectedFreeCount === 0}
                  onClick={() => void deleteSelectedAllocations()}
                >
                  Delete selected ({selectedFreeCount})
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={saving || selectedAllocIds.length === 0}
                  onClick={() => setSelectedAllocIds([])}
                >
                  Clear
                </Button>
              </div>
            </div>

            {allocationGroups.map((group) => {
              const freeIds = group.allocations.filter((row) => !row.assigned).map((row) => row.id);
              const selectedInGroup = freeIds.filter((id) => selectedAllocIds.includes(id)).length;
              const allFreeSelected = freeIds.length > 0 && selectedInGroup === freeIds.length;

              return (
                <div key={group.ip} className="node-edit-alloc-group">
                  <div className="node-edit-alloc-group-head">
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="checkbox"
                        checked={allFreeSelected}
                        disabled={saving || freeIds.length === 0}
                        onChange={(e) => toggleIpSelection(group.ip, e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-[var(--border)] accent-[var(--accent)]"
                        aria-label={`Select all free allocations on ${group.ip}`}
                      />
                      <div>
                        <p className="font-mono text-sm font-semibold">{group.ip}</p>
                        <p className="text-[11px] text-[var(--muted)]">
                          {group.total} total · {group.free} free · {group.assigned} assigned
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={saving || group.free === 0}
                      onClick={() => void deleteFreeOnIp(group.ip, group.free, group.assigned)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5 text-red-400" />
                      Delete free
                    </Button>
                  </div>

                  <div className="node-edit-alloc-port-grid md:hidden">
                    {group.allocations.map((alloc) => {
                      const statusClass = alloc.isPrimary
                        ? 'node-edit-port-pill--primary'
                        : alloc.assigned
                          ? 'node-edit-port-pill--assigned'
                          : 'node-edit-port-pill--free';
                      return (
                        <span key={alloc.id} className={`node-edit-port-pill ${statusClass}`} title={alloc.server?.name}>
                          {alloc.port}
                        </span>
                      );
                    })}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                          <th className="px-3 py-2 font-medium" />
                          <th className="px-3 py-2 font-medium">Hostname</th>
                          <th className="px-3 py-2 font-medium">Bind</th>
                          <th className="px-3 py-2 font-medium">Alias</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                          <th className="px-3 py-2 font-medium">Server</th>
                          <th className="px-3 py-2 font-medium" />
                        </tr>
                      </thead>
                      <tbody>
                        {group.allocations.map((alloc) => (
                          <AllocationTableRow
                            key={alloc.id}
                            alloc={alloc}
                            fqdn={detail.fqdn}
                            saving={saving}
                            selected={selectedAllocIds.includes(alloc.id)}
                            onToggleSelect={toggleAllocationSelection}
                            onSaveAlias={saveAllocationAlias}
                            onDelete={deleteAllocation}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-2 p-3 md:hidden">
                    {group.allocations.map((alloc) => (
                      <AllocationMobileCard
                        key={alloc.id}
                        alloc={alloc}
                        fqdn={detail.fqdn}
                        saving={saving}
                        selected={selectedAllocIds.includes(alloc.id)}
                        onToggleSelect={toggleAllocationSelection}
                        onSaveAlias={saveAllocationAlias}
                        onDelete={deleteAllocation}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AdminSettingsPanel>
    </div>
  );
}
