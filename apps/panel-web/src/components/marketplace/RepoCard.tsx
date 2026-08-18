import { memo } from 'react';
import { ArrowUpRight, GitFork, Github, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { GithubSearchResult } from '../../lib/api';
import {
  formatRelativeTime,
  formatStars,
  languageAccent,
  MARKETPLACE_CATEGORY_LABELS,
} from '../../lib/marketplace-format';
import type { previewFromSearchResult } from '../../lib/marketplace-script-state';

function categoryChipClass(category?: string): string {
  const map: Record<string, string> = {
    library: 'fm-chip--cat-library',
    framework: 'fm-chip--cat-framework',
    script: 'fm-chip--cat-script',
    voice: 'fm-chip--cat-voice',
    ui: 'fm-chip--cat-ui',
    jobs: 'fm-chip--cat-jobs',
  };
  return map[category ?? ''] ?? '';
}

export const RepoCard = memo(function RepoCard({
  item,
  to,
  preview,
  subtitle,
  category,
  fivemOnly,
  showFivemBadge,
}: {
  item: GithubSearchResult;
  to: string;
  preview?: ReturnType<typeof previewFromSearchResult>;
  subtitle?: string;
  category?: string;
  fivemOnly?: boolean;
  showFivemBadge?: boolean;
}) {
  const desc = subtitle || item.description;
  const displayTopics = (item.topics ?? [])
    .filter((t) => t.toLowerCase() !== 'fivem')
    .slice(0, 2);
  const langColor = languageAccent(item.language);

  return (
    <Link to={to} state={{ preview }} className="fm-repo-card">
      <div className="fm-repo-card-accent" aria-hidden />

      <div className="fm-repo-card-body">
        <div className="fm-repo-card-head">
          <div className="fm-repo-avatar" aria-hidden>
            <Github className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="fm-repo-name">{item.name}</h3>
            <p className="fm-repo-slug">
              {item.owner}
              <span className="fm-repo-slug-sep">/</span>
              {item.repo}
            </p>
          </div>
        </div>

        {desc ? (
          <p className="fm-repo-desc">{desc}</p>
        ) : (
          <p className="fm-repo-desc fm-repo-desc--empty">No description</p>
        )}

        <div className="fm-repo-metrics">
          {item.stars > 0 && (
            <span className="fm-repo-metric fm-repo-metric--stars" title="GitHub stars">
              <Star className="h-3 w-3" />
              {formatStars(item.stars)}
            </span>
          )}
          {item.forks > 0 && (
            <span className="fm-repo-metric" title="Forks">
              <GitFork className="h-3 w-3" />
              {formatStars(item.forks)}
            </span>
          )}
          {item.language && (
            <span className="fm-repo-metric" title={item.language}>
              <span className="fm-repo-lang-dot" style={{ background: langColor }} />
              {item.language}
            </span>
          )}
          {(item.pushedAt || item.updatedAt) && (
            <span className="fm-repo-metric fm-repo-metric--muted">
              {formatRelativeTime(item.pushedAt ?? item.updatedAt)}
            </span>
          )}
        </div>

        <div className="fm-repo-tags">
          {(fivemOnly || showFivemBadge) && <span className="fm-chip fm-chip--fivem">FiveM</span>}
          {category && (
            <span className={`fm-chip fm-chip--cat ${categoryChipClass(category)}`}>
              {MARKETPLACE_CATEGORY_LABELS[category] ?? category}
            </span>
          )}
          {displayTopics.map((t) => (
            <span key={t} className="fm-chip">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="fm-repo-card-foot">
        <span>View resource</span>
        <ArrowUpRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
});
