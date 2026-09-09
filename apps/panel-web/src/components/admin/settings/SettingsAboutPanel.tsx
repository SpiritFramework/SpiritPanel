import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Github,
  Globe,
  HardDrive,
  Megaphone,
  MessageCircle,
  Palette,
  Puzzle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  AUTHOR_CREDIT,
  PANEL_AUTHOR,
  PANEL_AUTHOR_DISCORD,
  PANEL_DOCS,
  PANEL_GITHUB,
  PANEL_PRODUCT,
  PANEL_TAGLINE,
  PANEL_VERSION,
} from '../../../lib/product-meta';
import { sanitizeLinkHref } from '../../../lib/safe-url';
import { useBranding } from '../../../context/BrandingContext';
import { PanelName } from '../../PanelName';
import { PanelVersionStatus } from './PanelVersionStatus';

const authorDiscord = sanitizeLinkHref(PANEL_AUTHOR_DISCORD);
const githubHref = sanitizeLinkHref(PANEL_GITHUB);
const docsHref = sanitizeLinkHref(PANEL_DOCS);

const RELATED_LINKS: { to: string; icon: LucideIcon; title: string; description: string }[] = [
  {
    to: '/admin/settings?tab=branding',
    icon: Palette,
    title: 'Branding',
    description: 'Player-facing name, logo, and theme colours',
  },
  {
    to: '/admin/plugins',
    icon: Puzzle,
    title: 'Plugins',
    description: 'FiveM marketplace and Minecraft Modrinth',
  },
  {
    to: '/admin/announce',
    icon: Megaphone,
    title: 'Announcements',
    description: 'Panel banners and maintenance notices',
  },
  {
    to: '/admin/domains',
    icon: Globe,
    title: 'Subdomains',
    description: 'Cloudflare DNS and player hostnames',
  },
  {
    to: '/admin/nodes',
    icon: HardDrive,
    title: 'Nodes',
    description: 'FeatherWings hosts, health, and daemon builds',
  },
];

export function SettingsAboutPanel() {
  const { branding } = useBranding();
  const hostPanelName = branding.panelName.trim() || 'Your panel';

  return (
    <div className="ds-set-about">
      <header className="ds-set-about-hero" aria-labelledby="about-product-title">
        <div className="ds-set-about-hero-top">
          <p className="ds-set-about-kicker">{PANEL_TAGLINE}</p>
          <span className="ds-set-about-version-chip ds-text-mono">v{PANEL_VERSION}</span>
        </div>
        <h2 id="about-product-title" className="ds-set-about-title">
          <PanelName name={PANEL_PRODUCT} variant="hero" className="ds-set-about-brand" />
        </h2>
        <p className="ds-set-about-lede">
          Open-source control plane for game servers. Manage console, files, backups, schedules,
          tickets, and marketplaces from this panel — FeatherWings runs the servers on each node.
        </p>
        <div className="ds-set-about-host">
          <span className="ds-set-about-host-label">This installation</span>
          <span className="ds-set-about-host-name">{hostPanelName}</span>
          <span className="ds-set-about-host-hint">
            Player-facing name from Branding — separate from the software product name above
          </span>
        </div>
      </header>

      <PanelVersionStatus />

      <div className="ds-set-about-secondary">
        <section className="ds-set-about-panel" aria-label="Project">
          <p className="ds-set-about-aside-label">Project</p>
          <PanelName name={PANEL_PRODUCT} variant="compact" className="ds-set-about-aside-brand" />
          <p className="ds-set-about-aside-copy">{AUTHOR_CREDIT}</p>
          <dl className="ds-set-about-meta">
            <div>
              <dt>Author</dt>
              <dd>{PANEL_AUTHOR}</dd>
            </div>
            <div>
              <dt>License</dt>
              <dd>AGPL-3.0</dd>
            </div>
            <div>
              <dt>Versioning</dt>
              <dd className="ds-text-mono">MAJOR.MINOR.FEATURE.PATCH</dd>
            </div>
            <div>
              <dt>Daemon</dt>
              <dd>FeatherWings (per node)</dd>
            </div>
            <div>
              <dt>Stack</dt>
              <dd>panel-web · panel-api · Postgres</dd>
            </div>
          </dl>
          <div className="ds-set-about-resource-row">
            {githubHref ? (
              <a href={githubHref} target="_blank" rel="noreferrer noopener" className="ds-set-about-resource">
                <Github className="h-3.5 w-3.5" aria-hidden />
                GitHub
                <ArrowUpRight className="h-3 w-3" aria-hidden />
              </a>
            ) : null}
            {docsHref ? (
              <a href={docsHref} target="_blank" rel="noreferrer noopener" className="ds-set-about-resource">
                <BookOpen className="h-3.5 w-3.5" aria-hidden />
                Docs
                <ArrowUpRight className="h-3 w-3" aria-hidden />
              </a>
            ) : null}
            {authorDiscord ? (
              <a
                href={authorDiscord}
                target="_blank"
                rel="noreferrer noopener"
                className="ds-set-about-resource ds-set-about-resource--accent"
              >
                <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                Discord
                <ArrowUpRight className="h-3 w-3" aria-hidden />
              </a>
            ) : null}
          </div>
        </section>

        <nav className="ds-set-about-panel ds-set-about-panel--nav" aria-label="Related admin areas">
          <p className="ds-set-about-aside-label">Related settings</p>
          <ul className="ds-set-about-nav-list">
            {RELATED_LINKS.map(({ to, icon: Icon, title, description }) => (
              <li key={to}>
                <Link to={to} className="ds-set-about-nav-link">
                  <span className="ds-set-about-nav-icon" aria-hidden>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="ds-set-about-nav-copy">
                    <span className="ds-set-about-nav-title">{title}</span>
                    <span className="ds-set-about-nav-desc">{description}</span>
                  </span>
                  <ChevronRight className="ds-set-about-nav-chevron h-4 w-4" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
