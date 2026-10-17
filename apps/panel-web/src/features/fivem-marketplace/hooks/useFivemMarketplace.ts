import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type MarketplaceInstallEntry, type MarketplaceCatalogPlugin, type FivemServerLayout } from '../../../lib/api';

export interface FivemMarketplaceOverview {
  isFiveM: boolean;
  layout: FivemServerLayout;
  stats: {
    installedCount: number;
    catalogCount: number;
    catalogInstalledCount: number;
    githubInstalledCount: number;
  };
  features: {
    catalog: boolean;
    github: boolean;
  };
  featuredCatalog: MarketplaceCatalogPlugin[];
  installed: MarketplaceInstallEntry[];
  /** @deprecated legacy fields */
  allowGithubInstalls?: boolean;
  allowCatalogInstalls?: boolean;
  catalog?: MarketplaceCatalogPlugin[];
}

export function useFivemMarketplace(serverId: string, enabled: boolean) {
  const [overview, setOverview] = useState<FivemMarketplaceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const loadedForIdRef = useRef<string | null>(null);

  const refresh = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    const data = await api.client.marketplace(serverId);
    const normalized: FivemMarketplaceOverview = {
      ...data,
      layout: (data as FivemMarketplaceOverview).layout ?? {
        layout: 'unknown',
        resourcesPath: '/resources',
        resourcesBase: '/resources',
        cfgFile: '/server.cfg',
        profileName: null,
        profilePath: null,
        confidence: 'low',
      },
      stats: (data as FivemMarketplaceOverview).stats ?? {
        installedCount: data.installed.length,
        catalogCount: data.catalog?.length ?? 0,
        catalogInstalledCount: data.installed.filter((i: MarketplaceInstallEntry) => i.source === 'catalog').length,
        githubInstalledCount: data.installed.filter((i: MarketplaceInstallEntry) => i.source === 'github').length,
      },
      features: (data as FivemMarketplaceOverview).features ?? {
        catalog: data.allowCatalogInstalls !== false,
        github: data.allowGithubInstalls !== false,
      },
      featuredCatalog:
        (data as FivemMarketplaceOverview).featuredCatalog ?? data.catalog ?? [],
    };
    setOverview(normalized);
    loadedForIdRef.current = serverId;
    setLoading(false);
    setRefreshing(false);
    return normalized;
  }, [serverId]);

  useEffect(() => {
    if (!serverId || !enabled) return;
    let cancelled = false;
    const soft = loadedForIdRef.current === serverId;
    setError('');
    refresh(soft).catch((err) => {
      if (cancelled) return;
      setError(err instanceof Error ? err.message : 'Failed to load marketplace');
      setLoading(false);
      setRefreshing(false);
    });
    return () => {
      cancelled = true;
    };
  }, [serverId, enabled, refresh]);

  return {
    overview,
    loading,
    refreshing,
    error,
    refresh: () => refresh(true),
    setError,
  };
}
