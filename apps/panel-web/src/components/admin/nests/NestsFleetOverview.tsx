import { Egg, Layers } from 'lucide-react';
import type { NestFleetStats } from './nest-fleet-utils';

export function NestsFleetOverview({
  stats,
  nestDistribution,
}: {
  stats: NestFleetStats;
  nestDistribution: { nest: string; count: number }[];
}) {
  const filledPct =
    stats.nests > 0 ? Math.round((stats.withEggs / stats.nests) * 100) : 0;
  const enabledPct =
    stats.eggs > 0 ? Math.round((stats.enabled / stats.eggs) * 100) : 0;

  return (
    <section className="ds-adm-nest-overview" aria-label="Template health">
      <header className="ds-adm-nest-overview-head">
        <h2 className="ds-adm-nest-overview-title">Template health</h2>
        <p className="ds-adm-nest-overview-desc">Nest coverage and egg distribution</p>
      </header>

      <div className="ds-adm-nest-overview-grid">
        <div className="ds-adm-nest-overview-card">
          <div className="ds-adm-nest-overview-card-head">
            <Layers className="h-4 w-4 opacity-70" aria-hidden />
            <span>Nest coverage</span>
          </div>
          <p className="ds-adm-nest-overview-metric">
            {stats.withEggs}
            <span className="ds-adm-nest-overview-metric-sub">/ {stats.nests}</span>
          </p>
          <div className="ds-adm-nest-overview-track" aria-hidden>
            <span className="ds-adm-nest-overview-fill" style={{ width: `${filledPct}%` }} />
          </div>
          <p className="ds-adm-nest-overview-foot">{filledPct}% of nests have eggs</p>
        </div>

        <div className="ds-adm-nest-overview-card">
          <div className="ds-adm-nest-overview-card-head">
            <Egg className="h-4 w-4 opacity-70" aria-hidden />
            <span>Egg availability</span>
          </div>
          <p className="ds-adm-nest-overview-metric">
            {stats.enabled}
            <span className="ds-adm-nest-overview-metric-sub">/ {stats.eggs}</span>
          </p>
          <div className="ds-adm-nest-overview-track" aria-hidden>
            <span
              className="ds-adm-nest-overview-fill ds-adm-nest-overview-fill--amber"
              style={{ width: `${enabledPct}%` }}
            />
          </div>
          <p className="ds-adm-nest-overview-foot">{enabledPct}% enabled for provisioning</p>
        </div>

        {nestDistribution.length > 0 ? (
          <div className="ds-adm-nest-overview-card ds-adm-nest-overview-card--wide">
            <div className="ds-adm-nest-overview-card-head">
              <Egg className="h-4 w-4 opacity-70" aria-hidden />
              <span>Eggs by nest</span>
            </div>
            <ul className="ds-adm-nest-dist-list">
              {nestDistribution.map((row) => {
                const pct = stats.eggs > 0 ? Math.round((row.count / stats.eggs) * 100) : 0;
                return (
                  <li key={row.nest} className="ds-adm-nest-dist-row">
                    <span className="ds-adm-nest-dist-label truncate">{row.nest}</span>
                    <span className="ds-adm-nest-dist-bar" aria-hidden>
                      <span style={{ width: `${Math.max(pct, 4)}%` }} />
                    </span>
                    <span className="ds-adm-nest-dist-count">{row.count}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
