import { useMemo, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { sanitizeImageSrc, sanitizeLinkHref } from '../../lib/safe-url';

const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'input'],
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a ?? []), 'target', 'rel'],
    code: [...(defaultSchema.attributes?.code ?? []), 'className'],
    span: [...(defaultSchema.attributes?.span ?? []), 'className'],
    input: [['type', 'checkbox'], 'checked', 'disabled'],
  },
};

function looksLikeBadgeUrl(src: string): boolean {
  return (
    /shields\.io|img\.shields|devins-badges|discord(?:app)?\.com\/api\/guilds|badge\.fury|buymeacoffee|ko-fi\.com\/.+\/.+button|github\.com\/.+\/.+\/(actions|workflows).+badge/i.test(
      src,
    ) ||
    /\/badges?\/|button\.svg|flat-square|cozy\/|compact\//i.test(src) ||
    /cdn\.modrinth\.com\/data\/cached_images\//i.test(src)
  );
}

function looksLikeBadgeAlt(alt?: string | null): boolean {
  if (!alt?.trim()) return false;
  return /-?badges?$/i.test(alt.trim()) || /^badges?\b/i.test(alt.trim());
}

function looksLikeBadgeDimensions(width: number, height: number): boolean {
  if (!width || !height) return false;
  if (height > 96) return false;
  if (height <= 72 && width / height >= 1.35) return true;
  if (height <= 64 && width <= 360) return true;
  return false;
}

function meaningfulCaption(alt?: string | null): string | null {
  if (!alt?.trim()) return null;
  const t = alt.trim();
  if (t.length > 80) return null;
  if (/^[\w./:-]+$/i.test(t) && t.length < 48) return null;
  if (/-?badges?$/i.test(t) || /^badges?\b/i.test(t)) return null;
  return t;
}

function MarkdownImage({ src, alt }: { src?: string | null; alt?: string | null }) {
  const safe = sanitizeImageSrc(src);
  const [kind, setKind] = useState<'badge' | 'image'>(() =>
    safe && (looksLikeBadgeUrl(safe) || looksLikeBadgeAlt(alt)) ? 'badge' : 'image',
  );
  const [failed, setFailed] = useState(false);

  if (!safe || failed) return null;

  const img = (
    <img
      src={safe}
      alt={alt ?? ''}
      className={kind === 'badge' ? 'mc-md-badge' : undefined}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      onLoad={(e) => {
        const el = e.currentTarget;
        const next = looksLikeBadgeDimensions(el.naturalWidth, el.naturalHeight) ? 'badge' : 'image';
        setKind((prev) => (prev === next ? prev : next));
      }}
    />
  );

  if (kind === 'badge') {
    // Do not wrap in <a> — linked badges already sit inside markdown <a>.
    return <span className="mc-md-badge-wrap">{img}</span>;
  }

  const caption = meaningfulCaption(alt);
  return (
    <figure className="mc-md-figure">
      <a href={safe} target="_blank" rel="noopener noreferrer" className="mc-md-image-link">
        {img}
      </a>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

const components: Components = {
  a: ({ href, children }) => {
    const safe = sanitizeLinkHref(href);
    if (!safe) return <span>{children}</span>;
    return (
      <a href={safe} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
  img: ({ src, alt }) => <MarkdownImage src={src} alt={alt} />,
  table: ({ children }) => (
    <div className="mc-md-table-wrap">
      <table>{children}</table>
    </div>
  ),
  pre: ({ children }) => <pre className="mc-md-pre">{children}</pre>,
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className?.includes('language-') || String(children).includes('\n'));
    if (!isBlock) {
      return (
        <code className="mc-md-inline-code" {...props}>
          {children}
        </code>
      );
    }
    const lang = className?.match(/language-([\w+-]+)/)?.[1];
    return (
      <code className={className} data-lang={lang || undefined} {...props}>
        {children}
      </code>
    );
  },
};

function normalizeModrinthBody(body: string): string {
  return body
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function PluginMarkdownAbout({ body }: { body: string }) {
  const markdown = useMemo(() => normalizeModrinthBody(body), [body]);
  if (!markdown) return null;

  return (
    <article className="mc-project-about">
      <header className="mc-project-about-head">
        <h2 className="mc-section-title">About</h2>
        <p className="mc-project-about-hint">From Modrinth</p>
      </header>
      <div className="mc-md-scroll">
        <div className="mc-md">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[[rehypeSanitize, schema]]}
            components={components}
          >
            {markdown}
          </ReactMarkdown>
        </div>
      </div>
    </article>
  );
}
