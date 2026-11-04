import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Info, CheckCircle2, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';

const DEFAULT_ICONS: Record<NonNullable<ClientCalloutProps['tone']>, LucideIcon> = {
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
  success: CheckCircle2,
};

type ClientCalloutProps = {
  tone?: 'warning' | 'error' | 'info' | 'success';
  icon?: LucideIcon;
  iconClassName?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** When set, the callout is clickable (e.g. My Servers attention filters). */
  onClick?: () => void;
  className?: string;
};

export function ClientCallout({
  tone = 'info',
  icon,
  iconClassName = '',
  title,
  description,
  action,
  onClick,
  className = '',
}: ClientCalloutProps) {
  const Icon = icon ?? DEFAULT_ICONS[tone];
  const classes = `ds-cli-callout ds-cli-callout--${tone}${onClick ? ' ds-cli-callout--action' : ''}${className ? ` ${className}` : ''}`;

  const body = (
    <>
      <span className="ds-cli-callout-icon" aria-hidden>
        <Icon className={`h-4 w-4${iconClassName ? ` ${iconClassName}` : ''}`} />
      </span>
      <div className="ds-cli-callout-copy">
        <p className="ds-cli-callout-title">{title}</p>
        {description ? <p className="ds-cli-callout-desc">{description}</p> : null}
      </div>
      {action ? <div className="ds-cli-callout-action">{action}</div> : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick}>
        {body}
      </button>
    );
  }

  return (
    <aside className={classes} role="status" aria-live="polite">
      {body}
    </aside>
  );
}
