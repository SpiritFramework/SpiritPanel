import { Check, Copy, Gamepad2, HardDrive, Link2, Server } from 'lucide-react';
import type { ServerConnectionInfo } from '../../../lib/api';

function CopyRow({
  icon: Icon,
  label,
  value,
  hint,
  copied,
  onCopy,
}: {
  icon: typeof Server;
  label: string;
  value: string;
  hint?: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="ds-srv-net-connect-row">
      <dt className="ds-srv-net-connect-label">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="ds-srv-net-connect-value-wrap">
        <p className="ds-srv-net-connect-value">{value}</p>
        {hint ? <p className="ds-srv-net-connect-hint">{hint}</p> : null}
      </dd>
      <button
        type="button"
        onClick={onCopy}
        className={`ds-srv-net-copy-btn${copied ? ' ds-srv-net-copy-btn--copied' : ''}`}
      >
        {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
        <span>{copied ? 'Copied' : 'Copy'}</span>
      </button>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Server;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="ds-srv-net-connect-row">
      <dt className="ds-srv-net-connect-label">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="ds-srv-net-connect-value-wrap">
        <p className="ds-srv-net-connect-value">{value}</p>
        {hint ? <p className="ds-srv-net-connect-hint">{hint}</p> : null}
      </dd>
    </div>
  );
}

export function NetworkConnectPanel({
  joinAddress,
  connection,
  primaryPort,
  defaultPort,
  nodeName,
  nodeFqdn,
  copiedKey,
  onCopy,
}: {
  joinAddress: string;
  connection: ServerConnectionInfo | null;
  primaryPort: number | null;
  defaultPort: number;
  nodeName: string;
  nodeFqdn?: string | null;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  return (
    <section className="ds-srv-net-connect">
      <div className="ds-srv-net-connect-header">
        <Link2 className="h-4 w-4" aria-hidden />
        <div>
          <h3 className="ds-srv-net-connect-title">Connection</h3>
          <p className="ds-srv-net-connect-meta">Share these with players, launchers, and file tools</p>
        </div>
      </div>
      <dl className="ds-srv-net-connect-list">
        <CopyRow
          icon={Gamepad2}
          label="Game address"
          value={joinAddress}
          hint={
            connection
              ? `${connection.game.hostname}:${connection.game.port}`
              : `Primary :${primaryPort ?? defaultPort}`
          }
          copied={copiedKey === 'game'}
          onCopy={() => onCopy(joinAddress, 'game')}
        />
        {connection ? (
          <CopyRow
            icon={HardDrive}
            label="SFTP"
            value={`${connection.sftp.username}@${connection.sftp.host}:${connection.sftp.port}`}
            hint="Authenticate with your panel password"
            copied={copiedKey === 'sftp'}
            onCopy={() => onCopy(connection.sftp.uri, 'sftp')}
          />
        ) : null}
        <InfoRow icon={Server} label="Node" value={nodeName} hint={nodeFqdn ?? undefined} />
      </dl>
    </section>
  );
}
