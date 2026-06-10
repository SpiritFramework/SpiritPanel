import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Download,
  ExternalLink,
  Layers,
  Package,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import {
  api,
  type FivemServerLayout,
  type MarketplaceCatalogEntry,
  type MarketplaceInstallEntry,
} from '../../lib/api';
import { MarketplaceDiscover } from './MarketplaceDiscover';
import { useServer } from '../../context/ServerContext';
import { useServerRouteId } from '../../hooks/useServerRouteId';
import { useToast } from '../../context/ToastContext';
import { getServerAccess } from '../../lib/server-access';
import { isFiveMServer } from '../../lib/server-eggs';
import { Button } from '../../components/Layout';
import { Spinner } from '../../components/ui';
import { ServerErrorBanner, ServerPage } from '../../components/server/ServerPage';

type Tab = 'discover' | 'catalog' | 'installed';

const CATEGORY_LABELS: Record<string, string> = {
  library: 'Library',
  script: 'Script',
  map: 'Map',
  vehicle: 'Vehicle',
  other: 'Other',
};

export function ServerMarketplacePage() {
  const [searchParams] = useSearchParams();
  const resolvedId = useServerRouteId();
  const { server } = useServer();
  const toast = useToast();
  const access = getServerAccess(server);

  const [tab, setTab] = useState<Tab>('discover');
  const [catalog, setCatalog] = useState<MarketplaceCatalogEntry[]>([]);
  const [installed, setInstalled] = useState<MarketplaceInstallEntry[]>([]);
  const [serverLayout, setServerLayout] = useState<FivemServerLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [allowGithubInstalls, setAllowGithubInstalls] = useState(true);
  const [allowCatalog, setAllowCatalog] = useState(true);

  const refresh = useCallback(async () => {
    const data = await api.client.marketplace(resolvedId);
    setCatalog(data.catalog);
    setInstalled(data.installed);
    const githubOn = data.allowGithubInstalls !== false;
    const catalogOn = data.allowCatalog !== false;
    setAllowGithubInstalls(githubOn);
    setAllowCatalog(catalogOn);
    setServerLayout(data.layout ?? null);
    setTab((current) => {
      if (current === 'installed') return current;
      if (githubOn) return 'discover';
      if (catalogOn) return 'catalog';
      return 'installed';
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
    if (tabParam === 'installed' || tabParam === 'catalog' || tabParam === 'discover') {
      setTab(tabParam);
    }
  }, [searchParams]);

  const tabs = useMemo(() => {
    const items: Array<{ id: Tab; label: string; icon: typeof Sparkles }> = [];
    if (allowGithubInstalls) items.push({ id: 'discover', label: 'Discover', icon: TrendingUp });
    if (allowCatalog) items.push({ id: 'catalog', label: 'Host catalog', icon: Layers });
    items.push({ id: 'installed', label: 'Installed', icon: Package });
    return items;
  }, [allowGithubInstalls, allowCatalog]);

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [catalog, catalogSearch]);

  async function runCatalogAction(pluginId: string, action: 'install' | 'uninstall' | 'update', label: string) {
    setBusyId(`catalog:${pluginId}`);
    try {
      if (action === 'install') await api.client.marketplaceInstall(resolvedId, pluginId);
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
        <div className="mp-empty-state">
          <Package className="h-10 w-10 text-[var(--muted)]" />
          <p className="mt-3 font-medium">Marketplace disabled</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Your host administrator has turned off the FiveM marketplace.</p>
        </div>
      </ServerPage>
    );
  }

  if (!isFiveMServer(server)) {
    return (
      <ServerPage>
        <div className="mp-empty-state">
          <Box className="h-10 w-10 text-[var(--muted)]" />
          <p className="mt-3 font-medium">FiveM only</p>
          <p className="mt-1 text-sm text-[var(--muted)]">The marketplace is available on FiveM servers.</p>
        </div>
      </ServerPage>
    );
  }

  return (
    <ServerPage>
      <div className="mp-shell">
        {/* Hero */}
        <header className="mp-hero">
          <div className="mp-hero-glow" />
          <div className="mp-hero-panel">
            <div className="mp-hero-copy">
              <span className="mp-hero-badge">
                <Sparkles className="h-3 w-3" />
                FiveM Resource Hub
              </span>
              <h1 className="mp-hero-title">Discover and install FiveM resources</h1>
              <p className="mp-hero-description">
                Install curated host catalog plugins or popular GitHub scripts directly to your server.
              </p>
            </div>
            <div className="mp-hero-widgets">
              <div className="mp-hero-widget">
                <p className="mp-hero-widget-label">Installed resources</p>
                <p className="mp-hero-widget-value">{installed.length}</p>
              </div>
              {allowCatalog && (
                <div className="mp-hero-widget">
                  <p className="mp-hero-widget-label">Host catalog</p>
                  <p className="mp-hero-widget-value">{catalog.length}</p>
                </div>
              )}
              <div className="mp-hero-widget">
                <p className="mp-hero-widget-label">Discovery</p>
                <p className="mp-hero-widget-value">GitHub scripts</p>
              </div>
            </div>
          </div>
          <div className="mp-hero-footer">
            <nav className="mp-tabs">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`mp-tab ${active ? 'mp-tab--active' : ''}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                    {t.id === 'installed' && installed.length > 0 && (
                      <span className="mp-tab-count">{installed.length}</span>
                    )}
                  </button>
                );
              })}
            </nav>
            <p className="mp-hero-note">One-click install, update, and remove resources without leaving this page.</p>
          </div>
        </header>

        {error && (
          <div className="mb-4">
            <ServerErrorBanner message={error} />
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner className="h-9 w-9" />
          </div>
        ) : (
          <>
            {allowGithubInstalls && (
              <div className={tab === 'discover' ? '' : 'hidden'} aria-hidden={tab !== 'discover'}>
                <MarketplaceDiscover serverId={resolvedId} serverLayout={serverLayout} />
              </div>
            )}
            {tab === 'catalog' && allowCatalog ? (
          <div className="space-y-4">
            <div className="relative w-full max-w-lg">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="search"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Filter host catalog…"
                className="mp-search-input !py-2.5 !pl-10"
              />
            </div>
            <div className="mp-catalog-grid">
              {filteredCatalog.map((item) => (
                <CatalogCard
                  key={item.id}
                  item={item}
                  canInstall={access.canInstallMarketplace}
                  busy={busyId === `catalog:${item.id}`}
                  onInstall={() => void runCatalogAction(item.id, 'install', `${item.name} installed`)}
                  onUninstall={() => void runCatalogAction(item.id, 'uninstall', `${item.name} removed`)}
                  onUpdate={() => void runCatalogAction(item.id, 'update', `${item.name} updated`)}
                />
              ))}
            </div>
            {filteredCatalog.length === 0 && (
              <div className="mp-empty-state">
                <Layers className="h-8 w-8 text-[var(--muted)]" />
                <p className="mt-2 font-medium">No catalog entries</p>
                <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">
                  {catalog.length === 0
                    ? 'Your host has not added curated plugins yet.'
                    : 'No matches for your search.'}
                  {allowGithubInstalls && ' Browse Discover for popular community scripts.'}
                </p>
              </div>
            )}
          </div>
            ) : tab === 'installed' ? (
          <InstalledPanel
            items={installed}
            canInstall={access.canInstallMarketplace}
            busyId={busyId}
            onCatalogUninstall={(id) => void runCatalogAction(id, 'uninstall', 'Removed')}
            onCatalogUpdate={(id) => void runCatalogAction(id, 'update', 'Updated')}
            onGithubUninstall={(id) => void runGithubAction(id, 'uninstall', 'Removed')}
            onGithubUpdate={(id) => void runGithubAction(id, 'update', 'Updated')}
            onBrowse={() => setTab(allowGithubInstalls ? 'discover' : 'catalog')}
            allowGithub={allowGithubInstalls}
          />
            ) : null}
          </>
        )}
      </div>
    </ServerPage>
  );
}

function CatalogCard({
  item,
  canInstall,
  busy,
  onInstall,
  onUninstall,
  onUpdate,
}: {
  item: MarketplaceCatalogEntry;
  canInstall: boolean;
  busy: boolean;
  onInstall: () => void;
  onUninstall: () => void;
  onUpdate: () => void;
}) {
  return (
    <article className="mp-catalog-card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            <span className="mp-cat-badge mp-cat-script">{CATEGORY_LABELS[item.category] ?? item.category}</span>
            {item.featured && (
              <span className="mp-cat-badge mp-cat-featured">
                <Star className="h-2.5 w-2.5" /> Featured
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold">{item.name}</h3>
        </div>
        <a href={item.githubUrl} target="_blank" rel="noreferrer" className="mp-icon-btn" title="GitHub">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <p className="mt-2 line-clamp-2 flex-1 text-[11px] leading-relaxed text-[var(--muted)]">{item.description}</p>
      {item.installed && item.installedRef && (
        <p className="mt-2 font-mono text-[10px] text-emerald-400">Installed · {item.installedRef}</p>
      )}
      <div className="mt-4 flex flex-col gap-2">
        <div className="mp-catalog-card-meta">
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="mp-topic-chip" title={tag}>
              {tag}
            </span>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {item.installed ? (
            <>
              <Button variant="subtle" size="sm" disabled={!canInstall || busy} onClick={onUpdate} className="flex-1">
                {busy ? <Spinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Update
              </Button>
              <Button variant="subtle" size="sm" disabled={!canInstall || busy} onClick={onUninstall}>
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            </>
          ) : (
            <Button size="sm" disabled={!canInstall || busy} onClick={onInstall} className="w-full">
              {busy ? <Spinner className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
              Install resource
            </Button>
          )}
        </div>
      </div>
    </article>
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
      <div className="mp-empty-state py-16">
        <Package className="h-10 w-10 text-[var(--muted)]" />
        <p className="mt-3 font-medium">Nothing installed yet</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {allowGithub ? 'Browse Discover for popular scripts or check the host catalog.' : 'Browse the host catalog to get started.'}
        </p>
        <Button className="mt-4" size="sm" onClick={onBrowse}>
          <TrendingUp className="h-3.5 w-3.5" />
          Browse resources
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const isGithub = item.source === 'github';
        const busy = isGithub ? busyId === `github:${item.id}` : busyId === `catalog:${item.pluginId}`;

        return (
          <div key={item.id} className="mp-installed-row">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{item.name}</p>
                <span className={`mp-cat-badge ${isGithub ? 'mp-cat-github' : 'mp-cat-catalog'}`}>
                  {isGithub ? 'GitHub' : 'Catalog'}
                </span>
              </div>
              <p className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">
                {item.installPath} · {item.installedRef}
              </p>
            </div>
            <div className="flex gap-1.5">
              <Button variant="subtle" size="sm" disabled={!canInstall || busy} onClick={() => (isGithub ? onGithubUpdate(item.id) : onCatalogUpdate(item.pluginId))}>
                Update
              </Button>
              <Button variant="subtle" size="sm" disabled={!canInstall || busy} onClick={() => (isGithub ? onGithubUninstall(item.id) : onCatalogUninstall(item.pluginId))}>
                Remove
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
