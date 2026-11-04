import { CheckCircle2, Copy, RefreshCw, XCircle } from 'lucide-react';
import type { NodeDiagnostics } from '../../../lib/api';
import { NodeDetailPanel } from '../../../components/admin/node-detail/NodeDetailPanel';
import { AdminCopyButton, AdminInfoRow } from '../../../components/AdminDetailLayout';
import { Spinner } from '../../../components/ui';
import { useState } from 'react';

export function NodeDetailDiagnosticsTab({
  diagnostics,
  loading,
  error,
  onRun,
}: {
  diagnostics: NodeDiagnostics | null;
  loading: boolean;
  error?: string;
  onRun: () => void;
}) {
  const [copiedRemote, setCopiedRemote] = useState(false);

  async function copyRemoteUrl(url: string) {
    await navigator.clipboard.writeText(url);
    setCopiedRemote(true);
    setTimeout(() => setCopiedRemote(false), 1500);
  }

  const remoteConfigured = Boolean(diagnostics?.remote.expected);
  const wingsOnline = Boolean(diagnostics?.wings.online);

  return (
    <div className="ds-nd-body">
      <NodeDetailPanel
        title="Connectivity check"
        description="Verify FeatherWings can reach the panel and routing is configured"
        icon={RefreshCw}
        actions={
          <button type="button" className="ds-nd-tool-btn" disabled={loading} onClick={onRun}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden />
            {loading ? 'Running…' : diagnostics ? 'Re-run' : 'Run diagnostics'}
          </button>
        }
      >
        {loading && !diagnostics ? (
          <div className="ds-nd-diag-loading">
            <Spinner className="h-4 w-4" />
            <span>Running connectivity checks…</span>
          </div>
        ) : null}
        {error ? <p className="ds-nd-notice ds-nd-notice--danger">{error}</p> : null}
        {!diagnostics && !loading && !error ? (
          <p className="ds-text-sm ds-text-muted">
            Run diagnostics to check daemon reachability, remote URL, console routing, and SFTP.
          </p>
        ) : null}
      </NodeDetailPanel>

      {diagnostics ? (
        <>
          <div className="ds-nd-diag-grid">
            <DiagCard
              label="Wings daemon"
              ok={wingsOnline}
              value={wingsOnline ? diagnostics.wings.wingsVersion ?? 'Online' : 'Offline'}
              detail={diagnostics.wings.error ?? undefined}
            />
            <DiagCard
              label="Remote URL"
              ok={remoteConfigured}
              value={remoteConfigured ? (wingsOnline ? 'Reachable path set' : 'Configured') : 'Missing'}
              detail={diagnostics.remote.hint}
            />
            <DiagCard
              label="Console routing"
              ok={wingsOnline}
              value={wingsOnline ? 'Ready' : 'Needs Wings online'}
              detail={diagnostics.console.hint}
            />
            <DiagCard
              label="SFTP"
              ok
              value={`Port ${diagnostics.sftp.port}`}
              detail={`${diagnostics.sftp.usernameFormat} @ ${diagnostics.sftp.host}`}
            />
          </div>

          <NodeDetailPanel title="Technical details" description="Raw values used by the panel and Wings" icon={Copy}>
            <dl className="ds-nd-diag-tech">
              <AdminInfoRow label="Panel URL" value={diagnostics.panel.url} mono truncate />
              <AdminInfoRow label="API URL" value={diagnostics.panel.apiUrl} mono truncate />
              <AdminInfoRow label="Expected remote" value={diagnostics.remote.expected} mono truncate />
              <AdminInfoRow label="Console" value={diagnostics.console.hint} />
              <AdminInfoRow
                label="SFTP"
                value={`${diagnostics.sftp.usernameFormat} @ ${diagnostics.sftp.host}:${diagnostics.sftp.port}`}
              />
            </dl>
            <div className="mt-3">
              <AdminCopyButton
                label={copiedRemote ? 'Copied' : 'Copy remote URL'}
                active={copiedRemote}
                onClick={() => void copyRemoteUrl(diagnostics.remote.expected)}
              />
            </div>
          </NodeDetailPanel>
        </>
      ) : null}
    </div>
  );
}

function DiagCard({
  label,
  ok,
  value,
  detail,
}: {
  label: string;
  ok: boolean;
  value: string;
  detail?: string;
}) {
  return (
    <div className={`ds-nd-diag-card${ok ? ' ds-nd-diag-card--ok' : ' ds-nd-diag-card--bad'}`}>
      <div className="ds-nd-diag-card-label">
        {ok ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success-fg)]" aria-hidden />
        ) : (
          <XCircle className="h-3.5 w-3.5 text-[var(--danger-fg)]" aria-hidden />
        )}
        <span>{label}</span>
      </div>
      <p className="ds-nd-diag-card-value">{value}</p>
      {detail ? <p className="ds-nd-diag-card-detail">{detail}</p> : null}
    </div>
  );
}
