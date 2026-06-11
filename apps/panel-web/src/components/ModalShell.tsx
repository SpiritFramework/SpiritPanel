import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

/** Legacy modal wrapper — renders ds-modal primitives. Prefer Modal from ui.tsx for new code. */
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
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="ds-modal-overlay" onClick={onClose} role="presentation">
      <div
        className={`ds-modal relative ${wide ? 'ds-modal--wide' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {header}
        <button
          type="button"
          onClick={onClose}
          className="ds-icon-btn ds-icon-btn--bordered absolute right-3 top-3 z-10"
          aria-label="Close"
        >
          <X className="ds-icon" />
        </button>
        <div className="ds-modal-body">{children}</div>
        {footer && <div className="ds-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
