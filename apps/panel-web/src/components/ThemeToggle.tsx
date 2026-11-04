import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemePreference } from '../context/ThemeContext';

const OPTIONS: { value: ThemePreference; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
];

const CYCLE_ORDER: ThemePreference[] = ['light', 'dark', 'system'];

/** Segmented light / dark / system control for sidebar footers; cycle for dense navbars. */
export function ThemeToggle({
  compact = false,
  cycle = false,
}: {
  compact?: boolean;
  /** Single button that cycles Light → Dark → System (navbar-friendly). */
  cycle?: boolean;
}) {
  const { preference, setPreference } = useTheme();

  if (cycle) {
    const current = OPTIONS.find((opt) => opt.value === preference) ?? OPTIONS[2];
    const Icon = current.icon;
    const next = CYCLE_ORDER[(CYCLE_ORDER.indexOf(preference) + 1) % CYCLE_ORDER.length] ?? 'system';
    const nextLabel = OPTIONS.find((opt) => opt.value === next)?.label ?? 'System';

    return (
      <button
        type="button"
        onClick={() => setPreference(next)}
        className="theme-toggle-cycle"
        title={`Theme: ${current.label} (next: ${nextLabel})`}
        aria-label={`Theme ${current.label}. Switch to ${nextLabel}`}
      >
        <Icon className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-lg border p-0.5"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
      role="group"
      aria-label="Theme"
    >
      {OPTIONS.map(({ value, icon: Icon, label }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setPreference(value)}
            title={label}
            aria-pressed={active}
            className="flex items-center justify-center rounded-md transition-colors"
            style={{
              width: compact ? '1.75rem' : '2rem',
              height: compact ? '1.75rem' : '2rem',
              background: active ? 'var(--accent-muted)' : 'transparent',
              color: active ? 'var(--accent-hover)' : 'var(--muted)',
            }}
          >
            <Icon size={compact ? 14 : 15} />
          </button>
        );
      })}
    </div>
  );
}
