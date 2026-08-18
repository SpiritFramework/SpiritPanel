import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, type GithubRepoResolved } from '../lib/api';
import {
  getMarketplaceCache,
  marketplaceCacheKey,
  setMarketplaceCache,
} from '../lib/marketplace-cache';
import { useMarketplacePaths } from '../lib/marketplace-paths';
import type { MarketplaceScriptLocationState } from '../lib/marketplace-script-state';

export function useMarketplaceScriptResolved() {
  const location = useLocation();
  const { resolvedId, owner, repo } = useMarketplacePaths();
  const preview = (location.state as MarketplaceScriptLocationState | null)?.preview;

  const [resolved, setResolved] = useState<GithubRepoResolved | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken((n) => n + 1);
  }, []);

  const load = useCallback(async () => {
    if (!resolvedId || !owner || !repo) {
      setError('Invalid script URL');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cacheKey = marketplaceCacheKey(resolvedId, 'resolve', owner, repo);
      // Skip local cache after an explicit retry.
      const cached = reloadToken === 0 ? getMarketplaceCache<GithubRepoResolved>(cacheKey) : null;
      const repoData =
        cached ?? (await api.client.marketplaceGithubResolve(resolvedId, `${owner}/${repo}`));

      if (!cached) {
        setMarketplaceCache(cacheKey, repoData, 10 * 60 * 1000);
      }

      setResolved(repoData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load script');
      setResolved(null);
    } finally {
      setLoading(false);
    }
  }, [resolvedId, owner, repo, reloadToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const displayName = resolved?.name ?? preview?.name ?? repo ?? 'Script';
  const displayOwner = resolved?.owner ?? preview?.owner ?? owner ?? '';
  const displayRepo = resolved?.repo ?? preview?.repo ?? repo ?? '';

  return {
    resolvedId,
    owner,
    repo,
    resolved,
    loading,
    error,
    preview,
    displayName,
    displayOwner,
    displayRepo,
    reload,
  };
}
