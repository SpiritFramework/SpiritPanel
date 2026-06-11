import { useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  Download,
  FolderOpen,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { api, type FivemServerLayout, type GithubRepoResolved } from '../../lib/api';
import { cfgResourceFromPath } from '../../lib/marketplace-format';
import { SelectControl } from '../../components/SelectControl';
import { Button } from '../../components/Layout';
import { Spinner } from '../../components/ui';

function layoutLabel(layout: FivemServerLayout | null | undefined): string {
  if (!layout || layout.confidence === 'low') return 'Default paths (could not scan server)';
  if (layout.layout === 'txadmin' && layout.profileName) {
    return `txAdmin · ${layout.profileName}`;
  }
  if (layout.layout === 'flat') return 'Standard resources folder';
  return 'Detected server layout';
}

function InstallStep({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="mp-install-step">
      <div className="mp-install-step-head">
        <span className="mp-install-step-num">{step}</span>
        <div className="min-w-0">
          <p className="mp-install-step-title">{title}</p>
          {description ? <p className="mp-install-step-desc">{description}</p> : null}
        </div>
      </div>
      <div className="mp-install-step-body">{children}</div>
    </div>
  );
}

function FieldGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="mp-install-field">
      <label className="mp-install-label">{label}</label>
      {children}
      {hint ? <p className="mp-install-hint">{hint}</p> : null}
    </div>
  );
}

export function MarketplaceScriptInstallPanel({
  serverId,
  resolved,
  serverLayout,
  canInstall,
  onInstalled,
}: {
  serverId: string;
  resolved: GithubRepoResolved;
  serverLayout: FivemServerLayout | null;
  canInstall: boolean;
  onInstalled: () => Promise<void>;
}) {
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState('');
  const [useAutoPaths, setUseAutoPaths] = useState(true);

  const suggested = resolved.suggested ?? {
    installPath: `/resources/[scripts-marketplace]/${resolved.repo}`,
    cfgResource: resolved.repo,
    cfgFile: '/server.cfg',
    githubRef: 'latest-release',
    patchCfg: true,
  };

  const [installPath, setInstallPath] = useState(suggested.installPath);
  const [cfgResource, setCfgResource] = useState(suggested.cfgResource);
  const [cfgAction, setCfgAction] = useState<'ensure' | 'start'>('ensure');
  const [cfgFile, setCfgFile] = useState(suggested.cfgFile);
  const [githubRef, setGithubRef] = useState(suggested.githubRef);
  const [patchCfg, setPatchCfg] = useState(suggested.patchCfg ?? true);

  const activeLayout = resolved.layout ?? serverLayout;

  const refOptions = useMemo(() => {
    const opts = [{ value: 'latest-release', label: 'Latest release' }];
    for (const r of resolved.releases ?? []) {
      opts.push({ value: r.tag, label: r.prerelease ? `${r.tag} (pre)` : r.tag });
    }
    return opts;
  }, [resolved.releases]);

  const cfgPreview = `${cfgAction} ${cfgResource}`;

  async function install() {
    if (!canInstall) return;
    setInstalling(true);
    setInstallError('');
    try {
      await api.client.marketplaceGithubInstall(serverId, {
        githubOwner: resolved.owner,
        githubRepo: resolved.repo,
        githubRef,
        displayName: resolved.name,
        installPath,
        cfgResource,
        cfgAction,
        cfgFile,
        patchCfg,
        useAutoPaths,
      });
      await onInstalled();
    } catch (err) {
      setInstallError(err instanceof Error ? err.message : 'Install failed');
    } finally {
      setInstalling(false);
    }
  }

  return (
    <section className="mp-script-install mp-script-install--page">
      <div className="mp-script-install-grid">
        <div className="mp-script-install-primary">
          <InstallStep step={1} title="Version & location" description="Where files go on your server">
            <label className="mp-auto-toggle">
              <input
                type="checkbox"
                checked={useAutoPaths}
                onChange={(e) => {
                  const on = e.target.checked;
                  setUseAutoPaths(on);
                  if (on) {
                    setInstallPath(suggested.installPath);
                    setCfgFile(suggested.cfgFile);
                    setCfgResource(suggested.cfgResource);
                  }
                }}
              />
              <span>
                <span className="mp-auto-toggle-title">
                  <Sparkles className="h-4 w-4 text-amber-400" aria-hidden />
                  Auto-detect paths
                </span>
                <span className="mp-auto-toggle-desc">{layoutLabel(activeLayout)}</span>
              </span>
            </label>

            <div className="mp-install-fields mp-install-fields--wide">
              <FieldGroup label="Folder path" hint="Where files are placed on the server">
                <input
                  value={installPath}
                  disabled={useAutoPaths}
                  onChange={(e) => {
                    setInstallPath(e.target.value);
                    setUseAutoPaths(false);
                    setCfgResource(cfgResourceFromPath(e.target.value, resolved.repo));
                  }}
                  className="mp-field-input mp-field-input--lg"
                />
              </FieldGroup>
              <FieldGroup label="Version" hint="Release or tag to download">
                <SelectControl
                  className="mp-install-select"
                  value={githubRef}
                  onChange={(e) => setGithubRef(e.target.value)}
                >
                  {refOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </SelectControl>
              </FieldGroup>
            </div>
          </InstallStep>

          <InstallStep step={2} title="server.cfg" description="How the resource is started">
            <div className="mp-install-fields mp-install-fields--wide">
              <FieldGroup label="Resource name">
                <input
                  value={cfgResource}
                  onChange={(e) => setCfgResource(e.target.value)}
                  placeholder="Resource name"
                  className="mp-field-input mp-field-input--lg"
                />
              </FieldGroup>
              <FieldGroup label="Start command">
                <SelectControl
                  className="mp-install-select"
                  value={cfgAction}
                  onChange={(e) => setCfgAction(e.target.value as 'ensure' | 'start')}
                >
                  <option value="ensure">ensure (recommended)</option>
                  <option value="start">start</option>
                </SelectControl>
              </FieldGroup>
              <FieldGroup label="Config file" hint="Which cfg file to patch">
                <input
                  value={cfgFile}
                  disabled={useAutoPaths}
                  onChange={(e) => {
                    setCfgFile(e.target.value);
                    setUseAutoPaths(false);
                  }}
                  placeholder="/server.cfg"
                  className="mp-field-input mp-field-input--lg"
                />
              </FieldGroup>
            </div>

            <label className="mp-install-cfg-check">
              <input type="checkbox" checked={patchCfg} onChange={(e) => setPatchCfg(e.target.checked)} />
              <span>
                Add <code className="mp-install-cfg-preview">{cfgPreview}</code> to the config
              </span>
            </label>
          </InstallStep>

          {installError ? (
            <p className="mp-install-error">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {installError}
            </p>
          ) : null}

          {!canInstall ? (
            <p className="mp-install-permission">
              You don&apos;t have permission to install marketplace resources.
            </p>
          ) : null}
        </div>

        <aside className="mp-script-install-secondary">
          <div className="mp-install-preview mp-install-preview--page">
            <Terminal className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
            <div className="min-w-0">
              <p className="mp-install-preview-label">Config preview</p>
              <code className="mp-install-preview-code">{patchCfg ? cfgPreview : 'No cfg changes'}</code>
            </div>
          </div>

          <div className="mp-script-install-summary">
            <p className="mp-script-install-summary-label">Install destination</p>
            <code className="mp-script-install-summary-path">{installPath}</code>
            <p className="mp-script-install-summary-label">Version</p>
            <p className="mp-script-install-summary-value">
              {refOptions.find((o) => o.value === githubRef)?.label ?? githubRef}
            </p>
          </div>

          <div className="mp-script-install-footer">
            <Button
              type="button"
              disabled={!canInstall || installing}
              onClick={() => void install()}
              className="mp-script-install-cta"
            >
              {installing ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
              Install now
            </Button>
            <p className="mp-script-install-footnote">
              <FolderOpen className="h-3.5 w-3.5" aria-hidden />
              Downloads release, extracts files, and patches cfg if enabled
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
