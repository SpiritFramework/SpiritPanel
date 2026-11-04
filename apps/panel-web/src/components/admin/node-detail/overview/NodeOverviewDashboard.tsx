import {
  Activity,
  ClipboardCopy,
  Cpu,
  Download,
  Fingerprint,
  Gauge,
  Globe,
  MapPin,
  Network,
  Server,
  ShieldCheck,
  Terminal,
  Wifi,
  WifiOff,
  Wrench,
} from 'lucide-react';
import type { AdminNodeDetail } from '../../../../lib/api';
import { parseWingsSystem } from '../../../../lib/node-admin';
import { NodeLimitSummary } from '../NodeResourceMeter';
import { NodeOverviewResourceRings } from './NodeOverviewResourceRings';
import { FeatherWingsVersionCard } from './FeatherWingsVersionCard';
import {
  NodeOverviewCopyField,
  NodeOverviewEndpoint,
  NodeOverviewOfflineBanner,
  NodeOverviewQuickDock,
  NodeOverviewSection,
  NodeOverviewSpec,
} from '../NodeDetailShell';
import { formatLocationLabel } from '../../../LocationFlag';
import { StatusPill } from '../../../ui';

type OverviewNav = {
  onDiagnostics: () => void;
  onAllocations: () => void;
  onServers: () => void;
  onAnalytics: () => void;
  downloadConfig: () => void;
  copyJoinData: () => void;
  copyText: (text: string) => void;
  copied: boolean;
};

export function NodeOverviewDashboard({
  detail,
  nav,
}: {
  detail: AdminNodeDetail;
  nav: OverviewNav;
}) {
  const wingsSystem = parseWingsSystem(detail.system);
  const wingsVersion =
    detail.system && typeof detail.system.version === 'string' ? detail.system.version : null;
  const freeAllocations = detail.allocationCount - detail.assignedAllocations;
  const portPercent =
    detail.allocationCount > 0
      ? Math.min(100, Math.round((detail.assignedAllocations / detail.allocationCount) * 100))
      : 0;

  const statusTone = detail.maintenanceMode ? 'warning' : detail.online ? 'success' : 'danger';
  const statusLabel = detail.maintenanceMode ? 'Maintenance' : detail.online ? 'Online' : 'Offline';
  const StatusIcon = detail.maintenanceMode ? Wrench : detail.online ? Wifi : WifiOff;

  const liveBadge = detail.liveUsage ? (
    <StatusPill
      label={`${detail.liveUsage.liveServerCount}/${detail.liveUsage.serverCount} live`}
      tone={detail.liveUsage.liveServerCount > 0 ? 'success' : 'neutral'}
      compact
    />
  ) : undefined;

  const dockItems = [
    { icon: ClipboardCopy, label: 'Join-data', hint: 'For featherwings configure', onClick: nav.copyJoinData },
    { icon: Download, label: 'Wings config', hint: 'Download YAML', onClick: nav.downloadConfig },
    { icon: ShieldCheck, label: 'Diagnostics', hint: 'Test connectivity', onClick: nav.onDiagnostics },
    {
      icon: Gauge,
      label: 'Allocations',
      hint: `${detail.allocationCount} ports`,
      onClick: nav.onAllocations,
    },
    {
      icon: Server,
      label: 'Servers',
      hint: `${detail.serverCount} deployed`,
      onClick: nav.onServers,
    },
    { icon: Activity, label: 'Analytics', hint: 'Live & history', onClick: nav.onAnalytics },
  ];

  return (
    <div className="ds-nd-ov">
      {!detail.online ? (
        <NodeOverviewOfflineBanner
          detail={detail}
          onDownloadConfig={nav.downloadConfig}
          onCopyJoinData={nav.copyJoinData}
        />
      ) : null}

      <section
        className={`ds-nd-ov-summary ds-nd-ov-summary--${detail.maintenanceMode ? 'maintenance' : detail.online ? 'online' : 'offline'}`}
        aria-label="Node status summary"
      >
        <div className="ds-nd-ov-summary-main">
          <span className="ds-nd-ov-summary-icon" aria-hidden>
            <StatusIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="ds-nd-ov-summary-title-row">
              <h2 className="ds-nd-ov-summary-title">{detail.name}</h2>
              <StatusPill label={statusLabel} tone={statusTone} compact pulse={detail.online && !detail.maintenanceMode} />
            </div>
            <p className="ds-nd-ov-summary-sub">
              {formatLocationLabel(detail.location)}
              <span aria-hidden> · </span>
              {detail.scheme.toUpperCase()}://{detail.fqdn}
              {detail.behindProxy ? <span aria-hidden> · proxied</span> : null}
            </p>
          </div>
        </div>

        <div className="ds-nd-ov-summary-metrics" role="list">
          <SummaryMetric icon={Server} label="Servers" value={String(detail.serverCount)} />
          <SummaryMetric
            icon={Network}
            label="Ports"
            value={
              detail.allocationCount > 0
                ? `${detail.assignedAllocations}/${detail.allocationCount}`
                : 'None'
            }
          />
          <SummaryMetric
            icon={MapPin}
            label="Region"
            value={detail.location.short || '—'}
          />
          <SummaryMetric
            icon={Cpu}
            label="Host"
            value={wingsSystem?.cpuCount ? `${wingsSystem.cpuCount} cores` : detail.online ? '—' : 'Offline'}
          />
        </div>
      </section>

      <NodeOverviewQuickDock items={dockItems} />

      <div className="ds-nd-ov-bento">
        <div className="ds-nd-ov-bento-main">
          <NodeOverviewSection
            icon={Gauge}
            title="Capacity & resources"
            description="Live usage from Wings and panel-assigned limits"
            badge={liveBadge}
            className="ds-nd-ov-card--capacity"
          >
            {detail.capacity ? (
              <>
                <NodeOverviewResourceRings capacity={detail.capacity} liveUsage={detail.liveUsage} />

                <div className="ds-nd-ov-capacity-footer">
                  <div className="ds-nd-ov-capacity-limits">
                    <p className="ds-nd-ov-capacity-label">Node limits</p>
                    <NodeLimitSummary
                      memory={detail.memory}
                      memoryOverallocate={detail.memoryOverallocate}
                      disk={detail.disk}
                      diskOverallocate={detail.diskOverallocate}
                    />
                  </div>

                  {detail.allocationCount > 0 ? (
                    <div className="ds-nd-ov-capacity-ports">
                      <div className="ds-nd-ov-ports-head">
                        <span>Port allocation</span>
                        <span className="ds-text-mono">{portPercent}%</span>
                      </div>
                      <div className="ds-progress" aria-hidden>
                        <div
                          className={`ds-progress-fill ds-progress-fill--${portPercent >= 90 ? 'bad' : portPercent >= 75 ? 'warn' : 'good'}`}
                          style={{ width: `${Math.max(portPercent > 0 ? 4 : 0, portPercent)}%` }}
                        />
                      </div>
                      <p className="ds-nd-ov-ports-meta">
                        {detail.assignedAllocations} assigned · {freeAllocations} available
                      </p>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="ds-text-sm ds-text-muted">No capacity data available for this node.</p>
            )}
          </NodeOverviewSection>
        </div>

        <div className="ds-nd-ov-bento-side">
          <FeatherWingsVersionCard
            installedVersion={wingsVersion}
            online={detail.online}
            onDownloadConfig={nav.downloadConfig}
            onCopyJoinData={nav.copyJoinData}
          />
        </div>
      </div>

      <div className="ds-nd-ov-grid-3">
        <NodeOverviewSection icon={Globe} title="Endpoints" description="How clients and Wings connect">
          <div className="ds-nd-ov-endpoint-grid">
            <NodeOverviewEndpoint label="FQDN" value={detail.fqdn} />
            <NodeOverviewEndpoint
              label="Panel API"
              value={`${detail.scheme}://${detail.fqdn}:${detail.daemonListen}`}
              mono
            />
            <NodeOverviewEndpoint label="SFTP" value={`${detail.fqdn}:${detail.daemonSftp}`} mono />
            <NodeOverviewEndpoint label="Data path" value={detail.daemonBase} mono />
            <NodeOverviewEndpoint label="Max upload" value={`${detail.uploadSize} MB`} />
            <NodeOverviewEndpoint label="Region" value={formatLocationLabel(detail.location)} />
          </div>
          <div className="ds-nd-ov-tags">
            {detail.behindProxy ? <span className="ds-nd-tag">Behind proxy</span> : null}
            {detail.maintenanceMode ? (
              <span className="ds-nd-tag ds-nd-tag--warn">
                <Wrench className="ds-icon ds-icon--sm" aria-hidden />
                Maintenance
              </span>
            ) : null}
            <span className="ds-nd-tag">{detail.scheme.toUpperCase()}</span>
          </div>
        </NodeOverviewSection>

        <NodeOverviewSection icon={Fingerprint} title="Identity" description="Panel identifiers for this node">
          <NodeOverviewCopyField
            label="Node UUID"
            value={detail.uuid}
            onCopy={() => nav.copyText(detail.uuid)}
            copied={nav.copied}
          />
          <NodeOverviewCopyField
            label="Token ID"
            value={detail.daemonTokenId}
            onCopy={() => nav.copyText(detail.daemonTokenId)}
            copied={nav.copied}
          />
          {detail.description ? (
            <div className="ds-nd-ov-notes">
              <span className="ds-nd-ov-notes-label">Notes</span>
              <p className="ds-nd-ov-notes-text">{detail.description}</p>
            </div>
          ) : (
            <p className="ds-nd-ov-notes-empty">No notes set for this node.</p>
          )}
        </NodeOverviewSection>

        <NodeOverviewSection
          icon={Cpu}
          title="Host system"
          description={wingsSystem ? 'Reported by FeatherWings' : 'Connect Wings to see host specs'}
        >
          {wingsSystem ? (
            <div className="ds-nd-ov-spec-grid">
              {wingsSystem.os ? <NodeOverviewSpec label="OS" value={wingsSystem.os} /> : null}
              {wingsSystem.architecture ? (
                <NodeOverviewSpec label="Architecture" value={wingsSystem.architecture} />
              ) : null}
              {wingsSystem.cpuCount ? <NodeOverviewSpec label="CPU cores" value={wingsSystem.cpuCount} /> : null}
              {wingsSystem.kernel ? <NodeOverviewSpec label="Kernel" value={wingsSystem.kernel} mono /> : null}
              {wingsSystem.dockerVersion ? (
                <NodeOverviewSpec label="Docker" value={wingsSystem.dockerVersion} mono />
              ) : null}
              {wingsVersion ? <NodeOverviewSpec label="Daemon" value={wingsVersion} mono /> : null}
            </div>
          ) : (
            <div className="ds-nd-ov-spec-empty">
              <Terminal className="h-5 w-5 opacity-40" aria-hidden />
              <p>Wings has not reported system information yet.</p>
            </div>
          )}
        </NodeOverviewSection>
      </div>
    </div>
  );
}

function SummaryMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Server;
  label: string;
  value: string;
}) {
  return (
    <div className="ds-nd-ov-summary-metric" role="listitem">
      <span className="ds-nd-ov-summary-metric-icon" aria-hidden>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="ds-nd-ov-summary-metric-copy">
        <span className="ds-nd-ov-summary-metric-label">{label}</span>
        <span className="ds-nd-ov-summary-metric-value">{value}</span>
      </span>
    </div>
  );
}
