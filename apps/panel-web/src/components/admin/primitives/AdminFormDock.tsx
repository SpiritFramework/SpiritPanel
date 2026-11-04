import type { ReactNode } from 'react';

export function AdminFormDock({
  title,
  hint,
  actions,
}: {
  title: ReactNode;
  hint?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="ds-adm-form-dock ds-nd-create-dock">
      <div className="ds-adm-form-dock-copy ds-nd-create-dock-copy">
        <p className="ds-adm-form-dock-title ds-nd-create-dock-title">{title}</p>
        {hint ? <p className="ds-adm-form-dock-hint ds-nd-create-dock-hint">{hint}</p> : null}
      </div>
      <div className="ds-adm-form-dock-actions ds-nd-create-dock-actions">{actions}</div>
    </div>
  );
}
