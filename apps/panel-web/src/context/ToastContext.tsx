import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
  to?: string;
}

type ToastFn = (title: string, description?: string, to?: string) => void;

interface ToastContextValue {
  toast: (tone: ToastTone, title: string, description?: string, to?: string) => void;
  success: ToastFn;
  error: ToastFn;
  warning: ToastFn;
  info: ToastFn;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_META: Record<ToastTone, { icon: typeof Info; color: string }> = {
  success: { icon: CheckCircle2, color: 'var(--success-fg)' },
  error: { icon: XCircle, color: 'var(--danger-fg)' },
  warning: { icon: TriangleAlert, color: 'var(--warning-fg)' },
  info: { icon: Info, color: 'var(--info-fg)' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (tone: ToastTone, title: string, description?: string, to?: string) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, tone, title, description, to }]);
      window.setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (t, d, to) => toast('success', t, d, to),
      error: (t, d, to) => toast('error', t, d, to),
      warning: (t, d, to) => toast('warning', t, d, to),
      info: (t, d, to) => toast('info', t, d, to),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport pointer-events-none fixed z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          const meta = TONE_META[t.tone];
          const Icon = meta.icon;
          const body = (
            <>
              <Icon size={18} style={{ color: meta.color }} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--text)]">{t.title}</p>
                {t.description && <p className="mt-0.5 text-xs text-[var(--muted)]">{t.description}</p>}
                {t.to ? (
                  <p className="mt-1 text-xs font-medium text-[var(--accent)]">
                    {t.to.startsWith('/admin/tickets') ? 'Open ticket' : 'View alerts'}
                  </p>
                ) : null}
              </div>
            </>
          );
          return (
            <div
              key={t.id}
              className="toast-enter pointer-events-auto flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-lg)]"
            >
              {t.to ? (
                <Link
                  to={t.to}
                  className="flex min-w-0 flex-1 items-start gap-3 text-inherit no-underline"
                  onClick={() => dismiss(t.id)}
                >
                  {body}
                </Link>
              ) : (
                <div className="flex min-w-0 flex-1 items-start gap-3">{body}</div>
              )}
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-md p-1 text-[var(--muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
