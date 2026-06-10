import { AlertTriangle, RotateCw, Skull, Square } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './Layout';
import { ModalShell } from './ModalShell';

export type DestructivePowerAction = 'stop' | 'restart' | 'kill';

const POWER_COPY: Record<
  DestructivePowerAction,
  {
    title: string;
    description: string;
    confirm: string;
    icon: LucideIcon;
    tone: 'warning' | 'danger';
  }
> = {
  stop: {
    title: 'Stop this server?',
    description:
      'Gracefully shuts down the running container. Players may be disconnected and the server will go offline until you start it again.',
    confirm: 'Stop server',
    icon: Square,
    tone: 'warning',
  },
  restart: {
    title: 'Restart this server?',
    description:
      'Stops and starts the container again. Active players will be disconnected briefly while the server comes back online.',
    confirm: 'Restart server',
    icon: RotateCw,
    tone: 'warning',
  },
  kill: {
    title: 'Force kill this server?',
    description:
      'Immediately terminates the container without a clean shutdown. Use only if the server is frozen — unsaved data may be lost.',
    confirm: 'Kill server',
    icon: Skull,
    tone: 'danger',
  },
};

export function PowerConfirmModal({
  action,
  serverName,
  loading,
  onClose,
  onConfirm,
}: {
  action: DestructivePowerAction;
  serverName: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const copy = POWER_COPY[action];
  const Icon = copy.icon;
  const accent =
    copy.tone === 'danger'
      ? 'from-red-500/25 via-transparent to-transparent'
      : 'from-amber-500/20 via-transparent to-transparent';
  const iconBg = copy.tone === 'danger' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400';

  return (
    <ModalShell
      onClose={onClose}
      header={
        <div className={`relative overflow-hidden border-b border-[var(--border)] pr-12`}>
          <div className={`absolute inset-0 bg-gradient-to-br ${accent}`} />
          <div className="relative flex items-start gap-3 px-5 py-5">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold">{copy.title}</h2>
              <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{serverName}</p>
            </div>
          </div>
        </div>
      }
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={copy.tone === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Sending…' : copy.confirm}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 p-5">
        <p className="text-sm leading-relaxed text-[var(--text)]">{copy.description}</p>
        {copy.tone === 'danger' && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-xs text-red-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>This action cannot be undone and may corrupt world data if the server is mid-write.</span>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
