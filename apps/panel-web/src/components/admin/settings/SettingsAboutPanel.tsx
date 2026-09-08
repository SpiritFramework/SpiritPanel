import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Calendar,
  ChevronRight,
  Code2,
  Database,
  Globe,
  Headphones,
  Heart,
  Megaphone,
  Puzzle,
  Server,
  Shield,
  Sparkles,
  Terminal,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  AUTHOR_CREDIT,
  PANEL_AUTHOR,
  PANEL_AUTHOR_DISCORD,
  PANEL_PRODUCT,
  PANEL_TAGLINE,
  PANEL_VERSION,
} from '../../../lib/product-meta';
import { sanitizeLinkHref } from '../../../lib/safe-url';
import { useBranding } from '../../../context/BrandingContext';
import { PanelName } from '../../PanelName';
import { NodeOverviewSection } from '../node-detail/NodeDetailShell';

const authorDiscord = sanitizeLinkHref(PANEL_AUTHOR_DISCORD);

const CAPABILITIES = [
  { icon: Terminal, label: 'Console' },
  { icon: Database, label: 'Backups' },
  { icon: Server, label: 'Files' },
  { icon: Calendar, label: 'Schedules' },
  { icon: Users, label: 'Subusers' },
  { icon: Puzzle, label: 'Plugins' },
] as const;

const HIGHLIGHTS = [
  {
    icon: Server,
    title: 'Deploy & manage',
    description: 'Create servers, assign nodes, and monitor resource usage from one fleet dashboard.',
  },
  {
    icon: Shield,
    title: 'Secure by default',
    description: 'Role-based access, subusers, API keys, and activity logging for your team.',
  },
  {
    icon: Headphones,
    title: 'Support built in',
    description: 'Tickets, announcements, and email templates keep hosts connected to users.',
  },
] as const;

const RELATED_LINKS: {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
  external?: boolean;
}[] = [
  {
    to: '/admin/plugins',
    icon: Sparkles,
    title: 'Plugins',
    description: 'FiveM marketplace and Minecraft Modrinth installs',
  },
  {
    to: '/admin/announce',
    icon: Megaphone,
    title: 'Announcements',
    description: 'Panel-wide banners and maintenance notices',
  },
  {
    to: '/admin/domains',
    icon: Globe,
    title: 'Subdomains',
    description: 'Cloudflare DNS and player-facing hostnames',
  },
];

export function SettingsAboutPanel() {
  const { branding } = useBranding();
  const hostPanelName = branding.panelName.trim() || 'Your panel';

  return (
    <div className="ds-set-about">
      <section className="ds-set-about-banner" aria-labelledby="about-product-title">
        <div className="ds-set-about-banner-glow" aria-hidden />
        <div className="ds-set-about-banner-grid" aria-hidden />
        <div className="ds-set-about-banner-inner">
          <div className="ds-set-about-brand-row">
            <h2 id="about-product-title" className="ds-set-about-product-heading">
              <PanelName name={PANEL_PRODUCT} variant="hero" className="ds-set-about-product-name" />
            </h2>
            <span className="ds-set-about-version-pill">v{PANEL_VERSION}</span>
          </div>

          <p className="ds-set-about-eyebrow">{PANEL_TAGLINE}</p>

          <p className="ds-set-about-desc">
            Spirit Panel helps hosts and communities deploy, manage, and support game servers from one
            place — console, files, backups, schedules, billing integrations, and plugin marketplaces
            included.
          </p>

          <p className="ds-set-about-host">
            Running on <strong>{hostPanelName}</strong>
          </p>

          <div className="ds-set-about-caps" aria-label="Panel capabilities">
            {CAPABILITIES.map(({ icon: Icon, label }) => (
              <span key={label} className="ds-set-about-cap">
                <Icon className="h-3 w-3" aria-hidden />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="ds-set-about-split">
        <NodeOverviewSection
          icon={Sparkles}
          title="What's included"
          description="Core capabilities shipped with Spirit Panel V4"
        >
          <ul className="ds-set-about-features">
            {HIGHLIGHTS.map(({ icon: Icon, title, description }, index) => (
              <li key={title} className="ds-set-about-feature">
                <span className="ds-set-about-feature-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="ds-set-about-feature-icon" aria-hidden>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="ds-set-about-feature-copy">
                  <span className="ds-set-about-feature-title">{title}</span>
                  <span className="ds-set-about-feature-desc">{description}</span>
                </span>
              </li>
            ))}
          </ul>
        </NodeOverviewSection>

        <NodeOverviewSection icon={Heart} title="Credits" description="Software attribution">
          <div className="ds-set-about-credits">
            <div className="ds-set-about-credits-brand">
              <PanelName name={PANEL_PRODUCT} variant="compact" />
              <span className="ds-set-about-credits-version">Version {PANEL_VERSION}</span>
            </div>

            <p className="ds-set-about-credits-copy">{AUTHOR_CREDIT}</p>

            <dl className="ds-set-about-credits-meta">
              <div className="ds-set-about-credits-row">
                <dt>Framework</dt>
                <dd>{PANEL_AUTHOR}</dd>
              </div>
              <div className="ds-set-about-credits-row">
                <dt>Release</dt>
                <dd className="font-mono">v{PANEL_VERSION}</dd>
              </div>
            </dl>

            {authorDiscord && (
              <a
                href={authorDiscord}
                target="_blank"
                rel="noreferrer noopener"
                className="ds-set-about-discord-btn"
              >
                Join {PANEL_AUTHOR} on Discord
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </a>
            )}
          </div>
        </NodeOverviewSection>
      </div>

      <NodeOverviewSection
        icon={Code2}
        title="Configure elsewhere"
        description="Related admin areas for plugins, messaging, and DNS"
      >
        <div className="ds-set-about-link-grid">
          {RELATED_LINKS.map(({ to, icon: Icon, title, description }) => (
            <Link key={to} to={to} className="ds-set-about-link-card">
              <span className="ds-set-about-link-icon" aria-hidden>
                <Icon className="h-4 w-4" />
              </span>
              <span className="ds-set-about-link-copy">
                <span className="ds-set-about-link-title">{title}</span>
                <span className="ds-set-about-link-desc">{description}</span>
              </span>
              <ChevronRight className="ds-set-about-link-arrow h-4 w-4" aria-hidden />
            </Link>
          ))}
        </div>
      </NodeOverviewSection>
    </div>
  );
}
