import {
  Cpu,
  Fingerprint,
  Gauge,
  Globe,
  Terminal,
  Wrench,
} from 'lucide-react';
import type { AdminNodeDetail } from '../../../../lib/api';
import { parseWingsSystem } from '../../../../lib/node-admin';
import { NodeOverviewResourceRings } from './NodeOverviewResourceRings';
import { FeatherWingsVersionCard } from './FeatherWingsVersionCard';
import {
  NodeOverviewCopyField,
  NodeOverviewEndpoint,
  NodeOverviewOfflineBanner,
  NodeOverviewSection,
  NodeOverviewSpec,
} from '../NodeDetailShell';
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

  const liveBadge = detail.liveUsage ? (
    <StatusPill
      label={`${detail.liveUsage.liveServerCount}/${detail.liveUsage.serverCount} live`}
      tone={detail.liveUsage.liveServerCount > 0 ? 'success' : 'neutral'}
      compact
    />
  ) : undefined;

  return (
    <div className="ds-nd-ov">
      {!detail.online ? (
        <NodeOverviewOfflineBanner
          detail={detail}
          onDownloadConfig={nav.downloadConfig}
          onCopyJoinData={nav.copyJoinData}
        />
      ) : null}

      <NodeOverviewSection
        icon={Gauge}
        title="Capacity & resources"
        description="Live Wings usage, assigned server limits, and port inventory"
        badge={liveBadge}
        className="ds-nd-ov-card--capacity"
      >
        {detail.capacity ? (
          <NodeOverviewResourceRings
            capacity={detail.capacity}
            liveUsage={detail.liveUsage}
            memory={detail.memory}
            memoryOverallocate={detail.memoryOverallocate}
            disk={detail.disk}
            diskOverallocate={detail.diskOverallocate}
            allocationCount={detail.allocationCount}
            assignedAllocations={detail.assignedAllocations}
          />
        ) : (
          <p className="ds-text-sm ds-text-muted">No capacity data available for this node.</p>
        )}
      </NodeOverviewSection>

      <FeatherWingsVersionCard
        installedVersion={wingsVersion}
        online={detail.online}
        onDownloadConfig={nav.downloadConfig}
        onCopyJoinData={nav.copyJoinData}
      />

      <div className="ds-nd-ov-grid-3">
        <NodeOverviewSection icon={Globe} title="Connection" description="How Wings and clients reach this node">
          <div className="ds-nd-ov-endpoint-grid">
            <NodeOverviewEndpoint
              label="Panel API"
              value={`${detail.scheme}://${detail.fqdn}:${detail.daemonListen}`}
              mono
            />
            <NodeOverviewEndpoint label="SFTP" value={`${detail.fqdn}:${detail.daemonSftp}`} mono />
            <NodeOverviewEndpoint label="Data path" value={detail.daemonBase} mono />
            <NodeOverviewEndpoint label="Max upload" value={`${detail.uploadSize} MB`} />
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

        <NodeOverviewSection icon={Fingerprint} title="Panel identity" description="Identifiers used by the panel and daemon">
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
