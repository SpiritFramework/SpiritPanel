import { useState } from 'react';
import { Check, ChevronDown, Copy, Database, Eye, EyeOff, Table2, Trash2 } from 'lucide-react';
import type { ServerDatabaseSummary } from '../../../lib/api';
import { formatActivityTime } from '../../../lib/activity';
import {
  buildCredentialExport,
  databaseEndpoint,
  databaseJdbc,
  remoteLabel,
} from '../../../lib/database-utils';

function CopyBtn({
  label,
  copied,
  onCopy,
  compact,
}: {
  label: string;
  copied?: boolean;
  onCopy: () => void;
  compact?: boolean;
}) {
  return (
    <button type="button" title={label} onClick={onCopy} className={`ds-srv-db-copy-btn${compact ? ' ds-srv-db-copy-btn--compact' : ''}${copied ? ' ds-srv-db-copy-btn--copied' : ''}`}>
      {copied ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
      {!compact && !copied ? <span>Copy</span> : null}
      {!compact && copied ? <span>Copied</span> : null}
    </button>
  );
}

function CredentialField({
  label,
  value,
  hint,
  masked,
  copied,
  onCopy,
  trailing,
}: {
  label: string;
  value: string;
  hint?: string;
  masked?: boolean;
  copied?: boolean;
  onCopy?: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="ds-srv-db-credential">
      <div className="ds-srv-db-credential-head">
        <dt>{label}</dt>
        <div className="ds-srv-db-credential-actions">
          {trailing}
          {onCopy ? <CopyBtn label={`Copy ${label.toLowerCase()}`} copied={copied} onCopy={onCopy} compact /> : null}
        </div>
      </div>
      <dd className={masked ? 'ds-srv-db-credential-value--masked' : ''}>{value}</dd>
      {hint && hint !== value ? <p className="ds-srv-db-credential-hint">{hint}</p> : null}
    </div>
  );
}

export function DatabaseRow({
  database,
  busy,
  canDelete,
  canViewPassword,
  managerEnabled,
  onOpenManager,
  onDelete,
}: {
  database: ServerDatabaseSummary;
  busy: boolean;
  canDelete: boolean;
  canViewPassword: boolean;
  managerEnabled?: boolean;
  onOpenManager?: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const endpoint = databaseEndpoint(database);
  const jdbc = databaseJdbc(database);

  async function copy(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1500);
  }

  return (
    <li className={`ds-srv-db-row${expanded ? ' ds-srv-db-row--expanded' : ''}`}>
      <span className="ds-srv-db-row-accent" aria-hidden />

      <div className="ds-srv-db-row-main">
        <span className="ds-srv-db-row-icon" aria-hidden>
          <Database className="h-4 w-4" />
        </span>

        <div className="ds-srv-db-row-body">
          <div className="ds-srv-db-row-top">
            <div className="min-w-0 flex-1">
              <div className="ds-srv-db-row-badges">
                <span className="ds-srv-db-badge ds-srv-db-badge--mysql">MySQL</span>
                <span className="ds-srv-db-badge">{remoteLabel(database.remote)}</span>
                <span className="ds-srv-db-badge ds-srv-db-badge--muted">{database.hostName}</span>
              </div>
              <h3 className="ds-srv-db-row-title">{database.name}</h3>
              <div className="ds-srv-db-row-endpoint">
                <span className="ds-srv-db-row-db-name">{database.database}</span>
                <span className="ds-srv-db-row-at">@</span>
                <span>{endpoint}</span>
                <CopyBtn label="Copy endpoint" copied={copiedKey === 'endpoint'} onCopy={() => copy(endpoint, 'endpoint')} compact />
              </div>
              <p className="ds-srv-db-row-meta">Created {formatActivityTime(database.createdAt)}</p>
            </div>

            <div className="ds-srv-db-row-actions">
              {managerEnabled && onOpenManager ? (
                <button
                  type="button"
                  className="ds-srv-db-row-btn ds-srv-db-row-btn--primary"
                  disabled={busy}
                  title="Open built-in database browser"
                  onClick={onOpenManager}
                >
                  <Table2 className="h-3.5 w-3.5" aria-hidden />
                  <span className="ds-srv-db-browse-label">Browse</span>
                </button>
              ) : null}
              <CopyBtn
                label="Copy all credentials"
                copied={copiedKey === 'all'}
                onCopy={() => copy(buildCredentialExport(database, canViewPassword), 'all')}
              />
              <button
                type="button"
                className="ds-srv-db-row-btn"
                aria-expanded={expanded}
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? 'Collapse' : 'Credentials'}
                <ChevronDown className={`h-3.5 w-3.5 transition${expanded ? ' rotate-180' : ''}`} aria-hidden />
              </button>
              {canDelete ? (
                <button type="button" className="ds-srv-db-row-btn ds-srv-db-row-btn--danger" disabled={busy} title="Delete" onClick={onDelete}>
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              ) : null}
            </div>
          </div>

          {expanded ? (
            <div className="ds-srv-db-row-credentials">
              <div className="ds-srv-db-credential-grid">
                <CredentialField label="Host" value={endpoint} copied={copiedKey === 'host'} onCopy={() => copy(endpoint, 'host')} />
                <CredentialField label="Database" value={database.database} copied={copiedKey === 'db'} onCopy={() => copy(database.database, 'db')} />
                <CredentialField label="Username" value={database.username} copied={copiedKey === 'user'} onCopy={() => copy(database.username, 'user')} />
                <CredentialField
                  label="Password"
                  value={
                    !canViewPassword
                      ? 'No permission'
                      : database.password
                        ? showPassword
                          ? database.password
                          : '••••••••••••'
                        : 'Hidden'
                  }
                  masked={canViewPassword && !!database.password && !showPassword}
                  copied={copiedKey === 'pass'}
                  onCopy={canViewPassword && database.password ? () => copy(database.password!, 'pass') : undefined}
                  trailing={
                    canViewPassword && database.password ? (
                      <button
                        type="button"
                        className="ds-srv-db-reveal-btn"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    ) : undefined
                  }
                />
                <CredentialField label="Remote access" value={database.remote} hint={remoteLabel(database.remote)} />
                <CredentialField label="Host pool" value={database.hostName} />
              </div>

              <div className="ds-srv-db-jdbc">
                <div className="ds-srv-db-jdbc-head">
                  <p>JDBC connection string</p>
                  <CopyBtn label="Copy JDBC" copied={copiedKey === 'jdbc'} onCopy={() => copy(jdbc, 'jdbc')} compact />
                </div>
                <code>{jdbc}</code>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}
