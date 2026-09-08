import { useCallback, useEffect, useState } from 'react';
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
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
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
    return normalized;
  }, [serverId]);

  useEffect(() => {
    if (!serverId || !enabled) return;
    setLoading(true);
    setError('');
    refresh()
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load marketplace'))
      .finally(() => setLoading(false));
  }, [serverId, enabled, refresh]);

  return { overview, loading, error, refresh, setError };
}
