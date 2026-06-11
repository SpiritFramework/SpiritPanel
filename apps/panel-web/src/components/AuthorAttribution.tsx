import {
  PANEL_AUTHOR,
  PANEL_AUTHOR_DISCORD,
  PANEL_PRODUCT,
  PANEL_VERSION,
} from '../lib/product-meta';
import { sanitizeLinkHref } from '../lib/safe-url';

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

  const muted = onDark ? 'text-white/50' : 'text-[var(--muted)]';
  const emphasis = onDark ? 'text-white/75' : 'text-[var(--text)]';

  return (
    <p className={`px-1 text-[10px] leading-snug ${muted} ${className}`}>
      <span className={`font-medium ${emphasis}`}>{PANEL_PRODUCT}</span>
      <span className="opacity-50"> · </span>
      <AuthorLink onDark className={emphasis} />
    </p>
  );
}
