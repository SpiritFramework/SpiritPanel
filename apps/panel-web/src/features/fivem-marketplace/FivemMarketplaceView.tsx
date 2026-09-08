import { useCallback, useEffect, useMemo, useState } from 'react';

import { useNavigate, useSearchParams } from 'react-router-dom';

import { Box, Package } from 'lucide-react';

import { api } from '../../lib/api';

import { useServer } from '../../context/ServerContext';

import { useServerRouteId } from '../../hooks/useServerRouteId';

import { useToast } from '../../context/ToastContext';

import { getServerAccess } from '../../lib/server-access';

import { isFiveMServer } from '../../lib/server-eggs';

import { useMarketplacePaths } from '../../lib/marketplace-paths';

import { Spinner } from '../../components/ui';

import { ServerErrorBanner, ServerPage } from '../../components/server/ServerPage';

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

  const { overview, loading, error, refresh } = useFivemMarketplace(resolvedId, enabled);



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

        <div className="ds-page ds-stack ds-card ds-card-body py-16 text-center">

          <Package className="mx-auto h-10 w-10 text-[var(--muted)]" />

          <h2 className="text-lg font-semibold">Marketplace disabled</h2>

          <p className="text-sm text-[var(--muted)]">Your host has turned off the FiveM marketplace.</p>

        </div>

      </ServerPage>

    );

  }



  if (!isFiveMServer(server)) {

    return (

      <ServerPage>

        <div className="ds-page ds-stack ds-card ds-card-body py-16 text-center">

          <Box className="mx-auto h-10 w-10 text-[var(--muted)]" />

          <h2 className="text-lg font-semibold">FiveM servers only</h2>

          <p className="text-sm text-[var(--muted)]">This store is available on FiveM game servers.</p>

        </div>

      </ServerPage>

    );

  }



  return (

    <ServerPage>

      <div className="ds-page ds-stack">

        {overview ? (

          <MarketplaceHeader

            tab={tab}

            layoutLabel={layoutLabel}

            overview={overview}

            onTabChange={setTabPersist}

          />

        ) : (

          <div className="ds-marketplace-header">

            <div className="ds-marketplace-header__banner">

              <div className="ds-marketplace-header__brand">

                <div className="h-11 w-11 shrink-0 rounded-xl bg-[var(--bg-elevated)]" />

                <div className="space-y-2">

                  <div className="h-3 w-24 rounded bg-[var(--bg-elevated)]" />

                  <div className="h-6 w-48 rounded bg-[var(--bg-elevated)]" />

                </div>

              </div>

            </div>

          </div>

        )}



        {error ? <ServerErrorBanner message={error} /> : null}



        {loading || !overview ? (

          <div className="flex justify-center py-24">

            <Spinner className="h-9 w-9" />

          </div>

        ) : (

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

              <div className="ds-card ds-card-body py-12 text-center text-sm text-[var(--muted)]">

                Host catalog is not available on this panel.

              </div>

            ) : null}



            {tab === 'github' && overview.features.github ? (

              <MarketplaceGithubTab

                serverId={resolvedId}

                onOpenRepo={(owner, repo) => navigate(scriptPath(owner, repo))}

              />

            ) : tab === 'github' ? (

              <div className="ds-card ds-card-body py-12 text-center text-sm text-[var(--muted)]">

                GitHub installs are not enabled on this panel.

              </div>

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

        )}

      </div>

    </ServerPage>

  );

}

