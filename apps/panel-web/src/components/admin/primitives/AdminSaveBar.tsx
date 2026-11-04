import type { ReactNode } from 'react';

export function AdminSaveBar({
  dirty,
  saved,
  status,
  actions,
}: {
  dirty?: boolean;
  saved?: boolean;
  status?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div
      className={`ds-adm-savebar ds-nd-st-savebar${dirty ? ' ds-adm-savebar--dirty ds-nd-st-savebar--dirty' : ''}${
        saved ? ' ds-adm-savebar--saved ds-nd-st-savebar--saved' : ''
      }`}
    >
      {status ? <div className="ds-adm-savebar-status ds-nd-st-savebar-status">{status}</div> : null}
      <div className="ds-adm-savebar-actions ds-nd-st-savebar-actions">{actions}</div>
    </div>
  );
}
