import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight, Copy, Egg, Layers, Mail, Server, Upload, User } from 'lucide-react';
import type { AdminNestDetail } from '../../../lib/api';
import { StatusPill } from '../../ui';
import type { NestDetailTab } from '../../../pages/admin/nest-detail/helpers';
import { NEST_GRADIENT } from '../../../pages/admin/nest-detail/helpers';
import { AdminSection, AdminToolButton } from '../primitives';

export function NestDetailTabNav({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: NestDetailTab; label: string; count?: number }[];
  active: NestDetailTab;
  onChange: (tab: NestDetailTab) => void;
}) {
  return (
    <nav className="ds-nd-header-tabs ds-adm-entity-tabs" aria-label="Nest sections">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`ds-nd-header-tab ds-adm-entity-tab${active === tab.id ? ' ds-nd-header-tab--active ds-adm-entity-tab--active' : ''}`}
          onClick={() => onChange(tab.id)}
          aria-current={active === tab.id ? 'page' : undefined}
        >
          {tab.label}
          {tab.count != null && tab.count > 0 ? (
            <span className="ds-nd-header-tab-count">{tab.count}</span>
          ) : null}
        </button>
      ))}
    </nav>
  );
}

export function NestDetailHeader({
  detail,
  fullAdmin,
  onImport,
  onManage,
  onViewEggs,
}: {
  detail: AdminNestDetail;
  fullAdmin: boolean;
  onImport?: () => void;
  onManage?: () => void;
  onViewEggs?: () => void;
}) {
  const hasEggs = detail.eggCount > 0;
  const enabledEggs = detail.eggs.filter((e) => e.enabled).length;
  const authorShort = detail.author.includes('@')
    ? detail.author.split('@')[0]!
    : detail.author;

  const stats: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Egg, label: 'Eggs', value: String(detail.eggCount) },
    { icon: Server, label: 'Servers', value: String(detail.serverCount) },
    { icon: Layers, label: 'Enabled', value: String(enabledEggs) },
    { icon: User, label: 'Author', value: authorShort },
  ];

  return (
    <header
      className={`ds-nst-header ds-adm-entity ds-ud-header${hasEggs ? ' ds-nst-header--ready' : ' ds-nst-header--empty'} ds-adm-entity--${hasEggs ? 'online' : 'offline'}`}
    >
      <nav className="ds-nst-header-crumb ds-adm-entity-crumb ds-ud-header-crumb" aria-label="Breadcrumb">
        <Link to="/admin/nests">Nests</Link>
        <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden />
        <span className="truncate">{detail.name}</span>
      </nav>

      <div className="ds-nst-header-body ds-ud-header-body">
        <div className="ds-ud-header-glow" aria-hidden />
        <div className="ds-nst-header-accent ds-ud-header-accent" style={{ background: NEST_GRADIENT }} aria-hidden />

        <div className="ds-nst-header-main ds-ud-header-main">
          <div className="ds-nst-header-identity ds-ud-header-identity">
            <div className="ds-nst-header-icon-wrap" style={{ background: NEST_GRADIENT }} aria-hidden>
              <Layers className="h-5 w-5 text-white/90" />
              <span className={`ds-nst-header-pulse${hasEggs ? '' : ' ds-nst-header-pulse--empty'}`} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="ds-ud-header-eyebrow">Nest manage</p>
              <div className="ds-nst-header-title-row ds-ud-header-title-row">
                <h1 className="ds-nst-header-title ds-ud-header-title truncate">{detail.name}</h1>
                <StatusPill
                  label={hasEggs ? `${detail.eggCount} egg${detail.eggCount === 1 ? '' : 's'}` : 'Empty'}
                  tone={hasEggs ? 'success' : 'neutral'}
                  pulse={hasEggs}
                />
              </div>
              <p className="ds-nst-header-sub ds-ud-header-meta truncate">
                {detail.description || 'No description'}
              </p>
              <div className="ds-ud-header-endpoint">
                <span className="ds-ud-header-scheme" aria-hidden>
                  <Mail className="h-3 w-3" />
                </span>
                <code className="ds-ud-header-fqdn-text truncate">{detail.author}</code>
              </div>
            </div>
          </div>

          <div
            className="ds-nd-toolstrip ds-adm-entity-actions ds-nst-header-actions ds-ud-header-actions"
            role="group"
            aria-label="Nest actions"
          >
            {onViewEggs ? (
              <AdminToolButton type="button" onClick={onViewEggs}>
                <Egg className="h-3.5 w-3.5" aria-hidden />
                Eggs
              </AdminToolButton>
            ) : null}
            {onManage ? (
              <AdminToolButton type="button" onClick={onManage}>
                Manage
              </AdminToolButton>
            ) : null}
            {fullAdmin && onImport ? (
              <AdminToolButton type="button" onClick={onImport} primary>
                <Upload className="h-3.5 w-3.5" aria-hidden />
                Import egg
              </AdminToolButton>
            ) : null}
          </div>
        </div>

        <div className="ds-nst-header-stats ds-ud-header-stats" role="list" aria-label="Nest summary">
          {stats.map((stat) => (
            <div key={stat.label} className="ds-nst-header-stat ds-ud-header-stat" role="listitem">
              <span className="ds-nst-header-stat-icon ds-ud-header-stat-icon" aria-hidden>
                <stat.icon className="h-3.5 w-3.5" />
              </span>
              <span className="ds-nst-header-stat-copy ds-ud-header-stat-copy">
                <span className="ds-nst-header-stat-label ds-ud-header-stat-label">{stat.label}</span>
                <span className="ds-nst-header-stat-value ds-ud-header-stat-value">{stat.value}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}

export function NestDetailPanel({
  icon: Icon,
  eyebrow,
  title,
  description,
  badge,
  actions,
  children,
  className,
  tone,
}: {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: 'danger' | 'warning' | 'identity' | 'capacity' | 'connection' | 'trends' | 'wings';
}) {
  const sectionTone =
    tone === 'danger'
      ? 'danger'
      : tone === 'identity' ||
          tone === 'capacity' ||
          tone === 'connection' ||
          tone === 'trends' ||
          tone === 'wings'
        ? tone
        : 'default';

  return (
    <AdminSection
      className={`ds-nst-panel${tone === 'warning' || tone === 'danger' ? ` ds-nst-panel--${tone}` : ''}${className ? ` ${className}` : ''}`}
      icon={Icon}
      eyebrow={eyebrow}
      title={title}
      description={description}
      badge={badge}
      actions={actions}
      tone={sectionTone}
    >
      {children}
    </AdminSection>
  );
}

export function NestDetailMetaGrid({
  items,
}: {
  items: { label: string; value: string; mono?: boolean; onCopy?: () => void; copied?: boolean }[];
}) {
  return (
    <dl className="ds-nst-meta-grid ds-ud-meta-grid">
      {items.map((item) => (
        <div key={item.label} className="ds-nst-meta-item ds-ud-meta-item">
          <dt className="ds-nst-meta-label ds-ud-meta-label">{item.label}</dt>
          <dd className={`ds-nst-meta-value ds-ud-meta-value${item.mono ? ' ds-text-mono' : ''}`}>
            <span className="truncate" title={item.value}>
              {item.value}
            </span>
            {item.onCopy ? (
              <button type="button" className="ds-nst-meta-copy ds-ud-meta-copy" onClick={item.onCopy}>
                <Copy className="h-3 w-3 inline" aria-hidden />
                {item.copied ? 'Copied' : 'Copy'}
              </button>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function NestDetailUsageMeter({
  label,
  value,
  max,
  hint,
}: {
  label: string;
  value: number;
  max: number;
  hint?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="ds-ud-usage-meter">
      <div className="ds-ud-usage-meter-head">
        <span>{label}</span>
        <span className="ds-ud-usage-meter-value">
          {value}
          {max > 0 ? ` / ${max}` : ''}
        </span>
      </div>
      {max > 0 ? (
        <div className="ds-ud-usage-meter-track" aria-hidden>
          <span
            className="ds-ud-usage-meter-fill"
            style={{ width: `${Math.max(pct > 0 ? 4 : 0, pct)}%` }}
          />
        </div>
      ) : null}
      {hint ? <p className="ds-ud-usage-meter-hint">{hint}</p> : null}
    </div>
  );
}
