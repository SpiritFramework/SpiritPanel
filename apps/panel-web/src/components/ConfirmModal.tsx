import { AlertTriangle, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './Layout';
import { ModalShell } from './ModalShell';

export type ConfirmTone = 'danger' | 'warning' | 'default';

const TONE_STYLES: Record<
  ConfirmTone,
  { gradient: string; iconBg: string; Icon: LucideIcon }
> = {
  danger: {
    gradient: 'from-red-500/25 via-transparent to-transparent',
    iconBg: 'bg-red-500/15 text-red-400',
    Icon: Trash2,
  },
  warning: {
    gradient: 'from-amber-500/20 via-transparent to-transparent',
    iconBg: 'bg-amber-500/15 text-amber-400',
    Icon: AlertTriangle,
  },
  default: {
    gradient: 'from-[var(--accent)]/15 via-transparent to-transparent',
    iconBg: 'bg-[var(--accent-muted)] accent-text',
    Icon: AlertTriangle,
  },
};

export function ConfirmModal({
  open,
  title,
  description,
  detail,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  loading = false,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  if (!open) return null;

  const style = TONE_STYLES[tone];
  const Icon = style.Icon;

  return (
    <ModalShell
      onClose={loading ? () => {} : onClose}
      header={
        <div className="relative overflow-hidden border-b border-[var(--border)] pr-12">
          <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient}`} />
          <div className="relative flex items-start gap-3 px-5 py-5">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style.iconBg}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold">{title}</h2>
              {detail && <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{detail}</p>}
            </div>
          </div>
        </div>
      }
      footer={
        <div className="confirm-modal-footer">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading} className="w-full sm:w-auto">
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={() => void onConfirm()}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? 'Working…' : confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 p-5">
        <p className="text-sm leading-relaxed text-[var(--text)]">{description}</p>
        {tone === 'danger' && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-xs text-red-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>This action cannot be undone.</span>
          </div>
        )}
        {error && <div className="resource-modal-error">{error}</div>}
      </div>
    </ModalShell>
  );
}
