import {
  PANEL_AUTHOR,
  PANEL_AUTHOR_DISCORD,
  PANEL_PRODUCT,
  PANEL_VERSION,
} from '../lib/product-meta';
import { sanitizeLinkHref } from '../lib/safe-url';
import { PanelName } from './PanelName';

type AuthorAttributionVariant = 'sidebar' | 'auth' | 'settings';

const authorDiscord = sanitizeLinkHref(PANEL_AUTHOR_DISCORD);

function AuthorLink({
  onDark,
  className = '',
}: {
  onDark?: boolean;
  className?: string;
}) {
  const hover = onDark ? 'hover:text-white' : 'hover:accent-text';

  if (!authorDiscord) {
    return <span className={className}>{PANEL_AUTHOR}</span>;
  }

  return (
    <a
      href={authorDiscord}
      target="_blank"
      rel="noreferrer noopener"
      className={`transition ${hover} ${className}`}
    >
      {PANEL_AUTHOR}
    </a>
  );
}

export function AuthorAttribution({
  variant = 'sidebar',
  onDark,
  className = '',
}: {
  variant?: AuthorAttributionVariant;
  /** Use on dark backgrounds (e.g. login brand panel). */
  onDark?: boolean;
  className?: string;
}) {
  if (variant === 'auth') {
    return (
      <p className={`text-center text-[11px] leading-relaxed text-[var(--muted)] ${className}`}>
        <span className="font-medium text-[var(--text)]">{PANEL_PRODUCT}</span>
        <span className="mx-1.5 opacity-40">·</span>
        Built by <AuthorLink />
      </p>
    );
  }

  if (variant === 'settings') {
    return (
      <div className={`space-y-1.5 text-[11px] leading-relaxed text-[var(--muted)] ${className}`}>
        <p className="text-sm font-semibold text-[var(--text)]">{PANEL_PRODUCT}</p>
        <p>
          Built by <AuthorLink className="font-medium text-[var(--text)]" />
        </p>
        {authorDiscord && (
          <a
            href={authorDiscord}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 transition hover:accent-text"
          >
            Discord community
          </a>
        )}
        <p className="font-mono text-[10px] opacity-80">v{PANEL_VERSION}</p>
      </div>
    );
  }

  const emphasis = onDark ? 'text-white/75' : 'text-[var(--text)]';

  return (
    <div
      className={`ds-attrib-sidebar${onDark ? ' ds-attrib-sidebar--dark' : ''} ${className}`.trim()}
      aria-label={`${PANEL_PRODUCT} version ${PANEL_VERSION}, built by ${PANEL_AUTHOR}`}
    >
      <span className="ds-attrib-sidebar-product">
        <PanelName name={PANEL_PRODUCT} variant="compact" className="panel-name--attrib" />
      </span>
      <span className="ds-attrib-sidebar-dot" aria-hidden>
        ·
      </span>
      <AuthorLink onDark className={`ds-attrib-sidebar-author ${emphasis}`} />
      <span className="ds-attrib-sidebar-dot" aria-hidden>
        ·
      </span>
      <span className={`ds-attrib-sidebar-version${onDark ? ' ds-attrib-sidebar-version--dark' : ''}`}>
        v{PANEL_VERSION}
      </span>
    </div>
  );
}
