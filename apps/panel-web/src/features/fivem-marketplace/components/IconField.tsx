import type { LucideIcon } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';

export function IconField({
  icon: Icon,
  mono,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  icon: LucideIcon;
  mono?: boolean;
}) {
  return (
    <div className="ds-field-wrap">
      <Icon className="ds-field-wrap__icon" aria-hidden />
      <input
        className={`ds-field ds-field--icon-left w-full ${mono ? 'ds-field--mono' : ''} ${className}`.trim()}
        {...props}
      />
    </div>
  );
}
