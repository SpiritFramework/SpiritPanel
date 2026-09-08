import type { LucideIcon } from 'lucide-react';
import type { MarketplaceCatalogPlugin } from '../../../lib/api';
import { Package } from 'lucide-react';
import { sanitizeImageSrc } from '../../../lib/safe-url';
import { MARKETPLACE_CATEGORY_LABELS } from '../../../lib/marketplace-format';
import { Button } from '../../../components/Layout';
import { Spinner } from '../../../components/ui';

export function CatalogResourceCard({
  item,
  busy,
  canInstall,
  onInstall,
  onOpen,
}: {
  item: MarketplaceCatalogPlugin;
  busy?: boolean;
  canInstall: boolean;
  onInstall?: () => void;
  onOpen?: () => void;
}) {
  const iconUrl = sanitizeImageSrc(item.iconUrl);
  const categoryLabel = MARKETPLACE_CATEGORY_LABELS[item.category] ?? item.category;

  return (
    <article className="ds-card group flex h-full min-h-[200px] flex-col">
      <button
        type="button"
        className="ds-card-body flex flex-1 flex-col text-left transition hover:bg-[var(--surface-hover)]/40"
        onClick={onOpen}
        disabled={!onOpen}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--accent)]">
            {iconUrl ? (
              <img src={iconUrl} alt="" className="h-8 w-8 rounded-md object-cover" />
            ) : (
              <Package className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="truncate text-sm font-semibold text-[var(--text)]" title={item.name}>
                {item.name}
              </h3>
              {item.featured ? <span className="ds-tag">Featured</span> : null}
              {item.installed ? <span className="ds-tag ds-tag--success">Installed</span> : null}
            </div>
            <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{categoryLabel}</p>
          </div>
        </div>
        <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm leading-snug text-[var(--muted)]">
          {item.description || 'No description provided.'}
        </p>
        {item.tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="ds-tag ds-tag--muted max-w-full truncate">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </button>
      <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] px-4 py-3">
        <span className="min-w-0 truncate font-mono text-[10px] text-[var(--muted)]" title={`${item.githubOwner}/${item.githubRepo}`}>
          {item.githubOwner}/{item.githubRepo}
        </span>
        <div className="flex shrink-0 gap-2">
          {onOpen ? (
            <Button type="button" size="sm" variant="secondary" onClick={onOpen}>
              Details
            </Button>
          ) : null}
          {item.installed ? (
            <span className="text-xs font-medium text-[var(--success)]">Installed</span>
          ) : canInstall && onInstall ? (
            <Button type="button" size="sm" disabled={busy} onClick={() => onInstall()}>
              {busy ? <Spinner className="h-3.5 w-3.5" /> : 'Install'}
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function MarketplaceStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
}) {
  return (
    <div className="ds-stat-card">
      <div className="flex items-center gap-2 text-[var(--muted)]">
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 truncate text-2xl font-bold tabular-nums text-[var(--text)]">{value}</p>
    </div>
  );
}

export function TabButton({
  active,
  label,
  badge,
  onClick,
}: {
  active: boolean;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
        active
          ? 'bg-[var(--accent)] text-white shadow-sm'
          : 'bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      {label}
      {badge !== undefined && badge > 0 ? (
        <span
          className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${
            active ? 'bg-white/20' : 'bg-[var(--bg-elevated)]'
          }`}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}
