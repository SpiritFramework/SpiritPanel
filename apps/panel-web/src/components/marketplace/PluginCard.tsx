import { memo } from 'react';
import { ArrowUpRight, Download, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MinecraftPluginSearchHit } from '../../lib/api';
import {
  displayPluginTags,
  formatPluginDownloads,
  formatRelativePluginDate,
} from '../../lib/minecraft-plugin-format';
import { sanitizeImageSrc } from '../../lib/safe-url';

export const PluginCard = memo(function PluginCard({
  item,
  to,
  installed,
}: {
  item: MinecraftPluginSearchHit;
  to: string;
  installed?: boolean;
}) {
  const tags = displayPluginTags(item.displayCategories.length ? item.displayCategories : item.categories);
  const iconUrl = sanitizeImageSrc(item.iconUrl);

  return (
    <Link to={to} className="mc-card">
      <div className="mc-card-accent" aria-hidden />
      <div className="mc-card-body">
        <div className="mc-card-head">
          <div className="mc-card-icon" aria-hidden>
            {iconUrl ? <img src={iconUrl} alt="" loading="lazy" /> : <Package className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <h3 className="mc-card-title">{item.title}</h3>
            <p className="mc-card-author">by {item.author || 'Unknown'}</p>
          </div>
          {installed ? <span className="mc-chip mc-chip--installed">Installed</span> : null}
        </div>

        <p className="mc-card-desc">{item.description || 'No description'}</p>

        <div className="mc-card-metrics">
          <span className="mc-card-metric" title="Downloads">
            <Download className="h-3 w-3" aria-hidden />
            {formatPluginDownloads(item.downloads)}
          </span>
          {item.projectType ? <span className="mc-card-metric mc-card-metric--muted">{item.projectType}</span> : null}
          {item.dateModified ? (
            <span className="mc-card-metric mc-card-metric--muted">{formatRelativePluginDate(item.dateModified)}</span>
          ) : null}
        </div>

        {tags.length ? (
          <div className="mc-card-tags">
            {tags.map((tag) => (
              <span key={tag} className="mc-chip">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="mc-card-foot">
        <span>View & install</span>
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
      </div>
    </Link>
  );
});
