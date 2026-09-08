import { useMemo, useState } from 'react';
import { Github, Pencil, Plus, Search, Sparkles, Star, Trash2 } from 'lucide-react';
import type { FivemCatalogEntryInput, MarketplaceCatalogPlugin } from '../../../../lib/api';
import { NodeOverviewSection } from '../../node-detail/NodeDetailShell';
import { Checkbox } from '../../../Checkbox';
import { Button } from '../../../Layout';
import { EmptyState, Spinner } from '../../../ui';

const CATEGORY_FILTERS = ['all', 'library', 'script', 'map', 'vehicle', 'other'] as const;

export function FivemMarketplaceWorkspace({
  loading,
  catalog,
  settings,
  statusMessage,
  onSaveSettings,
  onAdd,
  onEdit,
  onDelete,
}: {
  loading: boolean;
  catalog: MarketplaceCatalogPlugin[];
  settings: { enabled: boolean; allowGithubInstalls: boolean; allowCatalogInstalls: boolean };
  statusMessage?: string;
  onSaveSettings: (patch: Partial<typeof settings>) => void;
  onAdd: () => void;
  onEdit: (entry: MarketplaceCatalogPlugin) => void;
  onDelete: (entry: MarketplaceCatalogPlugin) => void;
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORY_FILTERS)[number]>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((entry) => {
      if (category !== 'all' && entry.category !== category) return false;
      if (!q) return true;
      return (
        entry.name.toLowerCase().includes(q) ||
        entry.slug.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        `${entry.githubOwner}/${entry.githubRepo}`.toLowerCase().includes(q)
      );
    });
  }, [catalog, search, category]);

  const featuredCount = catalog.filter((e) => e.featured).length;
  const enabledCount = catalog.filter((e) => e.enabled).length;

  return (
    <div className="ds-plg-fivem-workspace">
      {statusMessage ? (
        <p className="ds-plg-status-msg" role="status">
          {statusMessage}
        </p>
      ) : null}

      <div className="ds-plg-fivem-grid">
        <NodeOverviewSection
          icon={Sparkles}
          title="Visibility"
          description="What FiveM server owners can access"
        >
          <div className="ds-plg-settings-stack">
            <Checkbox
              label="Marketplace enabled"
              checked={settings.enabled}
              onChange={(v) => onSaveSettings({ enabled: v })}
            />
            <Checkbox
              label="Host catalog installs"
              checked={settings.allowCatalogInstalls}
              disabled={!settings.enabled}
              onChange={(v) => onSaveSettings({ allowCatalogInstalls: v })}
            />
            <Checkbox
              label="GitHub discovery"
              checked={settings.allowGithubInstalls}
              disabled={!settings.enabled}
              onChange={(v) => onSaveSettings({ allowGithubInstalls: v })}
            />
          </div>
        </NodeOverviewSection>

        <NodeOverviewSection
          icon={Github}
          title="Install behavior"
          description="How resources land on servers"
        >
          <ul className="ds-plg-tips">
            <li>Catalog entries download from GitHub releases at install time.</li>
            <li>Listed dependencies install automatically when present in the catalog.</li>
            <li>server.cfg is patched under a Spirit marker block.</li>
          </ul>
          <div className="ds-plg-mini-stats">
            <span>
              <strong>{enabledCount}</strong> enabled
            </span>
            <span>
              <strong>{featuredCount}</strong> featured
            </span>
          </div>
        </NodeOverviewSection>
      </div>

      <section className="ds-plg-catalog" aria-labelledby="fivem-catalog-heading">
        <div className="ds-plg-catalog-head">
          <div>
            <h2 id="fivem-catalog-heading" className="ds-plg-catalog-title">
              Resource catalog
            </h2>
            <p className="ds-plg-catalog-desc">Curated scripts, libraries, and maps for one-click install</p>
          </div>
          <Button type="button" size="sm" onClick={onAdd}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add resource
          </Button>
        </div>

        <div className="ds-nodes-toolbar mb-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 ds-icon -translate-y-1/2 ds-icon--muted" />
            <input
              className="ds-field ds-field--icon-left w-full"
              placeholder="Search name, slug, GitHub…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search catalog"
            />
          </div>
        </div>

        <div className="ds-nodes-status-pills mb-3" role="tablist" aria-label="Category filters">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={category === cat}
              className={`ds-nodes-status-pill${category === cat ? ' ds-nodes-status-pill--active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              <span className="ds-nodes-status-pill-count">
                {cat === 'all' ? catalog.length : catalog.filter((e) => e.category === cat).length}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-10 text-sm text-[var(--muted)]">
            <Spinner className="h-4 w-4" />
            Loading catalog…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No resources yet"
            description="Add ox_lib, oxmysql, or your own curated scripts for users to install in one click."
          />
        ) : (
          <div className="ds-plg-catalog-grid">
            {filtered.map((entry) => (
              <article key={entry.id} className={`ds-plg-catalog-card${entry.enabled ? '' : ' is-off'}`}>
                <div className="ds-plg-catalog-card-top">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="ds-plg-catalog-card-title truncate">{entry.name}</h3>
                      {entry.featured ? (
                        <span className="ds-plg-catalog-featured">
                          <Star className="h-3 w-3" aria-hidden />
                          Featured
                        </span>
                      ) : null}
                    </div>
                    <p className="ds-plg-catalog-card-slug ds-text-mono">{entry.slug}</p>
                  </div>
                  <span className="ds-plg-catalog-cat">{entry.category}</span>
                </div>
                <p className="ds-plg-catalog-card-desc line-clamp-2">{entry.description}</p>
                <a
                  href={entry.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ds-plg-catalog-gh"
                >
                  <Github className="h-3 w-3" aria-hidden />
                  {entry.githubOwner}/{entry.githubRepo}
                </a>
                <div className="ds-plg-catalog-card-actions">
                  <Button type="button" size="sm" variant="secondary" onClick={() => onEdit(entry)}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    Edit
                  </Button>
                  <Button type="button" size="sm" variant="danger" onClick={() => onDelete(entry)}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function catalogEntryToForm(entry: MarketplaceCatalogPlugin): FivemCatalogEntryInput {
  return {
    slug: entry.slug,
    name: entry.name,
    description: entry.description,
    category: entry.category as FivemCatalogEntryInput['category'],
    tags: entry.tags,
    githubOwner: entry.githubOwner,
    githubRepo: entry.githubRepo,
    githubRef: entry.githubRef,
    installPath: entry.installPath,
    cfgResource: entry.cfgResource,
    cfgAction: entry.cfgAction,
    cfgFile: entry.cfgFile,
    dependencies: entry.dependencies,
    featured: entry.featured,
    enabled: entry.enabled,
    sortOrder: entry.sortOrder,
  };
}
