import type { LucideIcon } from 'lucide-react';

export function RoleOption({
  active,
  icon: Icon,
  title,
  description,
  onClick,
  disabled,
}: {
  active: boolean;
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? 'border-[var(--accent)] bg-[var(--accent-muted)] ring-1 ring-[var(--accent)]/30'
          : 'border-[var(--border)] bg-[var(--bg-elevated)]/50 hover:border-[var(--accent)]/35 hover:bg-[var(--surface-hover)]'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            active ? 'accent-bg text-white' : 'bg-[var(--surface)] text-[var(--muted)]'
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className={`block text-sm font-semibold ${active ? 'accent-text' : ''}`}>{title}</span>
          <span className="mt-0.5 block text-[11px] leading-snug text-[var(--muted)]">{description}</span>
        </span>
      </div>
    </button>
  );
}
