import {
  Activity,
  Cpu,
  Download,
  Gauge,
  HardDrive,
  MapPin,
  Network,
  Server,
  ShieldCheck,
  Terminal,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { NodeCapacityChips } from '../../../components/admin/AdminResourceUsage';
import { NodeCapacityOverview } from '../../../components/admin/NodeCapacityOverview';
import {
  AdminInfoRow,
  AdminMetaRow,
  AdminSettingsPanel,
} from '../../../components/AdminDetailLayout';
import { Button } from '../../../components/Layout';
import { nodeHeroGradient, parseWingsSystem } from '../../../lib/node-admin';
import type { NodeDetailController } from './useNodeDetail';

export function NodeDetailOverviewTab({
  ctrl,
  onDiagnostics,
  onAllocations,
  onServers,
  onAnalytics,
}: {
  ctrl: NodeDetailController;
  onDiagnostics: () => void;
  onAllocations: () => void;
  onServers: () => void;
  onAnalytics: () => void;
}) {
  const { detail, copied, copyText, downloadConfig } = ctrl;
  if (!detail) return null;

  const wingsSystem = parseWingsSystem(detail.system);
  const wingsVersion =
    detail.system && typeof detail.system.version === 'string' ? detail.system.version : null;
  const freeAllocations = detail.allocationCount - detail.assignedAllocations;
  const createdLabel = new Date(detail.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="node-edit-overview">
      <div className="node-edit-status-grid">
        <div
          className={`node-edit-status-card ${
            detail.maintenanceMode
              ? 'node-edit-status-card--maintenance'
              : detail.online
                ? 'node-edit-status-card--online'
                : 'node-edit-status-card--offline'
          }`}
        >
          <div className="node-edit-status-card-head">
            {detail.online && !detail.maintenanceMode ? (
              <Wifi className="h-5 w-5" />
            ) : (
              <WifiOff className="h-5 w-5" />
            )}
            <span className="node-edit-status-card-label">Daemon status</span>
          </div>
          <p className="node-edit-status-card-value">
            {detail.maintenanceMode ? 'Maintenance' : detail.online ? 'Online' : 'Offline'}
          </p>
          <p className="node-edit-status-card-hint">
            {detail.maintenanceMode
              ? 'New deployments blocked'
              : detail.online
                ? wingsVersion ?? 'FeatherWings connected'
                : 'Panel cannot reach Wings'}
          </p>
        </div>

        <div className="node-edit-status-card">
          <div className="node-edit-status-card-head">
            <Server className="h-5 w-5" />
            <span className="node-edit-status-card-label">Fleet</span>
          </div>
          <p className="node-edit-status-card-value">{detail.serverCount} servers</p>
          <p className="node-edit-status-card-hint">
            {detail.assignedAllocations}/{detail.allocationCount} ports assigned · {freeAllocations} free
          </p>
        </div>

        <div className="node-edit-status-card">
          <div className="node-edit-status-card-head">
            <MapPin className="h-5 w-5" />
            <span className="node-edit-status-card-label">Region</span>
          </div>
          <p className="node-edit-status-card-value">{detail.location.short}</p>
          <p className="node-edit-status-card-hint truncate">{detail.location.long}</p>
        </div>
      </div>

      <div className="node-edit-action-bar">
        <Button type="button" variant="ghost" onClick={downloadConfig}>
          <Download className="h-3.5 w-3.5" />
          Wings config
        </Button>
        <Button type="button" variant="ghost" onClick={onDiagnostics}>
          <ShieldCheck className="h-3.5 w-3.5" />
          Diagnostics
        </Button>
        <Button type="button" variant="ghost" onClick={onAllocations}>
          <Gauge className="h-3.5 w-3.5" />
          Allocations
        </Button>
        <Button type="button" variant="ghost" onClick={onServers}>
          <Server className="h-3.5 w-3.5" />
          Servers
        </Button>
        <Button type="button" variant="ghost" onClick={onAnalytics}>
          <Activity className="h-3.5 w-3.5" />
          Analytics
        </Button>
      </div>

      <div className="node-edit-overview-grid">
        <AdminSettingsPanel
          title="Resource capacity"
          description="RAM and disk allocated across all servers on this node"
          icon={HardDrive}
        >
          {detail.capacity ? (
            <NodeCapacityOverview
              capacity={detail.capacity}
              serverCount={detail.serverCount}
              assignedAllocations={detail.assignedAllocations}
              allocationCount={detail.allocationCount}
            />
          ) : (
            <p className="text-xs text-[var(--muted)]">No capacity limits configured.</p>
          )}
          {detail.capacity && (
            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <NodeCapacityChips capacity={detail.capacity} />
            </div>
          )}
        </AdminSettingsPanel>

        <div className="node-edit-side-stack">
          <AdminSettingsPanel title="Connection endpoints" description="How the panel and users reach this daemon" icon={Network}>
            <div className="node-edit-endpoint-list">
              <EndpointCard label="FQDN" value={detail.fqdn} />
              <EndpointCard label="Panel API" value={`${detail.scheme}://${detail.fqdn}:${detail.daemonListen}`} />
              <EndpointCard label="SFTP" value={`${detail.fqdn}:${detail.daemonSftp}`} />
              <EndpointCard label="Data path" value={detail.daemonBase} mono />
              <EndpointCard label="Max upload" value={`${detail.uploadSize} MB`} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {detail.behindProxy && (
                <span className="node-edit-tag">Behind proxy</span>
              )}
              <span className="node-edit-tag">{detail.scheme.toUpperCase()}</span>
            </div>
          </AdminSettingsPanel>

          <AdminSettingsPanel title="Node identity" description="Identifiers and metadata" icon={Terminal}>
            <AdminMetaRow
              label="Node UUID"
              value={detail.uuid}
              mono
              truncate
              copy={() => void copyText(detail.uuid)}
              copied={copied}
            />
            <AdminMetaRow
              label="Token ID"
              value={detail.daemonTokenId}
              mono
              truncate
              copy={() => void copyText(detail.daemonTokenId)}
              copied={copied}
            />
            <p className="mt-3 text-[10px] text-[var(--muted)]">Created {createdLabel}</p>
          </AdminSettingsPanel>

          {wingsSystem && (
            <AdminSettingsPanel title="Host system" description="Live stats from FeatherWings" icon={Cpu}>
              <dl className="grid gap-3 sm:grid-cols-2">
                {wingsSystem.version && <AdminInfoRow label="Wings version" value={wingsSystem.version} />}
                {wingsSystem.os && <AdminInfoRow label="OS" value={wingsSystem.os} />}
                {wingsSystem.architecture && <AdminInfoRow label="Architecture" value={wingsSystem.architecture} />}
                {wingsSystem.cpuCount && <AdminInfoRow label="CPU cores" value={wingsSystem.cpuCount} />}
                {wingsSystem.kernel && <AdminInfoRow label="Kernel" value={wingsSystem.kernel} mono truncate />}
                {wingsSystem.dockerVersion && (
                  <AdminInfoRow label="Docker" value={wingsSystem.dockerVersion} mono truncate />
                )}
              </dl>
            </AdminSettingsPanel>
          )}
        </div>
      </div>

      {!detail.online && (
        <div className="node-edit-offline-banner">
          <WifiOff className="h-4 w-4 shrink-0" />
          <p>
            Wings is not reachable. Download the config, ensure FeatherWings is running, and open ports{' '}
            <strong>{detail.daemonListen}</strong> (API) and <strong>{detail.daemonSftp}</strong> (SFTP).
          </p>
        </div>
      )}

      <div
        className="node-edit-hero-accent hidden"
        aria-hidden
        style={{ background: nodeHeroGradient(detail) }}
      />
    </div>
  );
}

function EndpointCard({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="node-edit-endpoint">
      <span className="node-edit-endpoint-label">{label}</span>
      <span className={`node-edit-endpoint-value${mono ? ' font-mono' : ''}`}>{value}</span>
    </div>
  );
}
