import { CheckCircle2, Copy, RefreshCw, XCircle } from 'lucide-react';
import type { NodeDiagnostics } from '../../../lib/api';
import { NodeDetailPanel } from '../../../components/admin/node-detail/NodeDetailPanel';
import { AdminCopyButton, AdminInfoRow } from '../../../components/AdminDetailLayout';
import { Button } from '../../../components/Layout';
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

  return (
    <div className="ds-nd-body">
      <NodeDetailPanel
        title="Connectivity check"
        description="Verify FeatherWings can reach the panel and routing is configured"
        icon={RefreshCw}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="ghost" size="sm" disabled={loading} onClick={onRun}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Running diagnostics…' : diagnostics ? 'Re-run diagnostics' : 'Run diagnostics'}
          </Button>
          {loading ? <Spinner className="h-4 w-4" /> : null}
        </div>
        {error ? (
          <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </p>
        ) : null}
      </NodeDetailPanel>

      {diagnostics ? (
        <>
          <div className="ds-nd-diag-grid">
            <DiagCard
              label="Wings daemon"
              ok={diagnostics.wings.online}
              value={diagnostics.wings.online ? diagnostics.wings.wingsVersion ?? 'Online' : 'Offline'}
              detail={diagnostics.wings.error ?? undefined}
            />
            <DiagCard
              label="Remote URL"
              ok={Boolean(diagnostics.remote.expected)}
              value={diagnostics.wings.online ? 'Configured' : 'Unreachable'}
              detail={diagnostics.remote.hint}
            />
            <DiagCard
              label="Console routing"
              ok={diagnostics.wings.online}
              value="Checked"
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
            <dl className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
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
      <div className="flex items-center gap-1.5">
        {ok ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success-fg)]" />
        ) : (
          <XCircle className="h-3.5 w-3.5 text-[var(--danger-fg)]" />
        )}
        <span className="ds-nd-diag-card-label">{label}</span>
      </div>
      <p className="ds-nd-diag-card-value">{value}</p>
      {detail ? <p className="ds-nd-diag-card-detail">{detail}</p> : null}
    </div>
  );
}
