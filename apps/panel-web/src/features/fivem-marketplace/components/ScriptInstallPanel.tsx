import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  Download,
  FolderOpen,
  FolderSearch,
  Terminal,
} from 'lucide-react';
import { api, type FivemServerLayout, type GithubRepoResolved } from '../../../lib/api';
import { cfgResourceFromPath } from '../../../lib/marketplace-format';
import { joinPath, parentPath } from '../../../lib/paths';
import { MarketplaceFolderPicker } from '../../../components/marketplace/MarketplaceFolderPicker';
import { Checkbox } from '../../../components/Checkbox';
import { SelectControl } from '../../../components/SelectControl';
import { Button } from '../../../components/Layout';
import { Spinner } from '../../../components/ui';
import { DetailPanel } from './Layout';

function layoutLabel(layout: FivemServerLayout | null | undefined): string {
  if (!layout || layout.confidence === 'low') return 'Could not scan server — using /resources';
  if (layout.layout === 'txadmin' && layout.profileName) return `txAdmin · ${layout.profileName}`;
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
    <div className="ds-stack ds-stack--tight">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">
          {step}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text)]">{title}</p>
          {description ? <p className="text-xs text-[var(--muted)]">{description}</p> : null}
        </div>
      </div>
      <div className="ml-10">{children}</div>
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
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--text)]">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[10px] text-[var(--muted)]">{hint}</span> : null}
    </label>
  );
}

export function ScriptInstallPanel({
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
  const suggestedFolder = suggested.installPath.split('/').filter(Boolean).pop() ?? resolved.repo;

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
    if (useDetectedCfg) setCfgFile(detectedCfg);
  }, [useDetectedCfg, detectedCfg]);

  const installPath = useMemo(() => joinPath(parentFolder, folderName), [parentFolder, folderName]);

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
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="ds-stack">
        <DetailPanel title="Install wizard" description="Configure where and how this resource is installed">
          <div className="ds-stack">
            <InstallStep step={1} title="Install location" description="Choose where this resource is placed">
              <p className="mb-3 text-xs text-[var(--muted)]">{layoutLabel(activeLayout)}</p>

              <div className="ds-stack ds-stack--tight">
                <FieldGroup label="Parent folder" hint="Directory that will contain the resource folder">
                  <div className="flex gap-2">
                    <input
                      value={parentFolder}
                      onChange={(e) => setParentFolder(e.target.value)}
                      className="ds-field min-w-0 flex-1 font-mono text-xs"
                      placeholder="/resources"
                    />
                    <Button type="button" variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>
                      <FolderSearch className="h-4 w-4" aria-hidden />
                      Browse
                    </Button>
                  </div>
                </FieldGroup>

                <FieldGroup label="Resource folder name">
                  <input
                    value={folderName}
                    onChange={(e) => {
                      setFolderName(e.target.value);
                      setCfgResource(cfgResourceFromPath(joinPath(parentFolder, e.target.value), resolved.repo));
                    }}
                    className="ds-field font-mono text-xs"
                    placeholder={resolved.repo}
                  />
                </FieldGroup>

                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 font-mono text-xs">
                  <span className="text-[var(--muted)]">Full path: </span>
                  <span className="text-[var(--text)]">{installPath}</span>
                </div>

                {activeLayout && activeLayout.confidence !== 'low' ? (
                  <button
                    type="button"
                    className="text-left text-xs font-medium text-[var(--accent)] hover:underline"
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
                  <SelectControl className="ds-field" value={githubRef} onChange={(e) => setGithubRef(e.target.value)}>
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
              <div className="ds-stack ds-stack--tight">
                <Checkbox
                  size="comfortable"
                  checked={useDetectedCfg}
                  onChange={(checked) => {
                    setUseDetectedCfg(checked);
                    if (checked) setCfgFile(detectedCfg);
                  }}
                  label="Use detected server.cfg"
                  description={detectedCfg}
                  descriptionMono
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <FieldGroup label="Resource name">
                    <input
                      value={cfgResource}
                      onChange={(e) => setCfgResource(e.target.value)}
                      className="ds-field"
                      placeholder="Resource name"
                    />
                  </FieldGroup>
                  <FieldGroup label="Start command">
                    <SelectControl
                      className="ds-field"
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
                      className="ds-field font-mono text-xs"
                      placeholder="/server.cfg"
                    />
                  </FieldGroup>
                </div>

                <Checkbox
                  size="comfortable"
                  checked={patchCfg}
                  onChange={setPatchCfg}
                  label="Add start command to config"
                  description={`Appends ${cfgPreview} to ${cfgFile}`}
                  descriptionMono
                />
              </div>
            </InstallStep>
          </div>
        </DetailPanel>

        {installError ? (
          <p className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {installError}
          </p>
        ) : null}

        {!canInstall ? (
          <p className="text-sm text-[var(--muted)]">
            You don&apos;t have permission to install marketplace resources.
          </p>
        ) : null}
      </div>

      <aside className="ds-stack">
        <div className="ds-card ds-card-body">
          <div className="flex items-start gap-3">
            <Terminal className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Config preview</p>
              <code className="mt-1 block font-mono text-sm text-[var(--text)]">
                {patchCfg ? cfgPreview : 'No cfg changes'}
              </code>
            </div>
          </div>
        </div>

        <div className="ds-card ds-card-body ds-stack ds-stack--tight text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Install destination</p>
            <code className="mt-1 block break-all font-mono text-xs text-[var(--text)]">{installPath}</code>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Version</p>
            <p className="mt-1 text-[var(--text)]">
              {refOptions.find((o) => o.value === githubRef)?.label ?? githubRef}
            </p>
          </div>
        </div>

        <Button
          type="button"
          disabled={!canInstall || installing || !folderName.trim()}
          onClick={() => void install()}
          className="w-full"
        >
          {installing ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          Install now
        </Button>

        <p className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
          <FolderOpen className="h-3.5 w-3.5" aria-hidden />
          Downloads release, extracts files, and patches cfg if enabled
        </p>
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
