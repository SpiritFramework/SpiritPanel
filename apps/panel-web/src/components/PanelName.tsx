import type { CSSProperties } from 'react';

export type PanelNameVariant = 'sidebar' | 'hero' | 'compact' | 'preview';

export function splitPanelName(name: string): {
  primary: string;
  separator?: string;
  secondary?: string;
} {
  const trimmed = name.trim();
  if (!trimmed) return { primary: 'Panel' };

  const hyphenIdx = trimmed.indexOf('-');
  if (hyphenIdx > 0 && hyphenIdx < trimmed.length - 1) {
    return {
      primary: trimmed.slice(0, hyphenIdx),
      separator: '-',
      secondary: trimmed.slice(hyphenIdx + 1),
    };
  }

  const lastSpace = trimmed.lastIndexOf(' ');
  if (lastSpace > 0 && lastSpace < trimmed.length - 1) {
    const tail = trimmed.slice(lastSpace + 1);
    if (tail.length <= 16 && trimmed.slice(0, lastSpace).length >= 2) {
      return {
        primary: trimmed.slice(0, lastSpace),
        separator: ' ',
        secondary: tail,
      };
    }
  }

  return { primary: trimmed };
}

export function PanelName({
  name,
  variant = 'sidebar',
  className = '',
  as: Tag = 'span',
}: {
  name: string;
  variant?: PanelNameVariant;
  className?: string;
  as?: 'span' | 'h1' | 'p';
}) {
  const parts = splitPanelName(name || 'Panel name');
  const hasSplit = Boolean(parts.secondary);

  return (
    <Tag className={`panel-name panel-name--${variant} ${className}`.trim()} data-split={hasSplit || undefined}>
      <span className="panel-name-primary">{parts.primary}</span>
      {hasSplit && parts.separator && parts.secondary && (
        <>
          <span className="panel-name-sep" aria-hidden="true">
            {parts.separator}
          </span>
          <span className="panel-name-secondary">{parts.secondary}</span>
        </>
      )}
    </Tag>
  );
}

/** Logo fallback initial from panel name */
export function panelNameInitial(name: string): string {
  const parts = splitPanelName(name);
  const source = parts.secondary || parts.primary;
  return source.charAt(0).toUpperCase() || 'P';
}

export function panelNameGradientStyle(): CSSProperties {
  return {
    background: 'linear-gradient(140deg, var(--accent) 0%, var(--accent-secondary, var(--accent)) 100%)',
  };
}
