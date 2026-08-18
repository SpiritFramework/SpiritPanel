import { useMemo } from 'react';
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
  img: ({ src, alt }) => {
    const safe = sanitizeImageSrc(src);
    if (!safe) return null;
    return (
      <figure className="mc-md-figure">
        <a href={safe} target="_blank" rel="noopener noreferrer" className="mc-md-image-link">
          <img src={safe} alt={alt ?? ''} loading="lazy" />
        </a>
        {alt ? <figcaption>{alt}</figcaption> : null}
      </figure>
    );
  },
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
