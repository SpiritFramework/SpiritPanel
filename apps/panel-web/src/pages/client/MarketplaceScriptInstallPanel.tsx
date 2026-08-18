import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  Download,
  FolderOpen,
  FolderSearch,
  Terminal,
} from 'lucide-react';
import { api, type FivemServerLayout, type GithubRepoResolved } from '../../lib/api';
import { cfgResourceFromPath } from '../../lib/marketplace-format';
import { joinPath, parentPath } from '../../lib/paths';
import { MarketplaceFolderPicker } from '../../components/marketplace/MarketplaceFolderPicker';
import { SelectControl } from '../../components/SelectControl';
import { Button } from '../../components/Layout';
import { Spinner } from '../../components/ui';

function layoutLabel(layout: FivemServerLayout | null | undefined): string {
  if (!layout || layout.confidence === 'low') return 'Could not scan server — using /resources';
  if (layout.layout === 'txadmin' && layout.profileName) {
    return `txAdmin · ${layout.profileName}`;
  }
  if (layout.layout === 'flat') return 'Standard resources folder';
  return 'Detected server layout';
}

function resourcesRoot(layout: FivemServerLayout | null | undefined): string {
  return layout?.resourcesPath ?? layout?.resourcesBase ?? '/resources';
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
    <div className="fm-install-step">
      <div className="fm-install-step-head">
        <span className="fm-install-step-num">{step}</span>
        <div className="min-w-0">
          <p className="fm-install-step-title">{title}</p>
          {description ? <p className="fm-install-step-desc">{description}</p> : null}
        </div>
      </div>
      <div className="fm-install-step-body">{children}</div>
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
    <div className="fm-field">
      <label>{label}</label>
      {children}
      {hint ? <p className="fm-field-hint">{hint}</p> : null}
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
  const [pickerOpen, setPickerOpen] = useState(false);

  const activeLayout = resolved.layout ?? serverLayout;
  const detectedResources = resourcesRoot(activeLayout);
  const detectedCfg = activeLayout?.cfgFile ?? '/server.cfg';

  const suggested = resolved.suggested ?? {
    installPath: joinPath(detectedResources, resolved.repo),
    cfgResource: resolved.repo,
    cfgFile: detectedCfg,
    githubRef: 'latest-release',
    patchCfg: true,
  };

  const suggestedParent = parentPath(suggested.installPath);
  const suggestedFolder =
    suggested.installPath.split('/').filter(Boolean).pop() ?? resolved.repo;

  const [parentFolder, setParentFolder] = useState(suggestedParent);
  const [folderName, setFolderName] = useState(suggestedFolder);
  const [cfgResource, setCfgResource] = useState(suggested.cfgResource);
  const [cfgAction, setCfgAction] = useState<'ensure' | 'start'>('ensure');
  const [cfgFile, setCfgFile] = useState(suggested.cfgFile);
  const [githubRef, setGithubRef] = useState(suggested.githubRef);
  const [patchCfg, setPatchCfg] = useState(suggested.patchCfg ?? true);
  const [useDetectedCfg, setUseDetectedCfg] = useState(
    activeLayout?.confidence !== 'low' && suggested.cfgFile === detectedCfg,
  );

  useEffect(() => {
    if (useDetectedCfg) {
      setCfgFile(detectedCfg);
    }
  }, [useDetectedCfg, detectedCfg]);

  const installPath = useMemo(
    () => joinPath(parentFolder, folderName),
    [parentFolder, folderName],
  );

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
        useAutoPaths: false,
      });
      await onInstalled();
    } catch (err) {
      setInstallError(err instanceof Error ? err.message : 'Install failed');
    } finally {
      setInstalling(false);
    }
  }

  return (
    <div className="fm-install-layout">
      <div>
        <InstallStep step={1} title="Install location" description="Choose where this resource is placed on your server">
          <p className="fm-field-hint mb-3">{layoutLabel(activeLayout)}</p>

          <FieldGroup label="Parent folder" hint="The directory that will contain the resource folder">
            <div className="fm-install-path-row">
              <input
                value={parentFolder}
                onChange={(e) => setParentFolder(e.target.value)}
                className="fm-field-input min-w-0 flex-1"
                placeholder="/resources"
              />
              <Button type="button" variant="secondary" onClick={() => setPickerOpen(true)}>
                <FolderSearch className="h-4 w-4" aria-hidden />
                Browse
              </Button>
            </div>
          </FieldGroup>

          <FieldGroup label="Resource folder name" hint="Folder name created inside the parent directory">
            <input
              value={folderName}
              onChange={(e) => {
                setFolderName(e.target.value);
                setCfgResource(cfgResourceFromPath(joinPath(parentFolder, e.target.value), resolved.repo));
              }}
              className="fm-field-input"
              placeholder={resolved.repo}
            />
          </FieldGroup>

          <div className="fm-install-path-preview">
            <span className="text-[var(--muted)]">Full path:</span>
            <code>{installPath}</code>
          </div>

          {activeLayout && activeLayout.confidence !== 'low' ? (
            <button
              type="button"
              className="fm-install-preset"
              onClick={() => {
                setParentFolder(detectedResources);
                setFolderName(resolved.repo);
                setCfgResource(cfgResourceFromPath(joinPath(detectedResources, resolved.repo), resolved.repo));
              }}
            >
              Use detected resources folder ({detectedResources})
            </button>
          ) : null}

          <FieldGroup label="Version" hint="Release or tag to download">
            <SelectControl className="fm-field-input" value={githubRef} onChange={(e) => setGithubRef(e.target.value)}>
              {refOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </SelectControl>
          </FieldGroup>
        </InstallStep>

        <InstallStep step={2} title="server.cfg" description="How the resource is started">
          <label className="fm-auto-toggle mb-3">
            <input
              type="checkbox"
              checked={useDetectedCfg}
              onChange={(e) => {
                setUseDetectedCfg(e.target.checked);
                if (e.target.checked) setCfgFile(detectedCfg);
              }}
            />
            <span>
              <span className="fm-auto-toggle-title">Use detected server.cfg</span>
              <span className="fm-auto-toggle-desc">{detectedCfg}</span>
            </span>
          </label>

          <div className="fm-field-grid">
            <FieldGroup label="Resource name">
              <input
                value={cfgResource}
                onChange={(e) => setCfgResource(e.target.value)}
                placeholder="Resource name"
                className="fm-field-input"
              />
            </FieldGroup>
            <FieldGroup label="Start command">
              <SelectControl
                className="fm-field-input"
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
                disabled={useDetectedCfg}
                onChange={(e) => {
                  setCfgFile(e.target.value);
                  setUseDetectedCfg(false);
                }}
                placeholder="/server.cfg"
                className="fm-field-input"
              />
            </FieldGroup>
          </div>

          <label className="fm-cfg-check">
            <input type="checkbox" checked={patchCfg} onChange={(e) => setPatchCfg(e.target.checked)} />
            <span>
              Add <code>{cfgPreview}</code> to the config
            </span>
          </label>
        </InstallStep>

        {installError ? (
          <p className="fm-install-error">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {installError}
          </p>
        ) : null}

        {!canInstall ? (
          <p className="fm-script-permission">
            You don&apos;t have permission to install marketplace resources.
          </p>
        ) : null}
      </div>

      <aside className="fm-install-aside">
        <div className="fm-install-preview">
          <Terminal className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
          <div className="min-w-0">
            <p className="fm-install-preview-label">Config preview</p>
            <code className="fm-install-preview-code">{patchCfg ? cfgPreview : 'No cfg changes'}</code>
          </div>
        </div>

        <div className="fm-install-summary">
          <p className="fm-install-summary-label">Install destination</p>
          <code className="fm-install-summary-path">{installPath}</code>
          <p className="fm-install-summary-label">Version</p>
          <p className="fm-install-summary-value">
            {refOptions.find((o) => o.value === githubRef)?.label ?? githubRef}
          </p>
        </div>

        <div className="fm-install-cta-wrap">
          <Button
            type="button"
            disabled={!canInstall || installing || !folderName.trim()}
            onClick={() => void install()}
            className="fm-install-cta"
          >
            {installing ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            Install now
          </Button>
          <p className="fm-install-footnote">
            <FolderOpen className="h-3.5 w-3.5" aria-hidden />
            Downloads release, extracts files, and patches cfg if enabled
          </p>
        </div>
      </aside>

      {pickerOpen ? (
        <MarketplaceFolderPicker
          serverId={serverId}
          initialDir={parentFolder || detectedResources}
          onClose={() => setPickerOpen(false)}
          onSelect={(path) => {
            setParentFolder(path);
            setCfgResource(cfgResourceFromPath(joinPath(path, folderName), resolved.repo));
            setPickerOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
