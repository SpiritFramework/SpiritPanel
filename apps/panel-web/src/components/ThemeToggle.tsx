import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemePreference } from '../context/ThemeContext';

const OPTIONS: { value: ThemePreference; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
];

/** Segmented light / dark / system control for sidebar footers. */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { preference, setPreference } = useTheme();

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
