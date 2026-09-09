import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronRight, Globe, Megaphone, Puzzle } from 'lucide-react';
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
import { PanelVersionStatus } from './PanelVersionStatus';

const authorDiscord = sanitizeLinkHref(PANEL_AUTHOR_DISCORD);

const RELATED_LINKS: { to: string; icon: LucideIcon; title: string; description: string }[] = [
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
    description: 'Banners and maintenance notices',
  },
  {
    to: '/admin/domains',
    icon: Globe,
    title: 'Subdomains',
    description: 'Cloudflare DNS and player hostnames',
  },
];

export function SettingsAboutPanel() {
  const { branding } = useBranding();
  const hostPanelName = branding.panelName.trim() || 'Your panel';

  return (
    <div className="ds-set-about">
      <header className="ds-set-about-hero" aria-labelledby="about-product-title">
        <p className="ds-set-about-kicker">{PANEL_TAGLINE}</p>
        <h2 id="about-product-title" className="ds-set-about-title">
          <PanelName name={PANEL_PRODUCT} variant="hero" className="ds-set-about-brand" />
        </h2>
        <p className="ds-set-about-lede">
          Deploy, manage, and support game servers from one place — console, files, backups, and
          marketplaces included.
        </p>
        <p className="ds-set-about-host">
          This installation runs as <strong>{hostPanelName}</strong>
        </p>
      </header>

      <div className="ds-set-about-layout">
        <PanelVersionStatus />

        <aside className="ds-set-about-aside" aria-label="Credits">
          <p className="ds-set-about-aside-label">Credits</p>
          <PanelName name={PANEL_PRODUCT} variant="compact" className="ds-set-about-aside-brand" />
          <p className="ds-set-about-aside-copy">{AUTHOR_CREDIT}</p>
          <dl className="ds-set-about-meta">
            <div>
              <dt>Author</dt>
              <dd>{PANEL_AUTHOR}</dd>
            </div>
            <div>
              <dt>Build</dt>
              <dd className="ds-text-mono">v{PANEL_VERSION}</dd>
            </div>
          </dl>
          {authorDiscord ? (
            <a
              href={authorDiscord}
              target="_blank"
              rel="noreferrer noopener"
              className="ds-set-about-discord"
            >
              Join Discord
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          ) : null}
        </aside>
      </div>

      <nav className="ds-set-about-nav" aria-label="Related admin areas">
        <p className="ds-set-about-aside-label">Related</p>
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
  );
}
