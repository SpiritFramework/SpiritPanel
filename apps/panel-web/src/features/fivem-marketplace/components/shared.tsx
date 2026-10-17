import type { MarketplaceCatalogPlugin } from '../../../lib/api';
import { ArrowUpRight, Check, Github, Package } from 'lucide-react';
import { sanitizeImageSrc } from '../../../lib/safe-url';
import { MARKETPLACE_CATEGORY_LABELS } from '../../../lib/marketplace-format';
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
  const repo = `${item.githubOwner}/${item.githubRepo}`;

  return (
    <article
      className={[
        'mc-card',
        item.featured ? 'mc-card--featured' : '',
        item.installed ? 'mc-card--installed' : '',
        busy ? 'mc-card--busy' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="mc-card-accent" aria-hidden />
      <button type="button" className="mc-card-body" onClick={onOpen} disabled={!onOpen}>
        <div className="mc-card-head">
          <span className="mc-card-icon" aria-hidden>
            {iconUrl ? <img src={iconUrl} alt="" loading="lazy" /> : <Package className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="mc-card-title" title={item.name}>
              {item.name}
            </h3>
            <p className="mc-card-author">{categoryLabel}</p>
          </div>
          {item.installed ? (
            <span className="mc-chip mc-chip--installed">
              <Check className="h-3 w-3" aria-hidden />
              Installed
            </span>
          ) : item.featured ? (
            <span className="mc-chip mc-chip--featured">Featured</span>
          ) : null}
        </div>

        <p className="mc-card-desc">{item.description || 'No description provided.'}</p>

        <div className="mc-card-metrics">
          <span className="mc-card-metric mc-card-metric--muted" title={repo}>
            <Github className="h-3 w-3" aria-hidden />
            <span className="truncate">{repo}</span>
          </span>
          {item.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="mc-chip">
              {tag}
            </span>
          ))}
        </div>
      </button>

      <div className="mc-card-foot">
        {onOpen ? (
          <button type="button" className="mc-card-foot-link" onClick={onOpen}>
            Details
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : (
          <span />
        )}
        {item.installed ? (
          <span className="mc-card-foot-status">On server</span>
        ) : canInstall && onInstall ? (
          <button
            type="button"
            className="ds-btn ds-btn--primary ds-btn--sm"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              onInstall();
            }}
          >
            {busy ? <Spinner className="h-3.5 w-3.5" /> : 'Install'}
          </button>
        ) : null}
      </div>
    </article>
  );
}
