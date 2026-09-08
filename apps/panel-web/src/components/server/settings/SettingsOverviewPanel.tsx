import { Check, Copy, Egg, Fingerprint, Globe, Server } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ServerDetail } from '../../../lib/api';
import { ServerEggIcon } from '../../ServerEggIcon';
import { ServerStatusBadge } from '../../ServerStatusBadge';
import { getServerTheme } from '../../../lib/server-theme';

function CopyRow({
  icon: Icon,
  label,
  value,
  hint,
  copied,
  onCopy,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  copied?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div className="ds-srv-set-detail-row">
      <dt className="ds-srv-set-detail-label">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="ds-srv-set-detail-value-wrap">
        <p className="ds-srv-set-detail-value">{value}</p>
        {hint ? <p className="ds-srv-set-detail-hint">{hint}</p> : null}
      </dd>
      {onCopy ? (
        <button
          type="button"
          onClick={onCopy}
          className={`ds-srv-set-copy-btn${copied ? ' ds-srv-set-copy-btn--copied' : ''}`}
        >
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      ) : null}
    </div>
  );
}

export function SettingsOverviewPanel({
  server,
  live,
  address,
  showInstallFailedHint,
  copiedKey,
  onCopy,
}: {
  server: ServerDetail;
  live: {
    runtimeState?: string | null;
    connectionStatus?: string;
  } | null;
  address: string;
  showInstallFailedHint: boolean;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  const theme = getServerTheme(server.egg.name);
  const shortId = server.uuidShort ?? server.uuid.slice(0, 8);

  return (
    <section className="ds-srv-set-panel">
      <div className="ds-srv-set-panel-head">
        <Server className="h-4 w-4" aria-hidden />
        <div>
          <h3 className="ds-srv-set-panel-title">Server overview</h3>
          <p className="ds-srv-set-panel-meta">Runtime status, connection details, and identifiers</p>
        </div>
      </div>

      <div className="ds-srv-set-overview-hero">
        <div className="ds-srv-set-overview-identity">
          <div className="ds-srv-set-overview-icon" style={{ background: theme.gradient }}>
            <ServerEggIcon eggName={server.egg.name} logoUrl={server.egg.logoUrl} className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="ds-srv-set-overview-name">{server.name}</p>
            <p className="ds-srv-set-overview-egg">{server.egg.name}</p>
          </div>
        </div>
        <ServerStatusBadge
          status={server.status}
          suspended={server.suspended}
          installStatus={server.installStatus}
          containerState={server.containerState}
          runtimeState={live?.runtimeState ?? null}
          wsConnected={live?.connectionStatus === 'connected'}
        />
      </div>

      <dl className="ds-srv-set-detail-list">
        <CopyRow
          icon={Globe}
          label="Address"
          value={address}
          copied={copiedKey === 'address'}
          onCopy={() => onCopy(address, 'address')}
        />
        <CopyRow icon={Server} label="Node" value={server.node.name} hint={server.node.fqdn ?? undefined} />
        <CopyRow icon={Egg} label="Egg" value={server.egg.name} />
        <CopyRow
          icon={Fingerprint}
          label="Short ID"
          value={shortId}
          copied={copiedKey === 'short-id'}
          onCopy={() => onCopy(shortId, 'short-id')}
        />
        <CopyRow
          icon={Fingerprint}
          label="Full UUID"
          value={server.uuid}
          copied={copiedKey === 'uuid'}
          onCopy={() => onCopy(server.uuid, 'uuid')}
        />
      </dl>

      {showInstallFailedHint && server.status === 'normal' ? (
        <div className="ds-srv-set-warning">
          A previous install attempt was marked failed in the panel. If the server runs normally, you can ignore
          this — use Reinstall below only if files are actually broken.
        </div>
      ) : null}
    </section>
  );
}
