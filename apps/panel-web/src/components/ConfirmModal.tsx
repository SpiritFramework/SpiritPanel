import { ConfirmDialog } from './ui';

export type ConfirmTone = 'danger' | 'warning' | 'default';

/** Destructive / high-impact confirmation — backed by ds-modal. */
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
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      description={description}
      detail={detail}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      tone={tone === 'danger' ? 'danger' : 'primary'}
      loading={loading}
      error={error}
    />
  );
}
