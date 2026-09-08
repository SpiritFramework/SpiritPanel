import { Check } from 'lucide-react';

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled,
  size = 'default',
  descriptionMono,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  size?: 'default' | 'comfortable';
  descriptionMono?: boolean;
}) {
  const comfortable = size === 'comfortable';

  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border transition ${
        comfortable ? 'p-3' : 'gap-2 rounded-md p-2'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${
        checked
          ? 'border-[var(--accent)] bg-[var(--accent-muted)]'
          : 'border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]'
      }`}
    >
      <span className="relative flex shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={`flex items-center justify-center rounded-[0.3rem] border transition ${
            comfortable ? 'h-[1.125rem] w-[1.125rem]' : 'h-4 w-4'
          } ${checked ? 'border-[var(--accent)] bg-[var(--accent)] shadow-sm' : 'border-[var(--border)] bg-[var(--bg)]'}`}
          aria-hidden
        >
          <Check
            className={`text-white transition ${comfortable ? 'h-3 w-3' : 'h-2.5 w-2.5'} ${
              checked ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
            }`}
            strokeWidth={3}
          />
        </span>
      </span>
      <span className="min-w-0 flex-1 pt-px">
        <span className={`block font-medium leading-snug text-[var(--text)] ${comfortable ? 'text-sm' : 'text-xs'}`}>
          {label}
        </span>
        {description ? (
          <span
            className={`mt-0.5 block leading-relaxed text-[var(--muted)] ${
              descriptionMono ? 'break-all font-mono text-[11px]' : comfortable ? 'text-xs' : 'text-[11px]'
            }`}
          >
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
