import { Link } from 'react-router-dom';
import { HardDrive, Settings } from 'lucide-react';
import { groupDomainsByNode, type DomainRow } from './domain-fleet-utils';

export function DomainsFleetOverview({ rows }: { rows: DomainRow[] }) {
  const byNode = groupDomainsByNode(rows);
  const maxCount = Math.max(1, ...byNode.map((n) => n.count));
  const preferSubdomain = rows.filter((r) => r.preferSubdomain).length;

  if (rows.length === 0) return null;

  return (
    <section className="ds-dom-overview" aria-label="Subdomain distribution">
      <div className="ds-dom-overview-main">
        <div className="ds-dom-overview-head">
          <div>
            <p className="ds-dom-overview-label">DNS footprint</p>
            <p className="ds-dom-overview-sub">
              {rows.length} record{rows.length === 1 ? '' : 's'} across {byNode.length} node
              {byNode.length === 1 ? '' : 's'}
              {preferSubdomain > 0 ? ` · ${preferSubdomain} shown to players` : ''}
            </p>
          </div>
          <Link to="/admin/settings" className="ds-dom-overview-link">
            <Settings className="h-3.5 w-3.5" aria-hidden />
            Cloudflare settings
          </Link>
        </div>

        {byNode.length > 0 ? (
          <ul className="ds-dom-bars" aria-label="Subdomains per node">
            {byNode.slice(0, 6).map((node) => {
              const pct = Math.round((node.count / maxCount) * 100);
              return (
                <li key={node.nodeId} className="ds-dom-bar-row">
                  <Link
                    to={`/admin/nodes/${node.nodeId}`}
                    className="ds-dom-bar-label"
                    title={node.nodeName}
                  >
                    <HardDrive className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                    <span className="truncate">{node.nodeName}</span>
                  </Link>
                  <div className="ds-dom-bar-track" aria-hidden>
                    <span className="ds-dom-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="ds-dom-bar-value">{node.count}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="ds-text-xs ds-text-muted">No node assignments yet.</p>
        )}
      </div>

      {byNode.length > 0 ? (
        <div className="ds-dom-overview-side">
          <p className="ds-dom-overview-label">Top nodes</p>
          <ul className="ds-dom-rank">
            {byNode.slice(0, 4).map((node, index) => (
              <li key={node.nodeId}>
                <Link to={`/admin/nodes/${node.nodeId}`} className="ds-dom-rank-row">
                  <span className="ds-dom-rank-pos" aria-hidden>
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="ds-dom-rank-name block truncate">{node.nodeName}</span>
                    {node.domainBase ? (
                      <span className="ds-dom-rank-base block truncate ds-text-mono">
                        *.{node.domainBase}
                      </span>
                    ) : null}
                  </span>
                  <span className="ds-dom-rank-value">{node.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
