import { useCallback, useEffect, useRef } from 'react';
import { api, type AlertEventSummary } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { isStaffOrPanelAdmin } from '../lib/roles';
import { useAuth } from '../context/AuthContext';

const SEEN_KEY = 'spirit-alert-toast-seen';
const POLL_MS = 12_000;

function loadSeen(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

function saveSeen(ids: Set<string>) {
  try {
    const list = [...ids].slice(-200);
    sessionStorage.setItem(SEEN_KEY, JSON.stringify(list));
  } catch {
    /* ignore quota / private mode */
  }
}

function toastHref(event: AlertEventSummary, staff: boolean): string {
  if (staff && (event.metric === 'ticket_opened' || event.metric === 'ticket_user_reply')) {
    return event.ticketId ? `/admin/tickets/${event.ticketId}` : '/admin/tickets';
  }
  return '/alerts';
}

function toastTone(severity: string): 'info' | 'warning' | 'error' {
  if (severity === 'critical') return 'error';
  if (severity === 'warning') return 'warning';
  return 'info';
}

/** Poll unread alerts and surface new ones as toasts (near real-time, no WebSocket). */
export function LiveAlertToasts() {
  const { user } = useAuth();
  const { info, warning, error } = useToast();
  const staff = isStaffOrPanelAdmin(user);
  const primedRef = useRef(false);
  const inFlightRef = useRef(false);

  const poll = useCallback(async () => {
    if (!user || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const res = await api.client.alertEvents(true);
      const events = res.events;
      const seen = loadSeen();

      if (!primedRef.current) {
        for (const event of events) seen.add(event.id);
        saveSeen(seen);
        primedRef.current = true;
        return;
      }

      const fresh = events.filter((event) => !seen.has(event.id));
      if (fresh.length === 0) return;

      // Newest first from API — toast oldest first so stack reads chronologically.
      for (const event of [...fresh].reverse()) {
        seen.add(event.id);
        const href = toastHref(event, staff);
        const tone = toastTone(event.severity);
        if (tone === 'error') error(event.title, event.message, href);
        else if (tone === 'warning') warning(event.title, event.message, href);
        else info(event.title, event.message, href);
      }
      saveSeen(seen);
      // Refresh the bell badge without re-entering this poller.
      window.dispatchEvent(new Event('spirit-alerts-changed'));
    } catch {
      /* best-effort */
    } finally {
      inFlightRef.current = false;
    }
  }, [user, staff, info, warning, error]);

  useEffect(() => {
    primedRef.current = false;
    void poll();
    const id = window.setInterval(() => void poll(), POLL_MS);
    const onFocus = () => void poll();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [poll]);

  return null;
}
