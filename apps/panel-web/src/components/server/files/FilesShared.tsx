import type { ReactNode } from 'react';

export function FileActionButton({
  children,
  title,
  onClick,
  danger,
  size = 'md',
}: {
  children: ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
  size?: 'sm' | 'md';
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`ds-srv-fm-row-action${danger ? ' ds-srv-fm-row-action--danger' : ''}${size === 'sm' ? ' ds-srv-fm-row-action--sm' : ''}`}
    >
      {children}
    </button>
  );
}

export function ActionButton({
  children,
  variant = 'default',
  disabled,
  onClick,
  type = 'button',
}: {
  children: ReactNode;
  variant?: 'default' | 'subtle' | 'ghost' | 'danger';
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`ds-srv-fm-btn ds-srv-fm-btn--${variant}${disabled ? ' ds-srv-fm-btn--disabled' : ''}`}
    >
      {children}
    </button>
  );
}

export function BreadcrumbButton({
  children,
  onClick,
  active,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ds-srv-fm-crumb${active ? ' ds-srv-fm-crumb--active' : ''}`}
    >
      {children}
    </button>
  );
}
