import { useState } from 'react';
import { CheckCircle2, Copy, RefreshCw, XCircle } from 'lucide-react';
import type { NodeDiagnostics } from '../../lib/api';
import { AdminCopyButton, AdminInfoRow, AdminSettingsPanel } from '../AdminDetailLayout';
import { Button } from '../Layout';
import { Spinner } from '../ui';

export function NodeDiagnosticsPanel({
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
    <div className="space-y-5">
      <AdminSettingsPanel
        title="Connectivity check"
        description="Verify FeatherWings can reach the panel and that console/SFTP routing is configured correctly"
        icon={RefreshCw}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="ghost" disabled={loading} onClick={onRun}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Running diagnostics…' : diagnostics ? 'Re-run diagnostics' : 'Run diagnostics'}
          </Button>
          {loading && <Spinner className="h-4 w-4" />}
        </div>
        {error && (
          <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
        )}
      </AdminSettingsPanel>

      {diagnostics && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatusCard
              label="Wings daemon"
              ok={diagnostics.wings.online}
              value={diagnostics.wings.online ? diagnostics.wings.wingsVersion ?? 'Online' : 'Offline'}
              detail={diagnostics.wings.error ?? undefined}
            />
            <StatusCard
              label="Remote URL"
              ok={Boolean(diagnostics.remote.expected)}
              value={diagnostics.wings.online ? 'Configured' : 'Unreachable'}
              detail={diagnostics.remote.hint}
            />
            <StatusCard label="Console routing" ok={diagnostics.wings.online} value="Checked" detail={diagnostics.console.hint} />
            <StatusCard
              label="SFTP"
              ok
              value={`Port ${diagnostics.sftp.port}`}
              detail={`${diagnostics.sftp.usernameFormat} @ ${diagnostics.sftp.host}`}
            />
          </div>

          <AdminSettingsPanel title="Technical details" description="Raw values used by the panel and Wings" icon={Copy}>
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
          </AdminSettingsPanel>
        </>
      )}
    </div>
  );
}

function StatusCard({
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
    <div
      className={`rounded-xl border p-4 ${
        ok ? 'border-green-500/25 bg-green-500/[0.06]' : 'border-red-500/25 bg-red-500/[0.06]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
        {ok ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
        ) : (
          <XCircle className="h-4 w-4 shrink-0 text-red-400" />
        )}
      </div>
      <p className={`mt-2 text-sm font-semibold ${ok ? 'text-green-300' : 'text-red-300'}`}>{value}</p>
      {detail && <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--muted)]">{detail}</p>}
    </div>
  );
}
