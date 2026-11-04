import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Box,
  ChevronRight,
  Copy,
  Layers,
  Mail,
  Server,
  Settings,
  Terminal,
  Variable,
} from 'lucide-react';
import type { AdminEggDetail } from '../../../lib/api';
import { getServerTheme } from '../../../lib/server-theme';
import { ServerEggIcon } from '../../ServerEggIcon';
import { StatusPill } from '../../ui';
import type { EggDetailTab } from '../../../pages/admin/egg-detail/helpers';
import { EGG_GRADIENT } from '../../../pages/admin/egg-detail/helpers';
import { AdminSection, AdminToolButton } from '../primitives';

export function EggDetailTabNav({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: EggDetailTab; label: string; count?: number }[];
  active: EggDetailTab;
  onChange: (tab: EggDetailTab) => void;
}) {
  return (
    <nav className="ds-nd-header-tabs ds-adm-entity-tabs" aria-label="Egg sections">
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

export function EggDetailHeader({
  detail,
  onManage,
  onVariables,
  onConfig,
}: {
  detail: AdminEggDetail;
  onManage?: () => void;
  onVariables?: () => void;
  onConfig?: () => void;
}) {
  const theme = getServerTheme(detail.name);
  const gradient = theme.gradient ?? EGG_GRADIENT;
  const imageCount = Object.keys(detail.dockerImages).length;

  const stats: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Layers, label: 'Nest', value: detail.nest.name },
    { icon: Variable, label: 'Variables', value: String(detail.variables.length) },
    { icon: Server, label: 'Servers', value: String(detail.serverCount) },
    { icon: Box, label: 'Images', value: String(imageCount) },
  ];

  return (
    <header
      className={`ds-egg-header ds-adm-entity ds-ud-header${detail.enabled ? '' : ' ds-egg-header--disabled'} ds-adm-entity--${detail.enabled ? 'online' : 'warn'}`}
    >
      <nav className="ds-egg-header-crumb ds-adm-entity-crumb ds-ud-header-crumb" aria-label="Breadcrumb">
        <Link to="/admin/nests">Nests</Link>
        <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden />
        <Link to={`/admin/nests/${detail.nestId}`} className="truncate">
          {detail.nest.name}
        </Link>
        <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden />
        <span className="truncate">{detail.name}</span>
      </nav>

      <div className="ds-egg-header-body ds-ud-header-body">
        <div className="ds-ud-header-glow" aria-hidden />
        <div className="ds-egg-header-accent ds-ud-header-accent" style={{ background: gradient }} aria-hidden />

        <div className="ds-egg-header-main ds-ud-header-main">
          <div className="ds-egg-header-identity ds-ud-header-identity">
            <div className="ds-egg-header-icon-wrap" style={{ background: gradient }} aria-hidden>
              <ServerEggIcon
                eggName={detail.name}
                logoUrl={detail.logoUrl}
                className="h-5 w-5"
              />
              <span
                className={`ds-egg-header-pulse${detail.enabled ? '' : ' ds-egg-header-pulse--off'}`}
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="ds-ud-header-eyebrow">Egg manage</p>
              <div className="ds-egg-header-title-row ds-ud-header-title-row">
                <h1 className="ds-egg-header-title ds-ud-header-title truncate">{detail.name}</h1>
                <StatusPill
                  label={detail.enabled ? 'Enabled' : 'Disabled'}
                  tone={detail.enabled ? 'success' : 'warning'}
                  pulse={detail.enabled}
                />
                {detail.serverCount > 0 ? (
                  <StatusPill label="In use" tone="info" compact />
                ) : null}
              </div>
              <p className="ds-egg-header-sub ds-ud-header-meta truncate">
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
            className="ds-nd-toolstrip ds-adm-entity-actions ds-egg-header-actions ds-ud-header-actions"
            role="group"
            aria-label="Egg actions"
          >
            {onVariables ? (
              <AdminToolButton type="button" onClick={onVariables}>
                <Variable className="h-3.5 w-3.5" aria-hidden />
                Variables
              </AdminToolButton>
            ) : null}
            {onConfig ? (
              <AdminToolButton type="button" onClick={onConfig}>
                <Terminal className="h-3.5 w-3.5" aria-hidden />
                Config
              </AdminToolButton>
            ) : null}
            {onManage ? (
              <AdminToolButton type="button" onClick={onManage} primary>
                <Settings className="h-3.5 w-3.5" aria-hidden />
                Manage
              </AdminToolButton>
            ) : null}
          </div>
        </div>

        <div className="ds-egg-header-stats ds-ud-header-stats" role="list" aria-label="Egg summary">
          {stats.map((stat) => (
            <div key={stat.label} className="ds-egg-header-stat ds-ud-header-stat" role="listitem">
              <span className="ds-egg-header-stat-icon ds-ud-header-stat-icon" aria-hidden>
                <stat.icon className="h-3.5 w-3.5" />
              </span>
              <span className="ds-egg-header-stat-copy ds-ud-header-stat-copy">
                <span className="ds-egg-header-stat-label ds-ud-header-stat-label">{stat.label}</span>
                <span className="ds-egg-header-stat-value ds-ud-header-stat-value">{stat.value}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}

export function EggDetailPanel({
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
      className={`ds-egg-panel${tone === 'warning' || tone === 'danger' ? ` ds-egg-panel--${tone}` : ''}${className ? ` ${className}` : ''}`}
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

export function EggDetailMetaGrid({
  items,
}: {
  items: { label: string; value: string; mono?: boolean; onCopy?: () => void; copied?: boolean }[];
}) {
  return (
    <dl className="ds-egg-meta-grid ds-ud-meta-grid">
      {items.map((item) => (
        <div key={item.label} className="ds-egg-meta-item ds-ud-meta-item">
          <dt className="ds-egg-meta-label ds-ud-meta-label">{item.label}</dt>
          <dd className={`ds-egg-meta-value ds-ud-meta-value${item.mono ? ' ds-text-mono' : ''}`}>
            <span className="truncate" title={item.value}>
              {item.value}
            </span>
            {item.onCopy ? (
              <button type="button" className="ds-egg-meta-copy ds-ud-meta-copy" onClick={item.onCopy}>
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

export function EggDetailUsageMeter({
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
