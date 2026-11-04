import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type AdminFilterChip = {
  id: string;
  label: string;
  count?: number;
  alert?: boolean;
  icon?: LucideIcon;
  tone?: string;
  hint?: string;
};

export function AdminFilterChips({
  options,
  value,
  onChange,
  label = 'Filters',
  className,
  leading,
}: {
  options: AdminFilterChip[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  className?: string;
  leading?: ReactNode;
}) {
  return (
    <div
      className={`ds-adm-chips ds-nd-list-filters${className ? ` ${className}` : ''}`}
      role="tablist"
      aria-label={label}
    >
      {leading ? <div className="ds-adm-chips-leading">{leading}</div> : null}
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.id;
        const toneClass = opt.tone ? ` ds-adm-chip--${opt.tone} ds-nd-list-filter--${opt.tone}` : '';
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            title={opt.hint ?? opt.label}
            className={`ds-adm-chip ds-nd-list-filter${active ? ' ds-adm-chip--active ds-nd-list-filter--active' : ''}${
              opt.alert && !active ? ' ds-adm-chip--alert ds-nd-list-filter--alert' : ''
            }${toneClass}`}
            onClick={() => onChange(opt.id)}
          >
            {Icon ? (
              <span className="ds-adm-chip-icon" aria-hidden>
                <Icon className="h-3.5 w-3.5" />
              </span>
            ) : null}
            <span className="ds-adm-chip-label">{opt.label}</span>
            {opt.count != null ? (
              <span className="ds-adm-chip-count ds-nd-list-filter-count">{opt.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
