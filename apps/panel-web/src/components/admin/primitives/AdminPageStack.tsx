import type { ReactNode } from 'react';

export function AdminPageStack({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`ds-adm-page ds-nd-list${className ? ` ${className}` : ''}`}>{children}</div>;
}
