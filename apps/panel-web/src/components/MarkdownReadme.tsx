import { useMemo, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { sanitizeImageSrc, sanitizeLinkHref } from '../lib/safe-url';

const INITIAL_CHAR_LIMIT = 12_000;

export type GithubReadmeContext = {
  owner: string;
  repo: string;
  branch?: string | null;
};

const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'input'],
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a ?? []), 'target', 'rel'],
    code: [...(defaultSchema.attributes?.code ?? []), 'className'],
    span: [...(defaultSchema.attributes?.span ?? []), 'className'],
    img: [...(defaultSchema.attributes?.img ?? []), 'loading', 'decoding'],
    input: [['type', 'checkbox'], 'checked', 'disabled'],
  },
};

function normalizeBranch(branch?: string | null): string {
  const value = branch?.trim();
  return value || 'main';
}

function encodeGithubPath(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

/** Shields / CI / package badges — keep these compact and inline. */
export function isReadmeBadgeUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (
      host === 'img.shields.io' ||
      host === 'shields.io' ||
      host.endsWith('.shields.io') ||
      host === 'badge.fury.io' ||
      host === 'badges.gitter.im' ||
      host === 'ci.appveyor.com' ||
      host === 'travis-ci.org' ||
      host === 'travis-ci.com' ||
      host === 'circleci.com' ||
      host === 'codecov.io' ||
      host.endsWith('.codecov.io') ||
      host === 'coveralls.io' ||
      host === 'flat.badgen.net' ||
      host === 'badgen.net' ||
      host === 'versionbadge.com' ||
      host === 'api.dependabot.com'
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return /(?:^|[/.])(?:badge|shields?)(?:[/.]|$)/i.test(url);
}

/** Rewrite relative README paths to absolute GitHub / raw.githubusercontent URLs. */
export function resolveGithubMarkdownUrl(
  href: string,
  ctx: GithubReadmeContext | undefined,
  kind: 'image' | 'link',
): string | null {
  const raw = href.trim().replace(/^<|>$/g, '');
  if (!raw) return null;
  if (raw.startsWith('#')) return kind === 'link' ? raw : null;
  if (raw.startsWith('mailto:')) return kind === 'link' ? sanitizeLinkHref(raw) : null;
  if (raw.startsWith('data:')) return null;

  if (/^https?:\/\//i.test(raw)) {
    return kind === 'image' ? sanitizeImageSrc(raw) : sanitizeLinkHref(raw);
  }

  if (!ctx?.owner || !ctx?.repo) return null;
  if (raw.includes('..')) return null;

  const branch = normalizeBranch(ctx.branch);
  const path = raw.replace(/^\.\//, '').replace(/^\/+/, '');
  if (!path) return null;
  const encoded = encodeGithubPath(path);

  if (kind === 'image') {
    return sanitizeImageSrc(
      `https://raw.githubusercontent.com/${ctx.owner}/${ctx.repo}/${encodeURIComponent(branch)}/${encoded}`,
    );
  }

  return sanitizeLinkHref(
    `https://github.com/${ctx.owner}/${ctx.repo}/blob/${encodeURIComponent(branch)}/${encoded}`,
  );
}

/** Convert common GitHub HTML <img> tags into markdown so they render safely. */
function hoistHtmlImages(source: string): string {
  return source.replace(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi, (full, src: string) => {
    const altMatch = full.match(/\balt=["']([^"']*)["']/i);
    const alt = altMatch?.[1] ?? '';
    return `\n\n![${alt}](${String(src).trim()})\n\n`;
  });
}

function absolutizeMarkdownAssets(source: string, ctx?: GithubReadmeContext): string {
  if (!ctx) return source;

  // Images first.
  let next = source.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (full, alt: string, href: string) => {
    const resolved = resolveGithubMarkdownUrl(href, ctx, 'image');
    if (!resolved || resolved === href.trim()) return full;
    return `![${alt}](${resolved})`;
  });

  // Then non-image links.
  next = next.replace(/(^|[^!])\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (full, prefix: string, label: string, href: string) => {
    const trimmed = href.trim();
    if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('#') || trimmed.startsWith('mailto:')) {
      return full;
    }
    const resolved = resolveGithubMarkdownUrl(trimmed, ctx, 'link');
    if (!resolved) return full;
    return `${prefix}[${label}](${resolved})`;
  });

  return next;
}

function normalizeReadme(source: string, ctx?: GithubReadmeContext): string {
  return absolutizeMarkdownAssets(hoistHtmlImages(source), ctx)
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const components: Components = {
  a: ({ href, children }) => {
    const safe = sanitizeLinkHref(href) ?? (href?.startsWith('#') ? href : null);
    if (!safe) return <span>{children}</span>;
    if (safe.startsWith('#')) return <a href={safe}>{children}</a>;
    return (
      <a href={safe} target="_blank" rel="noopener noreferrer" className="mp-readme-link">
        {children}
      </a>
    );
  },
  img: ({ src, alt }) => {
    const safe = sanitizeImageSrc(src);
    if (!safe) return null;
    if (isReadmeBadgeUrl(safe)) {
      return (
        <img
          src={safe}
          alt={alt || 'badge'}
          loading="lazy"
          decoding="async"
          className="mp-readme-badge"
        />
      );
    }
    return (
      <figure className="mp-readme-figure">
        <a href={safe} target="_blank" rel="noopener noreferrer" className="mp-readme-image-link">
          <img src={safe} alt={alt ?? ''} loading="lazy" decoding="async" />
        </a>
        {alt ? <figcaption>{alt}</figcaption> : null}
      </figure>
    );
  },
  table: ({ children }) => (
    <div className="mp-readme-table-wrap">
      <table>{children}</table>
    </div>
  ),
  pre: ({ children }) => <pre className="mp-readme-code-block">{children}</pre>,
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className?.includes('language-') || String(children).includes('\n'));
    if (!isBlock) {
      return (
        <code className="mp-readme-inline-code" {...props}>
          {children}
        </code>
      );
    }
    const lang = className?.match(/language-([\w+-]+)/)?.[1];
    return (
      <>
        {lang ? <span className="mp-readme-code-lang">{lang}</span> : null}
        <code className={className} {...props}>
          {children}
        </code>
      </>
    );
  },
  h1: ({ children }) => <h1 className="mp-readme-h1">{children}</h1>,
  h2: ({ children }) => <h2 className="mp-readme-h2">{children}</h2>,
  h3: ({ children }) => <h3 className="mp-readme-h3">{children}</h3>,
  h4: ({ children }) => <h4 className="mp-readme-h4">{children}</h4>,
  h5: ({ children }) => <h5 className="mp-readme-h5">{children}</h5>,
  h6: ({ children }) => <h6 className="mp-readme-h6">{children}</h6>,
  p: ({ children }) => <p className="mp-readme-p">{children}</p>,
  ul: ({ children }) => <ul className="mp-readme-list">{children}</ul>,
  ol: ({ children }) => <ol className="mp-readme-list">{children}</ol>,
  blockquote: ({ children }) => <blockquote className="mp-readme-quote">{children}</blockquote>,
  hr: () => <hr className="mp-readme-hr" />,
};

export function MarkdownReadme({
  source,
  github,
}: {
  source: string;
  /** Used to resolve relative README images/links against the repo. */
  github?: GithubReadmeContext;
}) {
  const markdown = useMemo(() => normalizeReadme(source, github), [source, github]);
  const [expanded, setExpanded] = useState(false);

  if (!markdown) return null;

  const truncated = markdown.length > INITIAL_CHAR_LIMIT;
  const visible = expanded || !truncated ? markdown : `${markdown.slice(0, INITIAL_CHAR_LIMIT).trimEnd()}\n\n…`;

  return (
    <article className="mp-readme-content">
      <div className="mp-readme-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[[rehypeSanitize, schema]]}
          components={components}
        >
          {visible}
        </ReactMarkdown>
      </div>
      {truncated && !expanded ? (
        <button type="button" className="mp-readme-expand" onClick={() => setExpanded(true)}>
          Show full documentation
        </button>
      ) : null}
    </article>
  );
}
