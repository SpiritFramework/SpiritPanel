import { useEffect, useMemo, useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { api, type MarketplaceCatalogPlugin } from '../../../lib/api';
import { MARKETPLACE_CATEGORY_LABELS } from '../../../lib/marketplace-format';
import { Spinner } from '../../../components/ui';
import { CatalogResourceCard } from '../components/shared';
import { IconField } from '../components/IconField';

const CATEGORIES = ['all', 'library', 'script', 'map', 'vehicle', 'other'] as const;
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
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('all');
  const [items, setItems] = useState<MarketplaceCatalogPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setLoading(true);
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
  }, [serverId, debouncedQuery, category]);

  const showFeaturedSection = !debouncedQuery && category === 'all';

  const featuredOnly = useMemo(() => items.filter((item) => item.featured), [items]);

  const mainListItems = useMemo(() => {
    if (!showFeaturedSection || featuredOnly.length === 0) return items;
    const featuredIds = new Set(featuredOnly.map((item) => item.id));
    return items.filter((item) => !featuredIds.has(item.id));
  }, [items, featuredOnly, showFeaturedSection]);

  return (
    <div className="ds-stack">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="relative min-w-0 max-w-md flex-1">
          <IconField
            icon={Search}
            placeholder="Search host catalog…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`ds-filter-pill ${category === cat ? 'is-active' : ''}`}
              aria-pressed={category === cat}
            >
              {cat === 'all' ? 'All' : (MARKETPLACE_CATEGORY_LABELS[cat] ?? cat)}
            </button>
          ))}
        </div>
      </div>

      {loadError ? <p className="text-xs text-[var(--muted)]">{loadError}</p> : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : items.length === 0 ? (
        <div className="ds-card ds-card-body py-12 text-center text-sm text-[var(--muted)]">
          No catalog entries match your filters. Try GitHub or ask your host to add resources.
        </div>
      ) : (
        <>
          {showFeaturedSection && featuredOnly.length > 0 ? (
            <section className="ds-stack">
              <h2 className="ds-section-title flex items-center gap-2 normal-case">
                <Sparkles className="h-4 w-4" />
                Featured by your host
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {featuredOnly.map((item) => (
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
            </section>
          ) : null}

          {mainListItems.length > 0 ? (
            <section className="ds-stack">
              <h2 className="ds-section-title normal-case">
                {debouncedQuery || category !== 'all' ? 'Results' : 'All resources'}
                <span className="ml-2 font-normal text-[var(--faint)]">({mainListItems.length})</span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {mainListItems.map((item) => (
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
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
