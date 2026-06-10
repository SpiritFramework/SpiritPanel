import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { usePanelBackgroundClass } from '../hooks/usePanelBackgroundClass';

/** Admin/client app shell — drawer nav on phones, fixed sidebar from md up. */
export function MobileShell({
  sidebar,
  headerTitle,
  sidebarClassName = '',
  contentClassName = 'w-full min-w-0',
  children,
}: {
  sidebar: ReactNode;
  headerTitle?: ReactNode;
  sidebarClassName?: string;
  contentClassName?: string;
  children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

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

  const panelBgClass = usePanelBackgroundClass();

  return (
    <div className={`flex h-[100dvh] overflow-hidden ${panelBgClass}`}>
      {navOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[1px] md:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      <aside
        className={`glass-sidebar app-sidebar fixed inset-y-0 left-0 z-50 flex h-full w-[min(18rem,88vw)] flex-col border-r border-[var(--glass-border)] transition-transform duration-200 ease-out md:static md:z-auto md:w-56 md:shrink-0 md:translate-x-0 ${sidebarClassName} ${
          navOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-end border-b border-[var(--border)] p-2 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setNavOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {sidebar}
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="glass flex shrink-0 items-center gap-2.5 border-b border-[var(--glass-border)] px-3 py-2.5 safe-top md:hidden">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setNavOpen(true)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text)] transition hover:bg-[var(--surface-hover)]"
          >
            <Menu className="h-4 w-4" />
          </button>
          {headerTitle && <div className="min-w-0 flex-1">{headerTitle}</div>}
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 safe-bottom sm:p-5">
          <div className={contentClassName}>{children}</div>
        </main>
      </div>
    </div>
  );
}
