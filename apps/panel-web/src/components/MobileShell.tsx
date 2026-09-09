import { useEffect, useId, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useBranding } from '../context/BrandingContext';
import { usePanelBackgroundClass } from '../hooks/usePanelBackgroundClass';
import { normalizeAppearance, sidebarMaterialClassName } from '../lib/branding-appearance';
import { AmbientBackdrop } from './AmbientBackdrop';

const TICKET_CHAT_ROUTE = /^\/(?:admin\/)?tickets\/[^/]+$/;

/** Admin/client app shell — drawer nav on phones, fixed sidebar from md up. */
export function MobileShell({
  sidebar,
  headerTitle,
  sidebarClassName = '',
  contentClassName = 'w-full min-w-0',
  fillHeight = false,
  children,
}: {
  sidebar: ReactNode;
  headerTitle?: ReactNode;
  sidebarClassName?: string;
  contentClassName?: string;
  fillHeight?: boolean;
  children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
  const isTicketChat = TICKET_CHAT_ROUTE.test(location.pathname);
  const drawerId = useId();

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [navOpen]);

  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navOpen]);

  const panelBgClass = usePanelBackgroundClass();
  const { branding } = useBranding();
  const materialClass = sidebarMaterialClassName(normalizeAppearance(branding).sidebarMaterial);

  return (
    <div className={`flex h-[100dvh] max-h-[100dvh] w-full max-w-[100vw] overflow-hidden ${panelBgClass}`}>
      {navOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[1px] md:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      <aside
        id={drawerId}
        className={`glass-sidebar app-sidebar ${materialClass} fixed inset-y-0 left-0 z-50 flex h-full w-[min(18rem,88vw)] max-w-[88vw] flex-col border-r border-[var(--glass-border)] transition-transform duration-200 ease-out md:static md:z-auto md:w-56 md:max-w-none md:shrink-0 md:transform-none ${sidebarClassName} ${
          navOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-end border-b border-[var(--border)] p-2 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setNavOpen(false)}
            className="mobile-icon-btn inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {sidebar}
      </aside>

      <div className={`mobile-shell-main flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-hidden${isTicketChat ? ' mobile-shell-main--ticket' : ''}`}>
        {!isTicketChat ? <AmbientBackdrop /> : null}
        <header className="glass relative z-[1] flex shrink-0 items-center gap-2.5 border-b border-[var(--glass-border)] px-3 py-2.5 safe-top md:hidden">
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={navOpen}
            aria-controls={drawerId}
            onClick={() => setNavOpen(true)}
            className="mobile-icon-btn inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text)] transition hover:bg-[var(--surface-hover)]"
          >
            <Menu className="h-4 w-4" />
          </button>
          {headerTitle && <div className="min-w-0 flex-1 overflow-hidden">{headerTitle}</div>}
        </header>

        <main
          className={
            isTicketChat || fillHeight
              ? `ticket-chat-host ${contentClassName}`
              : `min-h-0 w-full min-w-0 max-w-full flex-1 overflow-y-auto overflow-x-hidden p-3 safe-bottom sm:p-5 ${contentClassName}`
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}
