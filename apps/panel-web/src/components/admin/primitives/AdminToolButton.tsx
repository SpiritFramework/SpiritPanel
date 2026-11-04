import { Link } from 'react-router-dom';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Common = {
  children: ReactNode;
  className?: string;
  primary?: boolean;
};

type AsButton = Common &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    to?: undefined;
  };

type AsLink = Common & {
  to: string;
  disabled?: boolean;
  type?: never;
  onClick?: never;
};

export function AdminToolButton(props: AsButton | AsLink) {
  const { children, className = '', primary } = props;
  const classes = `ds-nd-tool-btn${primary ? ' ds-nd-tool-btn--primary' : ''} ds-adm-tool-btn${primary ? ' ds-adm-tool-btn--primary' : ''}${className ? ` ${className}` : ''}`;

  if ('to' in props && props.to) {
    return (
      <Link to={props.to} className={classes}>
        {children}
      </Link>
    );
  }

  const { to: _to, primary: _p, className: _c, children: _ch, ...btn } = props as AsButton;
  return (
    <button type={btn.type ?? 'button'} className={classes} {...btn}>
      {children}
    </button>
  );
}
