import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { AdminSection } from '../primitives';

/** Shared section chrome for node detail tabs — matches overview cards. */
export function NodeDetailPanel({
  title,
  description,
  icon: Icon,
  tone,
  children,
  actions,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  tone?: 'danger';
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <AdminSection
      className={`ds-nd-ov-card${tone === 'danger' ? ' ds-nd-ov-card--danger' : ''}`}
      icon={Icon}
      title={title}
      description={description}
      actions={actions}
      tone={tone === 'danger' ? 'danger' : 'default'}
    >
      {children}
    </AdminSection>
  );
}
