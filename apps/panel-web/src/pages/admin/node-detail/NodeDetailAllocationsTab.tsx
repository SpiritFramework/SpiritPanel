import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gauge, Network, Trash2 } from 'lucide-react';
import { formatAllocationAddress } from '../../../lib/allocation';
import type { AdminNodeDetail } from '../../../lib/api';
import { NodeDetailPanel } from '../../../components/admin/node-detail/NodeDetailPanel';
import { AdminFormStatus } from '../../../components/AdminDetailLayout';
import { Button, Input } from '../../../components/Layout';
import { EmptyState } from '../../../components/ui';
import type { NodeDetailController } from './useNodeDetail';

function allocChipClass(alloc: AdminNodeDetail['allocations'][number]) {
  if (alloc.isPrimary) return 'ds-nd-alloc-chip ds-nd-alloc-chip--primary';
  if (alloc.assigned) return 'ds-nd-alloc-chip ds-nd-alloc-chip--assigned';
  return 'ds-nd-alloc-chip ds-nd-alloc-chip--free';
}

function allocStatusLabel(alloc: AdminNodeDetail['allocations'][number]) {
  if (alloc.isPrimary) return 'Primary';
  if (alloc.assigned) return 'Assigned';
  return 'Available';
}

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

  return (
    <tr>
      <td>
        {!alloc.assigned ? (
          <input
            type="checkbox"
            checked={selected}
            disabled={saving}
            onChange={(e) => onToggleSelect(alloc.id, e.target.checked)}
            className="h-3.5 w-3.5 rounded border-[var(--border)] accent-[var(--accent)]"
            aria-label={`Select ${alloc.ip}:${alloc.port}`}
          />
        ) : null}
      </td>
      <td className="font-mono">{formatAllocationAddress(alloc, { fqdn })}</td>
      <td className="font-mono ds-text-muted">{alloc.ip}:{alloc.port}</td>
      <td>
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
      <td>
        <span className={allocChipClass(alloc)}>{allocStatusLabel(alloc)}</span>
      </td>
      <td>
        {alloc.server ? (
          <Link to={`/admin/servers/${alloc.server.id}`} className="text-xs hover:text-[var(--accent-hover)]">
            {alloc.server.name}
          </Link>
        ) : (
          <span className="ds-text-muted">—</span>
        )}
      </td>
      <td className="text-right">
        {!alloc.assigned ? (
          <Button variant="ghost" size="sm" disabled={saving} onClick={() => onDelete(alloc.id)}>
            <Trash2 className="h-3.5 w-3.5 text-red-400" />
          </Button>
        ) : null}
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

  return (
    <div className="ds-nd-alloc-mobile">
      <div className="flex items-center gap-2">
        {!alloc.assigned ? (
          <input
            type="checkbox"
            checked={selected}
            disabled={saving}
            onChange={(e) => onToggleSelect(alloc.id, e.target.checked)}
            className="h-3.5 w-3.5 rounded accent-[var(--accent)]"
          />
        ) : (
          <span className="w-3.5" />
        )}
        <span className="font-mono text-sm font-semibold">{alloc.port}</span>
        <span className={allocChipClass(alloc)}>{allocStatusLabel(alloc)}</span>
      </div>
      <p className="mt-1 font-mono text-[11px] ds-text-muted">{formatAllocationAddress(alloc, { fqdn })}</p>
      {alloc.server ? (
        <Link to={`/admin/servers/${alloc.server.id}`} className="mt-1 block text-xs hover:text-[var(--accent-hover)]">
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
        {!alloc.assigned ? (
          <Button variant="ghost" size="sm" disabled={saving} onClick={() => onDelete(alloc.id)}>
            <Trash2 className="h-3.5 w-3.5 text-red-400" />
          </Button>
        ) : null}
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
    <div className="ds-nd-body">
      <NodeDetailPanel title="Create allocations" description="Bind IP addresses and port ranges" icon={Gauge}>
        <div className="ds-nd-alloc-create">
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
        {allocNotice ? <p className="ds-nd-notice ds-nd-notice--success">{allocNotice}</p> : null}
        <AdminFormStatus error={error} />
      </NodeDetailPanel>

      <NodeDetailPanel
        title={`Port assignments (${detail.allocations.length})`}
        description="Grouped by bind IP — assigned ports cannot be deleted until unassigned"
        icon={Network}
      >
        {detail.allocations.length === 0 ? (
          <EmptyState title="No allocations" description="Create a port range to assign servers." />
        ) : (
          <div className="space-y-4">
            <div className="ds-nd-alloc-toolbar">
              <p className="ds-text-xs ds-text-muted">
                {selectedFreeCount > 0
                  ? `${selectedFreeCount} unassigned port(s) selected`
                  : 'Select free ports to bulk delete'}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={saving || selectedFreeCount === 0}
                  onClick={() => void deleteSelectedAllocations()}
                >
                  Delete selected ({selectedFreeCount})
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
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
                <div key={group.ip} className="ds-nd-alloc-group">
                  <div className="ds-nd-alloc-group-head">
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="checkbox"
                        checked={allFreeSelected}
                        disabled={saving || freeIds.length === 0}
                        onChange={(e) => toggleIpSelection(group.ip, e.target.checked)}
                        className="h-3.5 w-3.5 rounded accent-[var(--accent)]"
                        aria-label={`Select all free allocations on ${group.ip}`}
                      />
                      <div>
                        <p className="font-mono text-sm font-semibold">{group.ip}</p>
                        <p className="ds-text-xs ds-text-muted">
                          {group.total} total · {group.free} free · {group.assigned} assigned
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={saving || group.free === 0}
                      onClick={() => void deleteFreeOnIp(group.ip, group.free, group.assigned)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5 text-red-400" />
                      Delete free
                    </Button>
                  </div>

                  <div className="ds-nd-port-pills md:hidden">
                    {group.allocations.map((alloc) => {
                      const pillClass = alloc.isPrimary
                        ? 'ds-nd-port-pill ds-nd-port-pill--primary'
                        : alloc.assigned
                          ? 'ds-nd-port-pill ds-nd-port-pill--assigned'
                          : 'ds-nd-port-pill ds-nd-port-pill--free';
                      return (
                        <span key={alloc.id} className={pillClass} title={alloc.server?.name}>
                          {alloc.port}
                        </span>
                      );
                    })}
                  </div>

                  <div className="ds-nd-alloc-table-wrap hidden md:block">
                    <table className="ds-nd-alloc-table">
                      <thead>
                        <tr>
                          <th />
                          <th>Hostname</th>
                          <th>Bind</th>
                          <th>Alias</th>
                          <th>Status</th>
                          <th>Server</th>
                          <th />
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

                  <div className="md:hidden">
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
      </NodeDetailPanel>
    </div>
  );
}
