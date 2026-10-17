import { useEffect, useMemo, useState } from 'react';
import { Box, Car, Code2, Map, Package, Search, Sparkles } from 'lucide-react';
import { api, type MarketplaceCatalogPlugin } from '../../../lib/api';
import { MARKETPLACE_CATEGORY_LABELS } from '../../../lib/marketplace-format';
import { Spinner } from '../../../components/ui';
import { MarketplaceEmptyState } from '../../../components/marketplace/MarketplaceChrome';
import { CatalogResourceCard } from '../components/shared';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Package },
  { id: 'library', label: 'Library', icon: Code2 },
  { id: 'script', label: 'Script', icon: Sparkles },
  { id: 'map', label: 'Map', icon: Map },
  { id: 'vehicle', label: 'Vehicle', icon: Car },
  { id: 'other', label: 'Other', icon: Box },
] as const;

type CategoryId = (typeof CATEGORIES)[number]['id'];

const SEARCH_DEBOUNCE_MS = 300;

export function CatalogTab({
  serverId,
  featured,
  canInstall,
  busyId,
  onOpen,
  onInstall,
}: {
  serverId: string;
  featured: MarketplaceCatalogPlugin[];
  canInstall: boolean;
  busyId: string | null;
  onOpen: (plugin: MarketplaceCatalogPlugin) => void;
  onInstall: (plugin: MarketplaceCatalogPlugin) => void;
}) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [category, setCategory] = useState<CategoryId>('all');
  const [items, setItems] = useState<MarketplaceCatalogPlugin[]>(featured);
  const [loading, setLoading] = useState(featured.length === 0);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const soft = items.length > 0;
    if (!soft) setLoading(true);
    setLoadError('');
    api.client
      .marketplaceCatalog(serverId, {
        q: debouncedQuery || undefined,
        category: category === 'all' ? undefined : category,
      })
      .then((r) => setItems(r.plugins))
      .catch(() => {
        setItems(featured);
        setLoadError('Could not refresh catalog — showing cached results.');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- soft-refresh; items intentionally omitted
  }, [serverId, debouncedQuery, category, featured]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.installed !== b.installed) return a.installed ? 1 : -1;
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [items]);

  const featuredCount = useMemo(() => items.filter((i) => i.featured).length, [items]);
  const activeCategory = CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[0];

  const headTitle = debouncedQuery
    ? 'Search results'
    : category !== 'all'
      ? activeCategory.label
      : featuredCount === items.length && items.length > 0
        ? 'Featured catalog'
        : 'Host catalog';

  const headDesc = debouncedQuery
    ? `Matches for “${debouncedQuery}”`
    : category !== 'all'
      ? `${MARKETPLACE_CATEGORY_LABELS[category] ?? category} resources from your host`
      : 'Curated FiveM resources ready for one-click install';

  return (
    <section className="ds-srv-plugins-panel ds-srv-mp-panel">
      <div className="ds-srv-plugins-search">
        <div className="fm-search-row">
          <div className="fm-search-input-wrap">
            <Search className="fm-search-icon" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search host catalog…"
              className="fm-search-input"
              aria-label="Search host catalog"
            />
          </div>
        </div>
        <div className="mc-cat-row" role="list" aria-label="Categories">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                role="listitem"
                onClick={() => setCategory(cat.id)}
                className={`mc-cat-chip${category === cat.id ? ' mc-cat-chip--active' : ''}`}
                aria-pressed={category === cat.id}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {loadError ? <p className="ds-srv-mp-soft-error">{loadError}</p> : null}

      <header className="ds-srv-plugins-results-head">
        <div className="ds-srv-plugins-results-identity">
          <span className="ds-srv-plugins-results-icon" aria-hidden>
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="ds-srv-plugins-results-title">{headTitle}</h3>
            <p className="ds-srv-plugins-results-desc">{headDesc}</p>
          </div>
        </div>
        <div className="ds-srv-plugins-results-meta">
          {loading ? <span className="ds-srv-plugins-results-live">Updating…</span> : null}
          <span className="ds-srv-plugins-results-count" title={`${items.length} resources`}>
            <strong>{items.length}</strong>
            <span>{items.length === 1 ? 'resource' : 'resources'}</span>
          </span>
        </div>
      </header>

      {loading && items.length === 0 ? (
        <div className="ds-srv-plugins-loading" role="status">
          <Spinner className="h-7 w-7" />
          <span className="sr-only">Loading catalog</span>
        </div>
      ) : items.length === 0 ? (
        <MarketplaceEmptyState
          icon={Search}
          title="No catalog matches"
          description="Try another filter, switch to GitHub, or ask your host to add resources."
        />
      ) : (
        <div className={`mc-card-grid${loading ? ' mc-card-grid--dim' : ''}`}>
          {sorted.map((item) => (
            <CatalogResourceCard
              key={item.id}
              item={item}
              busy={busyId === `catalog:${item.id}`}
              canInstall={canInstall}
              onOpen={() => onOpen(item)}
              onInstall={() => onInstall(item)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
