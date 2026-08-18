import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Cpu,
  Download,
  Gauge,
  Network,
  Server,
  ShieldCheck,
  Terminal,
  Wifi,
  WifiOff,
  Wrench,
} from 'lucide-react';
import type { AdminNodeDetail } from '../../../../lib/api';
import { Button } from '../../../Layout';
import { formatActivityTime } from '../../../../lib/activity';
import { parseWingsSystem } from '../../../../lib/node-admin';
import { NodeLimitSummary } from '../NodeResourceMeter';
import { NodeOverviewResourceRings } from './NodeOverviewResourceRings';

type OverviewNav = {
  onDiagnostics: () => void;
  onAllocations: () => void;
  onServers: () => void;
  onAnalytics: () => void;
  downloadConfig: () => void;
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

  const status = detail.maintenanceMode ? 'maintenance' : detail.online ? 'online' : 'offline';
  const statusLabel = detail.maintenanceMode ? 'Maintenance' : detail.online ? 'Online' : 'Offline';
  const createdLabel = new Date(detail.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const recentActivity = detail.recentActivity.slice(0, 6);

  return (
    <div className="ds-nd-ov">
      {/* Status ribbon */}
      <section className={`ds-nd-ov-ribbon ds-nd-ov-ribbon--${status}`} aria-label="Node status">
        <div className="ds-nd-ov-ribbon-main">
          <div className="ds-nd-ov-ribbon-icon" aria-hidden>
            {detail.online && !detail.maintenanceMode ? <Wifi className="ds-icon" /> : <WifiOff className="ds-icon" />}
          </div>
          <div className="min-w-0">
            <p className="ds-nd-ov-ribbon-eyebrow">Daemon status</p>
            <p className="ds-nd-ov-ribbon-title">{statusLabel}</p>
            <p className="ds-nd-ov-ribbon-hint">
              {detail.maintenanceMode
                ? 'New server deployments are blocked on this node'
                : detail.online
                  ? wingsVersion ?? 'FeatherWings is responding to the panel'
                  : 'The panel cannot reach FeatherWings on this host'}
            </p>
          </div>
        </div>
        <div className="ds-nd-ov-ribbon-stats">
          <RibbonStat label="Servers" value={String(detail.serverCount)} />
          <RibbonStat label="Ports" value={`${detail.assignedAllocations}/${detail.allocationCount}`} />
          <RibbonStat label="Free ports" value={String(freeAllocations)} />
          <RibbonStat label="Region" value={detail.location.short} />
        </div>
      </section>

      {/* Quick actions */}
      <section className="ds-nd-ov-actions" aria-label="Quick actions">
        <ActionTile icon={Download} label="Wings config" hint="Download YAML" onClick={nav.downloadConfig} />
        <ActionTile icon={ShieldCheck} label="Diagnostics" hint="Test connectivity" onClick={nav.onDiagnostics} />
        <ActionTile icon={Gauge} label="Allocations" hint={`${detail.allocationCount} ports`} onClick={nav.onAllocations} />
        <ActionTile icon={Server} label="Servers" hint={`${detail.serverCount} deployed`} onClick={nav.onServers} />
        <ActionTile icon={Activity} label="Analytics" hint="Live & history" onClick={nav.onAnalytics} />
      </section>

      <div className="ds-nd-ov-layout">
        {/* Resource command center */}
        <section className="ds-nd-ov-panel ds-nd-ov-panel--primary">
          <header className="ds-nd-ov-panel-head">
            <div>
              <h2 className="ds-nd-ov-panel-title">Resource command center</h2>
              <p className="ds-nd-ov-panel-desc">
                Live usage from Wings and panel-assigned limits across all servers
              </p>
            </div>
            {detail.liveUsage ? (
              <span className="ds-nd-ov-live-badge">
                {detail.liveUsage.liveServerCount}/{detail.liveUsage.serverCount} live
              </span>
            ) : null}
          </header>
          <div className="ds-nd-ov-panel-body">
            {detail.capacity ? (
              <>
                <NodeOverviewResourceRings capacity={detail.capacity} liveUsage={detail.liveUsage} />
                <div className="ds-nd-ov-limits-block">
                  <p className="ds-nd-ov-section-label">Configured node limits</p>
                  <NodeLimitSummary
                    memory={detail.memory}
                    memoryOverallocate={detail.memoryOverallocate}
                    disk={detail.disk}
                    diskOverallocate={detail.diskOverallocate}
                  />
                </div>
                {detail.allocationCount > 0 ? (
                  <div className="ds-nd-ov-ports-block">
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
              </>
            ) : (
              <p className="ds-text-sm ds-text-muted">No capacity data available for this node.</p>
            )}
          </div>
        </section>

        {/* Right column */}
        <div className="ds-nd-ov-side">
          <section className="ds-nd-ov-panel">
            <header className="ds-nd-ov-panel-head ds-nd-ov-panel-head--compact">
              <Network className="ds-icon ds-icon--sm ds-text-muted" aria-hidden />
              <h2 className="ds-nd-ov-panel-title">Connection</h2>
            </header>
            <div className="ds-nd-ov-panel-body ds-nd-ov-panel-body--tight">
              <ConnectionRow label="FQDN" value={detail.fqdn} />
              <ConnectionRow
                label="Panel API"
                value={`${detail.scheme}://${detail.fqdn}:${detail.daemonListen}`}
                mono
              />
              <ConnectionRow label="SFTP" value={`${detail.fqdn}:${detail.daemonSftp}`} mono />
              <ConnectionRow label="Data path" value={detail.daemonBase} mono />
              <ConnectionRow label="Max upload" value={`${detail.uploadSize} MB`} />
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
            </div>
          </section>

          <section className="ds-nd-ov-panel">
            <header className="ds-nd-ov-panel-head ds-nd-ov-panel-head--compact">
              <Terminal className="ds-icon ds-icon--sm ds-text-muted" aria-hidden />
              <h2 className="ds-nd-ov-panel-title">Identity</h2>
            </header>
            <div className="ds-nd-ov-panel-body ds-nd-ov-panel-body--tight">
              <CopyRow label="Node UUID" value={detail.uuid} onCopy={() => nav.copyText(detail.uuid)} copied={nav.copied} />
              <CopyRow
                label="Token ID"
                value={detail.daemonTokenId}
                onCopy={() => nav.copyText(detail.daemonTokenId)}
                copied={nav.copied}
              />
              <MetaRow label="Created" value={createdLabel} />
              <MetaRow label="Location" value={`${detail.location.short} — ${detail.location.long}`} />
              {detail.description ? <MetaRow label="Notes" value={detail.description} /> : null}
            </div>
          </section>

          {wingsSystem ? (
            <section className="ds-nd-ov-panel">
              <header className="ds-nd-ov-panel-head ds-nd-ov-panel-head--compact">
                <Cpu className="ds-icon ds-icon--sm ds-text-muted" aria-hidden />
                <h2 className="ds-nd-ov-panel-title">Host system</h2>
              </header>
              <div className="ds-nd-ov-panel-body ds-nd-ov-panel-body--tight">
                <div className="ds-nd-ov-host-grid">
                  {wingsSystem.version && <HostCell label="Wings" value={wingsSystem.version} />}
                  {wingsSystem.os && <HostCell label="OS" value={wingsSystem.os} />}
                  {wingsSystem.architecture && <HostCell label="Arch" value={wingsSystem.architecture} />}
                  {wingsSystem.cpuCount && <HostCell label="CPU cores" value={wingsSystem.cpuCount} />}
                  {wingsSystem.kernel && <HostCell label="Kernel" value={wingsSystem.kernel} mono />}
                  {wingsSystem.dockerVersion && <HostCell label="Docker" value={wingsSystem.dockerVersion} mono />}
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>

      {/* Activity preview */}
      {recentActivity.length > 0 ? (
        <section className="ds-nd-ov-panel">
          <header className="ds-nd-ov-panel-head">
            <div>
              <h2 className="ds-nd-ov-panel-title">Recent activity</h2>
              <p className="ds-nd-ov-panel-desc">Latest panel events for this node</p>
            </div>
          </header>
          <ul className="ds-nd-ov-activity-strip">
            {recentActivity.map((entry) => (
              <li key={entry.id} className="ds-nd-ov-activity-row">
                <span className="ds-nd-ov-activity-dot" aria-hidden />
                <div className="min-w-0">
                  <p className="ds-nd-ov-activity-text">{entry.description ?? entry.event}</p>
                  <p className="ds-nd-ov-activity-meta">
                    {entry.actor?.username ? `${entry.actor.username} · ` : ''}
                    {formatActivityTime(entry.timestamp)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!detail.online ? (
        <div className="ds-nd-banner ds-nd-banner--danger">
          <WifiOff className="h-4 w-4 shrink-0" />
          <p className="ds-text-sm">
            Wings is not reachable. Download the config, ensure FeatherWings is running, and open ports{' '}
            <strong>{detail.daemonListen}</strong> (API) and <strong>{detail.daemonSftp}</strong> (SFTP).
          </p>
          <Button type="button" size="sm" onClick={nav.downloadConfig}>
            <Download className="h-3.5 w-3.5" />
            Download config
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function RibbonStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="ds-nd-ov-ribbon-stat">
      <span className="ds-nd-ov-ribbon-stat-label">{label}</span>
      <span className="ds-nd-ov-ribbon-stat-value">{value}</span>
    </div>
  );
}

function ActionTile({
  icon: Icon,
  label,
  hint,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="ds-nd-ov-action-tile" onClick={onClick}>
      <span className="ds-nd-ov-action-tile-icon" aria-hidden>
        <Icon className="ds-icon ds-icon--sm" />
      </span>
      <span className="ds-nd-ov-action-tile-label">{label}</span>
      <span className="ds-nd-ov-action-tile-hint">{hint}</span>
    </button>
  );
}

function ConnectionRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="ds-nd-ov-kv">
      <span className="ds-nd-ov-kv-label">{label}</span>
      <span className={`ds-nd-ov-kv-value${mono ? ' font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function CopyRow({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="ds-nd-ov-kv ds-nd-ov-kv--copy">
      <span className="ds-nd-ov-kv-label">{label}</span>
      <div className="ds-nd-ov-kv-copy">
        <code className="ds-nd-ov-kv-value font-mono truncate">{value}</code>
        <button type="button" className="ds-nd-ov-copy-btn" onClick={onCopy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="ds-nd-ov-kv">
      <span className="ds-nd-ov-kv-label">{label}</span>
      <span className="ds-nd-ov-kv-value">{value}</span>
    </div>
  );
}

function HostCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="ds-nd-ov-host-cell">
      <span className="ds-nd-ov-host-label">{label}</span>
      <span className={`ds-nd-ov-host-value${mono ? ' font-mono' : ''}`}>{value}</span>
    </div>
  );
}
