import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function ModalShell({
  children,
  onClose,
  wide,
  header,
  footer,
}: {
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="modal-overlay-enter absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div
        className={`modal-panel-enter modal-panel-safe relative flex w-full flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] sm:max-h-[92vh] sm:rounded-2xl ${
          wide ? 'sm:max-w-xl' : 'sm:max-w-lg'
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {header}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-[var(--muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="overflow-y-auto">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-[var(--border)] bg-[var(--bg-elevated)]/40 px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
