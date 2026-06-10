import { Check } from 'lucide-react';

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 transition ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      } ${
        checked
          ? 'border-[var(--accent)] bg-[var(--accent-muted)]'
          : 'border-[var(--border)] bg-[var(--bg-elevated)] hover:bg-[var(--surface-hover)]'
      }`}
    >
      <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={`flex h-4 w-4 items-center justify-center rounded border transition ${
            checked ? 'border-[var(--accent)] accent-bg' : 'border-[var(--border)] bg-[var(--bg)]'
          }`}
        >
          <Check
            className={`h-3 w-3 text-white transition ${checked ? 'opacity-100' : 'opacity-0'}`}
            strokeWidth={3}
          />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium leading-tight">{label}</span>
        {description && <span className="mt-0.5 block text-[11px] text-[var(--muted)]">{description}</span>}
      </span>
    </label>
  );
}
