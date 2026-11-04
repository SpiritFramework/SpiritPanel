import type { ComponentType } from 'react';
import { Shield } from 'lucide-react';

export type SecurityOverviewItem = {
  id: string;
  label: string;
  value: string;
  ok: boolean;
  icon: ComponentType<{ className?: string }>;
};

export function ProfileSecurityOverview({
  items,
  loading,
  label = 'Security score',
  hints,
}: {
  items: SecurityOverviewItem[];
  loading: boolean;
  label?: string;
  hints?: { high: string; mid: string; low: string };
}) {
  const enabledCount = items.filter((item) => item.ok).length;
  const score = items.length ? Math.round((enabledCount / items.length) * 100) : 0;
  const tone = score >= 75 ? 'good' : score >= 50 ? 'fair' : 'low';
  const resolvedHints = hints ?? {
    high: 'Strong protection — keep recovery codes safe.',
    mid: 'Good start — enable the remaining options below.',
    low: 'Add more protections to secure your account.',
  };
  const hint = loading
    ? 'Checking your account…'
    : score >= 75
      ? resolvedHints.high
      : score >= 50
        ? resolvedHints.mid
        : resolvedHints.low;

  return (
    <section className={`ds-sec-strip ds-sec-strip--${tone}`} aria-label={label}>
      <div className="ds-sec-strip-score">
        <span className="ds-sec-strip-score-icon" aria-hidden>
          <Shield className="h-4 w-4" />
        </span>
        <div className="ds-sec-strip-score-copy">
          <span className="ds-sec-strip-score-label">{label}</span>
          <span className="ds-sec-strip-score-value">{loading ? '…' : `${score}%`}</span>
          <p className="ds-sec-strip-score-hint">{hint}</p>
        </div>
      </div>

      <ul className="ds-sec-strip-chips">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li
              key={item.id}
              className={`ds-sec-strip-chip${item.ok ? ' ds-sec-strip-chip--ok' : ''}${loading ? ' ds-sec-strip-chip--loading' : ''}`}
            >
              <span className="ds-sec-strip-chip-icon" aria-hidden>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="ds-sec-strip-chip-copy">
                <span className="ds-sec-strip-chip-label">{item.label}</span>
                <span className="ds-sec-strip-chip-value">{loading ? '…' : item.value}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
