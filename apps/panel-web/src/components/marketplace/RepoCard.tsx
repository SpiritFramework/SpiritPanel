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

function categoryBadgeClass(category?: string): string {
  const map: Record<string, string> = {
    library: 'mp-cat-library',
    framework: 'mp-cat-framework',
    script: 'mp-cat-script',
    voice: 'mp-cat-voice',
    ui: 'mp-cat-ui',
    jobs: 'mp-cat-jobs',
  };
  return map[category ?? ''] ?? 'mp-cat-github';
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
    <Link to={to} state={{ preview }} className="mp-repo-card">
      <div className="mp-repo-card-accent" aria-hidden />

      <div className="mp-repo-card-inner">
        <div className="mp-repo-card-head">
          <div className="mp-repo-avatar" aria-hidden>
            <Github className="h-4 w-4" />
          </div>
          <div className="mp-repo-card-titles">
            <h3 className="mp-repo-name">{item.name}</h3>
            <p className="mp-repo-slug">
              {item.owner}<span className="mp-repo-slug-sep">/</span>{item.repo}
            </p>
          </div>
        </div>

        {desc ? <p className="mp-repo-desc">{desc}</p> : <div className="mp-repo-desc mp-repo-desc--empty">No description</div>}

        <div className="mp-repo-metrics">
          {item.stars > 0 && (
            <span className="mp-repo-metric mp-repo-metric--stars" title="GitHub stars">
              <Star className="h-3 w-3" />
              {formatStars(item.stars)}
            </span>
          )}
          {item.forks > 0 && (
            <span className="mp-repo-metric" title="Forks">
              <GitFork className="h-3 w-3" />
              {formatStars(item.forks)}
            </span>
          )}
          {item.language && (
            <span className="mp-repo-metric mp-repo-metric--lang" title={item.language}>
              <span className="mp-repo-lang-dot" style={{ background: langColor }} />
              {item.language}
            </span>
          )}
          {(item.pushedAt || item.updatedAt) && (
            <span className="mp-repo-metric mp-repo-metric--muted">
              {formatRelativeTime(item.pushedAt ?? item.updatedAt)}
            </span>
          )}
        </div>

        <div className="mp-repo-tags">
          {(fivemOnly || showFivemBadge) && <span className="mp-topic-chip mp-topic-chip--fivem">FiveM</span>}
          {category && (
            <span className={`mp-cat-badge ${categoryBadgeClass(category)}`}>
              {MARKETPLACE_CATEGORY_LABELS[category] ?? category}
            </span>
          )}
          {displayTopics.map((t) => (
            <span key={t} className="mp-topic-chip">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="mp-repo-card-foot">
        <span>View resource</span>
        <ArrowUpRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
});
