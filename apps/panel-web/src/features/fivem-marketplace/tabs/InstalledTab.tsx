import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  ExternalLink,
  FolderOpen,
  Github,
  Layers,
  Package,
  RefreshCw,
  Search,
  Store,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import type { MarketplaceInstallEntry } from '../../../lib/api';
import { MARKETPLACE_CATEGORY_LABELS } from '../../../lib/marketplace-format';
import { Spinner } from '../../../components/ui';
import { MarketplaceEmptyState } from '../../../components/marketplace/MarketplaceChrome';
import { GithubRepoAvatar } from '../components/GithubRepoAvatar';

type SourceFilter = 'all' | 'catalog' | 'github';

function formatInstalledAgo(iso: string | undefined): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function InstalledTab({
  items,
  canInstall,
  busyId,
  catalogPath,
  scriptPath,
  onCatalogUninstall,
  onCatalogUpdate,
  onGithubUninstall,
  onGithubUpdate,
  onBrowse,
  allowBrowse,
}: {
  items: MarketplaceInstallEntry[];
  canInstall: boolean;
  busyId: string | null;
  catalogPath: (id: string) => string;
  scriptPath: (owner: string, repo: string) => string;
  onCatalogUninstall: (id: string, name: string) => void;
  onCatalogUpdate: (id: string, name: string) => void;
  onGithubUninstall: (id: string, name: string) => void;
  onGithubUpdate: (id: string, name: string) => void;
  onBrowse: () => void;
  allowBrowse: boolean;
}) {
  const [filter, setFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  const catalogCount = useMemo(() => items.filter((i) => i.source === 'catalog').length, [items]);
  const githubCount = useMemo(() => items.filter((i) => i.source === 'github').length, [items]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let list = items;
    if (sourceFilter === 'catalog') list = list.filter((i) => i.source === 'catalog');
    if (sourceFilter === 'github') list = list.filter((i) => i.source === 'github');
    if (q) {
      list = list.filter((i) => {
        const blob = [
          i.name,
          i.installPath,
          i.installedRef,
          i.source === 'catalog' ? i.slug : `${i.githubOwner}/${i.githubRepo}`,
          i.source === 'catalog' ? i.category : 'github',
        ]
          .join(' ')
          .toLowerCase();
        return blob.includes(q);
      });
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [items, filter, sourceFilter]);

  const filters: Array<{ id: SourceFilter; label: string; count?: number; icon: typeof Package }> = [
    { id: 'all', label: 'All', count: items.length, icon: Package },
    { id: 'catalog', label: 'Catalog', count: catalogCount || undefined, icon: Store },
    { id: 'github', label: 'GitHub', count: githubCount || undefined, icon: Github },
  ];

  const headDesc =
    items.length > 0
      ? `${catalogCount} from catalog · ${githubCount} from GitHub`
      : 'Install from Catalog or GitHub — resources land under /resources';

  return (
    <section className="ds-srv-plugins-panel ds-srv-mp-panel">
      <div className="ds-srv-plugins-installed">
        <header className="ds-srv-plugins-installed-head">
          <div className="ds-srv-plugins-installed-identity">
            <span className="ds-srv-plugins-installed-icon" aria-hidden>
              <Package className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h3 className="ds-srv-plugins-installed-title">Installed</h3>
              <p className="ds-srv-plugins-installed-desc">{headDesc}</p>
            </div>
          </div>
          <div className="ds-srv-plugins-installed-meta">
            {items.length > 0 ? (
              <span className="ds-srv-plugins-installed-status ds-srv-plugins-installed-status--ok">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                On disk
              </span>
            ) : null}
            <span className="ds-srv-plugins-installed-count">
              <strong>{items.length}</strong>
              <span>{items.length === 1 ? 'install' : 'installs'}</span>
            </span>
          </div>
        </header>

        {!items.length ? (
          <div className="ds-srv-plugins-installed-empty">
            <MarketplaceEmptyState
              icon={Package}
              title="Nothing installed yet"
              description="Browse the host catalog or GitHub to add resources to this server."
              action={
                allowBrowse ? (
                  <button type="button" className="ds-btn ds-btn--primary ds-btn--sm" onClick={onBrowse}>
                    <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                    Browse marketplace
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            <div className="ds-srv-plugins-installed-toolbar">
              <div className="fm-search-input-wrap ds-srv-plugins-installed-search">
                <Search className="fm-search-icon" aria-hidden />
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter by name, path, or repo…"
                  className="fm-search-input"
                  aria-label="Filter installed resources"
                />
              </div>
            </div>

            <div className="ds-srv-plugins-installed-filters" role="tablist" aria-label="Filter by source">
              {filters.map((f) => {
                const Icon = f.icon;
                const active = sourceFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`ds-srv-plugins-installed-filter${active ? ' ds-srv-plugins-installed-filter--active' : ''}`}
                    onClick={() => setSourceFilter(f.id)}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {f.label}
                    {typeof f.count === 'number' ? (
                      <span className="ds-srv-plugins-installed-filter-count">{f.count}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {visible.length === 0 ? (
              <div className="ds-srv-plugins-installed-empty ds-srv-plugins-installed-empty--compact">
                <MarketplaceEmptyState
                  icon={Search}
                  title="No matches"
                  description={
                    filter.trim()
                      ? 'Try a different search.'
                      : sourceFilter === 'catalog'
                        ? 'No catalog installs yet.'
                        : 'No GitHub installs yet.'
                  }
                />
              </div>
            ) : (
              <div className="ds-srv-plugins-installed-list" role="list" aria-label="Installed resources">
                {visible.map((item) => {
                  const isGithub = item.source === 'github';
                  const busy = isGithub
                    ? busyId === `github:${item.id}`
                    : busyId === `catalog:${item.pluginId}`;
                  const detailTo = isGithub
                    ? scriptPath(item.githubOwner, item.githubRepo)
                    : catalogPath(item.slug);
                  const ago = formatInstalledAgo(item.installedAt);
                  const categoryLabel =
                    item.source === 'catalog'
                      ? (MARKETPLACE_CATEGORY_LABELS[item.category] ?? item.category)
                      : null;

                  return (
                    <article
                      key={item.id}
                      className={`ds-srv-plugins-installed-card${busy ? ' ds-srv-plugins-installed-card--busy' : ''}`}
                      role="listitem"
                    >
                      <div className="ds-srv-plugins-installed-card-accent" aria-hidden />
                      <Link to={detailTo} className="ds-srv-plugins-installed-main">
                        <div className="ds-srv-plugins-installed-thumb" aria-hidden>
                          {isGithub ? (
                            <GithubRepoAvatar owner={item.githubOwner} size="sm" />
                          ) : (
                            <Layers className="h-5 w-5" />
                          )}
                        </div>
                        <div className="ds-srv-plugins-installed-copy min-w-0">
                          <div className="ds-srv-plugins-installed-title-row">
                            <p className="ds-srv-plugins-installed-name">{item.name}</p>
                          </div>
                          <div className="ds-srv-plugins-installed-badges">
                            <span className={`mc-chip ${isGithub ? 'mc-chip--soft' : 'mc-chip--featured'}`}>
                              {isGithub ? (
                                <>
                                  <Github className="h-3 w-3" aria-hidden />
                                  GitHub
                                </>
                              ) : (
                                <>
                                  <Store className="h-3 w-3" aria-hidden />
                                  Catalog
                                </>
                              )}
                            </span>
                            {categoryLabel ? (
                              <span className="mc-chip mc-chip--loader">{categoryLabel}</span>
                            ) : null}
                            <span className="mc-chip mc-chip--soft">{item.installedRef}</span>
                            {ago ? <span className="ds-srv-plugins-installed-ago">{ago}</span> : null}
                          </div>
                          <p className="ds-srv-plugins-installed-path" title={item.installPath}>
                            <FolderOpen className="h-3 w-3 shrink-0" aria-hidden />
                            <span className="truncate">{item.installPath}</span>
                          </p>
                        </div>
                      </Link>
                      <div className="ds-srv-plugins-installed-actions">
                        <Link to={detailTo} className="ds-btn ds-btn--ghost ds-btn--sm" title="Details">
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                          <span className="hidden sm:inline">Details</span>
                        </Link>
                        <button
                          type="button"
                          className="ds-btn ds-btn--secondary ds-btn--sm"
                          disabled={!canInstall || busy}
                          onClick={() =>
                            isGithub
                              ? onGithubUpdate(item.id, item.name)
                              : onCatalogUpdate(item.pluginId, item.name)
                          }
                        >
                          {busy ? (
                            <Spinner className="h-3.5 w-3.5" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                          )}
                          <span className="hidden sm:inline">Update</span>
                        </button>
                        <button
                          type="button"
                          className="ds-btn ds-btn--ghost ds-btn--sm"
                          disabled={!canInstall || busy}
                          onClick={() =>
                            isGithub
                              ? onGithubUninstall(item.id, item.name)
                              : onCatalogUninstall(item.pluginId, item.name)
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          <span className="hidden sm:inline">Remove</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
