import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Github, Package, RefreshCw, Sparkles, Trash2, TrendingUp } from 'lucide-react';
import { api, type MarketplaceInstallEntry } from '../../lib/api';
import { MarketplaceDiscover } from './MarketplaceDiscover';
import { useServer } from '../../context/ServerContext';
import { useServerRouteId } from '../../hooks/useServerRouteId';
import { useToast } from '../../context/ToastContext';
import { getServerAccess } from '../../lib/server-access';
import { isFiveMServer } from '../../lib/server-eggs';
import { Button } from '../../components/Layout';
import { Spinner } from '../../components/ui';
import { ServerErrorBanner, ServerPage } from '../../components/server/ServerPage';
import {
  MarketplaceEmptyState,
  MarketplacePage,
  MarketplaceSegmentTabs,
} from '../../components/marketplace/MarketplaceChrome';

type Tab = 'discover' | 'installed';

export function ServerMarketplacePage() {
  const [searchParams] = useSearchParams();
  const resolvedId = useServerRouteId();
  const { server } = useServer();
  const toast = useToast();
  const access = getServerAccess(server);

  const [tab, setTab] = useState<Tab>('discover');
  const [installed, setInstalled] = useState<MarketplaceInstallEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [allowGithubInstalls, setAllowGithubInstalls] = useState(true);

  const refresh = useCallback(async () => {
    const data = await api.client.marketplace(resolvedId);
    setInstalled(data.installed);
    const githubOn = data.allowGithubInstalls !== false;
    setAllowGithubInstalls(githubOn);
    setTab((current) => {
      if (current === 'installed') return current;
      return githubOn ? 'discover' : 'installed';
    });
  }, [resolvedId]);

  useEffect(() => {
    if (!resolvedId || !isFiveMServer(server)) return;
    setLoading(true);
    setError('');
    refresh()
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load marketplace'))
      .finally(() => setLoading(false));
  }, [resolvedId, server, refresh]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'installed' || tabParam === 'discover') {
      setTab(tabParam);
    }
  }, [searchParams]);

  const tabs = useMemo(() => {
    const items: Array<{ id: Tab; label: string; icon: typeof Sparkles; badge?: number }> = [];
    if (allowGithubInstalls) items.push({ id: 'discover', label: 'Discover', icon: TrendingUp });
    items.push({ id: 'installed', label: 'Installed', icon: Package, badge: installed.length || undefined });
    return items;
  }, [allowGithubInstalls, installed.length]);

  async function runCatalogAction(pluginId: string, action: 'uninstall' | 'update', label: string) {
    setBusyId(`catalog:${pluginId}`);
    try {
      if (action === 'uninstall') await api.client.marketplaceUninstall(resolvedId, pluginId);
      if (action === 'update') await api.client.marketplaceUpdate(resolvedId, pluginId);
      await refresh();
      toast.success(label);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  async function runGithubAction(installId: string, action: 'uninstall' | 'update', label: string) {
    setBusyId(`github:${installId}`);
    try {
      if (action === 'uninstall') await api.client.marketplaceGithubUninstall(resolvedId, installId);
      if (action === 'update') await api.client.marketplaceGithubUpdate(resolvedId, installId);
      await refresh();
      toast.success(label);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  if (server.marketplaceEnabled === false) {
    return (
      <ServerPage>
        <MarketplaceEmptyState
          icon={Package}
          title="Marketplace disabled"
          description="Your host administrator has turned off the FiveM marketplace."
        />
      </ServerPage>
    );
  }

  if (!isFiveMServer(server)) {
    return (
      <ServerPage>
        <MarketplaceEmptyState
          icon={Box}
          title="FiveM only"
          description="The marketplace is available on FiveM servers."
        />
      </ServerPage>
    );
  }

  return (
    <ServerPage>
      <MarketplacePage>
        <header className="fm-hub-hero">
          <div className="fm-hub-hero-glow" aria-hidden />
          <div className="fm-hub-hero-body">
            <div>
              <span className="fm-hub-eyebrow">
                <Sparkles className="h-3 w-3" aria-hidden />
                FiveM Resource Hub
              </span>
              <h1 className="fm-hub-title">Discover & install from GitHub</h1>
              <p className="fm-hub-lead">
                Browse community scripts, open any public repository, and deploy resources to your server in one
                click — releases download automatically and server.cfg can be patched for you.
              </p>
            </div>
            <div className="fm-hub-stats">
              <div className="fm-hub-stat">
                <p className="fm-hub-stat-label">Installed</p>
                <p className="fm-hub-stat-value">{installed.length}</p>
              </div>
              <div className="fm-hub-stat">
                <p className="fm-hub-stat-label">Source</p>
                <p className="fm-hub-stat-value">
                  <span className="inline-flex items-center gap-1.5">
                    <Github className="h-4 w-4" aria-hidden />
                    GitHub
                  </span>
                </p>
              </div>
            </div>
          </div>
          <div className="fm-hub-footer">
            <MarketplaceSegmentTabs tabs={tabs} active={tab} onChange={setTab} />
            <p className="fm-hub-note">Install, update, and remove without leaving the panel.</p>
          </div>
        </header>

        {error ? (
          <div>
            <ServerErrorBanner message={error} />
          </div>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner className="h-9 w-9" />
          </div>
        ) : (
          <>
            {allowGithubInstalls ? (
              <div className={tab === 'discover' ? '' : 'hidden'} aria-hidden={tab !== 'discover'}>
                <MarketplaceDiscover serverId={resolvedId} />
              </div>
            ) : null}
            {tab === 'installed' ? (
              <InstalledPanel
                items={installed}
                canInstall={access.canInstallMarketplace}
                busyId={busyId}
                onCatalogUninstall={(id) => void runCatalogAction(id, 'uninstall', 'Removed')}
                onCatalogUpdate={(id) => void runCatalogAction(id, 'update', 'Updated')}
                onGithubUninstall={(id) => void runGithubAction(id, 'uninstall', 'Removed')}
                onGithubUpdate={(id) => void runGithubAction(id, 'update', 'Updated')}
                onBrowse={() => setTab('discover')}
                allowGithub={allowGithubInstalls}
              />
            ) : null}
          </>
        )}
      </MarketplacePage>
    </ServerPage>
  );
}

function InstalledPanel({
  items,
  canInstall,
  busyId,
  onCatalogUninstall,
  onCatalogUpdate,
  onGithubUninstall,
  onGithubUpdate,
  onBrowse,
  allowGithub,
}: {
  items: MarketplaceInstallEntry[];
  canInstall: boolean;
  busyId: string | null;
  onCatalogUninstall: (id: string) => void;
  onCatalogUpdate: (id: string) => void;
  onGithubUninstall: (id: string) => void;
  onGithubUpdate: (id: string) => void;
  onBrowse: () => void;
  allowGithub: boolean;
}) {
  if (items.length === 0) {
    return (
      <MarketplaceEmptyState
        icon={Package}
        title="Nothing installed yet"
        description={
          allowGithub
            ? 'Browse Discover for popular community scripts on GitHub.'
            : 'GitHub installs are disabled on this panel.'
        }
        action={
          allowGithub ? (
            <Button className="mt-4" size="sm" onClick={onBrowse}>
              <TrendingUp className="h-3.5 w-3.5" />
              Browse resources
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="fm-installed-list">
      {items.map((item) => {
        const isGithub = item.source === 'github';
        const busy = isGithub ? busyId === `github:${item.id}` : busyId === `catalog:${item.pluginId}`;

        return (
          <article key={item.id} className="fm-installed-card">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="fm-installed-name">{item.name}</p>
                <span className={`fm-chip${isGithub ? ' fm-chip--fivem' : ''}`}>
                  {isGithub ? 'GitHub' : 'Legacy'}
                </span>
              </div>
              <p className="fm-installed-meta">
                {item.installPath} · {item.installedRef}
              </p>
            </div>
            <div className="fm-installed-actions">
              <Button
                variant="subtle"
                size="sm"
                disabled={!canInstall || busy}
                onClick={() => (isGithub ? onGithubUpdate(item.id) : onCatalogUpdate(item.pluginId))}
              >
                {busy ? <Spinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Update
              </Button>
              <Button
                variant="subtle"
                size="sm"
                disabled={!canInstall || busy}
                onClick={() => (isGithub ? onGithubUninstall(item.id) : onCatalogUninstall(item.pluginId))}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
