import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Github, Package, Store } from 'lucide-react';
import { api } from '../../lib/api';
import { useServer } from '../../context/ServerContext';
import { useServerRouteId } from '../../hooks/useServerRouteId';
import { useToast } from '../../context/ToastContext';
import { getServerAccess } from '../../lib/server-access';
import { isFiveMServer } from '../../lib/server-eggs';
import { useMarketplacePaths } from '../../lib/marketplace-paths';
import { Spinner } from '../../components/ui';
import { ServerErrorBanner, ServerPage } from '../../components/server/ServerPage';
import { MarketplaceEmptyState, MarketplaceSegmentTabs } from '../../components/marketplace/MarketplaceChrome';
import { useFivemMarketplace } from './hooks/useFivemMarketplace';
import { MarketplaceHeader } from './components/MarketplaceHeader';
import { MarketplaceGithubTab } from './tabs/GithubTab';
import { CatalogTab } from './tabs/CatalogTab';
import { InstalledTab } from './tabs/InstalledTab';

type Tab = 'catalog' | 'github' | 'installed';

export function FivemMarketplaceView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const resolvedId = useServerRouteId();
  const { server } = useServer();
  const toast = useToast();
  const access = getServerAccess(server);
  const navigate = useNavigate();
  const { scriptPath, catalogPath } = useMarketplacePaths();

  const enabled = isFiveMServer(server) && server.marketplaceEnabled !== false;
  const { overview, loading, refreshing, error, refresh } = useFivemMarketplace(resolvedId, enabled);

  const initialTab = (searchParams.get('tab') as Tab | null) ?? 'catalog';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [busyId, setBusyId] = useState<string | null>(null);

  const setTabPersist = useCallback(
    (next: Tab) => {
      setTab(next);
      setSearchParams({ tab: next }, { replace: true });
    },
    [setSearchParams],
  );

  useEffect(() => {
    const t = searchParams.get('tab') as Tab | null;
    if (t === 'catalog' || t === 'github' || t === 'installed') setTab(t);
  }, [searchParams]);

  useEffect(() => {
    if (!overview) return;
    const tabAllowed =
      (tab === 'catalog' && overview.features.catalog) ||
      (tab === 'github' && overview.features.github) ||
      tab === 'installed';
    if (tabAllowed) return;
    const fallback: Tab = overview.features.catalog
      ? 'catalog'
      : overview.features.github
        ? 'github'
        : 'installed';
    setTabPersist(fallback);
  }, [overview, tab, setTabPersist]);

  const layoutLabel = useMemo(() => {
    const layout = overview?.layout;
    if (!layout || layout.confidence === 'low') return 'Default server paths';
    if (layout.layout === 'txadmin' && layout.profileName) return `txAdmin · ${layout.profileName}`;
    if (layout.layout === 'flat') return 'Standard resources folder';
    return 'Detected layout';
  }, [overview?.layout]);

  const tabs = useMemo(() => {
    const items: Array<{ id: Tab; label: string; icon: typeof Store; badge?: number }> = [];
    if (overview?.features.catalog) {
      items.push({ id: 'catalog', label: 'Catalog', icon: Store });
    }
    if (overview?.features.github) {
      items.push({ id: 'github', label: 'GitHub', icon: Github });
    }
    items.push({
      id: 'installed',
      label: 'Installed',
      icon: Package,
      badge: overview?.stats.installedCount || undefined,
    });
    return items;
  }, [overview]);

  async function runCatalogAction(pluginId: string, action: 'install' | 'uninstall' | 'update', name: string) {
    setBusyId(`catalog:${pluginId}`);
    try {
      if (action === 'install') await api.client.marketplaceInstall(resolvedId, pluginId);
      if (action === 'uninstall') await api.client.marketplaceUninstall(resolvedId, pluginId);
      if (action === 'update') await api.client.marketplaceUpdate(resolvedId, pluginId);
      await refresh();
      toast.success(
        action === 'install' ? `Installed ${name}` : action === 'update' ? `Updated ${name}` : `Removed ${name}`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  async function runGithubAction(installId: string, action: 'uninstall' | 'update', name: string) {
    setBusyId(`github:${installId}`);
    try {
      if (action === 'uninstall') await api.client.marketplaceGithubUninstall(resolvedId, installId);
      if (action === 'update') await api.client.marketplaceGithubUpdate(resolvedId, installId);
      await refresh();
      toast.success(action === 'update' ? `Updated ${name}` : `Removed ${name}`);
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
          description="Your host has turned off the FiveM marketplace."
        />
      </ServerPage>
    );
  }

  if (!isFiveMServer(server)) {
    return (
      <ServerPage>
        <MarketplaceEmptyState
          icon={Box}
          title="FiveM servers only"
          description="This store is available on FiveM game servers."
        />
      </ServerPage>
    );
  }

  const resourcesHint = overview?.layout?.resourcesPath || '/resources';

  return (
    <ServerPage>
      <div className="ds-srv-plugins-shell ds-srv-mp-shell">
        <MarketplaceHeader
          serverName={server.name}
          eggName={server.egg.name}
          eggLogoUrl={server.egg.logoUrl}
          layoutLabel={layoutLabel}
          overview={overview}
          refreshing={refreshing || (loading && !overview)}
          onRefresh={() => void refresh()}
          onCatalogClick={
            overview?.features.catalog
              ? () => setTabPersist('catalog')
              : undefined
          }
          onInstalledClick={() => setTabPersist('installed')}
        />

        <div className="ds-srv-plugins-body">
          {overview ? (
            <div className="ds-srv-plugins-tabs">
              <MarketplaceSegmentTabs tabs={tabs} active={tab} onChange={setTabPersist} />
              <p className="ds-srv-plugins-tabs-hint">
                One-click FiveM resources · installs under <code>{resourcesHint}</code>
              </p>
            </div>
          ) : null}

          {error ? <ServerErrorBanner message={error} /> : null}

          {loading && !overview ? (
            <div className="ds-srv-plugins-loading" role="status" aria-live="polite">
              <Spinner className="h-7 w-7" />
              <span className="sr-only">Loading marketplace</span>
            </div>
          ) : overview ? (
            <>
              {tab === 'catalog' && overview.features.catalog ? (
                <CatalogTab
                  key="catalog"
                  serverId={resolvedId}
                  featured={overview.featuredCatalog}
                  canInstall={access.canInstallMarketplace}
                  busyId={busyId}
                  onOpen={(item) => navigate(catalogPath(item.slug || item.id))}
                  onInstall={(item) => void runCatalogAction(item.id, 'install', item.name)}
                />
              ) : tab === 'catalog' ? (
                <MarketplaceEmptyState
                  icon={Store}
                  title="Host catalog unavailable"
                  description="Ask your host to enable the curated FiveM catalog."
                />
              ) : null}

              {tab === 'github' && overview.features.github ? (
                <MarketplaceGithubTab
                  serverId={resolvedId}
                  onOpenRepo={(owner, repo) => navigate(scriptPath(owner, repo))}
                />
              ) : tab === 'github' ? (
                <MarketplaceEmptyState
                  icon={Github}
                  title="GitHub installs disabled"
                  description="Your host has turned off GitHub installs for this panel."
                />
              ) : null}

              {tab === 'installed' ? (
                <InstalledTab
                  items={overview.installed}
                  canInstall={access.canInstallMarketplace}
                  busyId={busyId}
                  catalogPath={catalogPath}
                  scriptPath={scriptPath}
                  onCatalogUninstall={(id, name) => void runCatalogAction(id, 'uninstall', name)}
                  onCatalogUpdate={(id, name) => void runCatalogAction(id, 'update', name)}
                  onGithubUninstall={(id, name) => void runGithubAction(id, 'uninstall', name)}
                  onGithubUpdate={(id, name) => void runGithubAction(id, 'update', name)}
                  onBrowse={() => setTabPersist(overview.features.catalog ? 'catalog' : 'github')}
                  allowBrowse={overview.features.catalog || overview.features.github}
                />
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </ServerPage>
  );
}
