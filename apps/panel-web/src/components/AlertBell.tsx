import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { api } from '../lib/api';

/** Compact unread badge linking to /alerts. Polls every 45s. */
export function AlertBell({ to = '/alerts' }: { to?: string }) {
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await api.client.alertsSummary();
      setUnread(res.unread);
    } catch {
      /* ignore — bell is best-effort */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 45_000);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  return (
    <Link
      to={to}
      className="ds-icon-btn ds-icon-btn--bordered relative inline-flex h-8 w-8 items-center justify-center text-[var(--muted)] hover:text-[var(--text)]"
      title={unread > 0 ? `${unread} unread alerts` : 'Alerts'}
      aria-label={unread > 0 ? `${unread} unread alerts` : 'Alerts'}
    >
      <Bell className="h-3.5 w-3.5" aria-hidden />
      {unread > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[9px] font-bold text-white">
          {unread > 99 ? '99+' : unread}
        </span>
      ) : null}
    </Link>
  );
}
