import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Package, Search, Sparkles } from 'lucide-react';
import { api, type MarketplaceCatalogPlugin } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { getServerAccess } from '../../lib/server-access';
import { useServer } from '../../context/ServerContext';
import { Button } from '../../components/Layout';
import { Spinner } from '../../components/ui';
import { MarketplaceAlert, MarketplaceSectionHead } from '../../components/marketplace/MarketplaceChrome';

const CATEGORY_FILTERS = [
  { id: '', label: 'All' },
  { id: 'library', label: 'Libraries' },
  { id: 'script', label: 'Scripts' },
  { id: 'map', label: 'Maps' },
  { id: 'vehicle', label: 'Vehicles' },
] as const;

function CatalogCard({
  item,
  busy,
  canInstall,
  onInstall,
}: {
  item: MarketplaceCatalogPlugin;
  busy: boolean;
  canInstall: boolean;
  onInstall: () => void;
}) {
  return (
    <article className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] transition hover:border-[var(--accent)]/40">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[var(--accent)]/80 to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
            {item.iconUrl ? (
              <img src={item.iconUrl} alt="" className="h-8 w-8 rounded object-cover" />
            ) : (
              <Package className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-[var(--text)]">{item.name}</h3>
              {item.featured && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium uppercase text-amber-600 dark:text-amber-400">
                  Featured
                </span>
              )}
              {item.installed && (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase text-emerald-600">
                  Installed
                </span>
              )}
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{item.description}</p>
          </div>
        </div>

        {item.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {item.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-md bg-[var(--bg)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
          <a
            href={item.githubUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[var(--muted)] hover:text-[var(--accent)]"
          >
            {item.githubOwner}/{item.githubRepo}
          </a>
          {canInstall && !item.installed ? (
            <Button type="button" size="sm" disabled={busy} onClick={onInstall}>
              {busy ? <Spinner className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
              Install
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function MarketplaceCurated({
  serverId,
  onInstalled,
}: {
  serverId: string;
  onInstalled: () => void;
}) {
  const { server } = useServer();
  const toast = useToast();
  const access = getServerAccess(server);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [plugins, setPlugins] = useState<MarketplaceCatalogPlugin[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.client.marketplaceCatalog(serverId, {
        q: search.trim() || undefined,
        category: category || undefined,
      });
      setPlugins(res.plugins);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  }, [serverId, search, category]);

  useEffect(() => {
    const t = setTimeout(() => void load(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const featured = useMemo(() => plugins.filter((p) => p.featured), [plugins]);
  const rest = useMemo(() => plugins.filter((p) => !p.featured), [plugins]);

  async function install(pluginId: string, name: string) {
    setBusyId(pluginId);
    try {
      await api.client.marketplaceInstall(serverId, pluginId);
      toast.success(`Installed ${name}`);
      await load();
      onInstalled();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Install failed');
    } finally {
      setBusyId(null);
    }
  }

  const canInstall = access.canInstallMarketplace;

  return (
    <div className="space-y-6">
      <MarketplaceSectionHead
        icon={Sparkles}
        title="Curated by your host"
        description="One-click installs from your panel administrator's catalog. Dependencies are resolved automatically."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            className="ds-input w-full pl-9"
            placeholder="Search curated resources…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.id || 'all'}
              type="button"
              onClick={() => setCategory(f.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                category === f.id
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && <MarketplaceAlert tone="error">{error}</MarketplaceAlert>}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--muted)]">
          <Spinner className="h-5 w-5" />
          Loading catalog…
        </div>
      ) : plugins.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--muted)]">
          No curated resources yet. Try GitHub discovery or ask your host to add catalog entries.
        </p>
      ) : (
        <>
          {featured.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-medium text-[var(--muted)]">Featured</h3>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {featured.map((item) => (
                  <CatalogCard
                    key={item.id}
                    item={item}
                    busy={busyId === item.id}
                    canInstall={canInstall}
                    onInstall={() => void install(item.id, item.name)}
                  />
                ))}
              </div>
            </section>
          )}
          {rest.length > 0 && (
            <section>
              {featured.length > 0 && (
                <h3 className="mb-3 text-sm font-medium text-[var(--muted)]">All resources</h3>
              )}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {rest.map((item) => (
                  <CatalogCard
                    key={item.id}
                    item={item}
                    busy={busyId === item.id}
                    canInstall={canInstall}
                    onInstall={() => void install(item.id, item.name)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
