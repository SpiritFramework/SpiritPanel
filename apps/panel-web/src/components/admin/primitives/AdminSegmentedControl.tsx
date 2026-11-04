import type { ReactNode } from 'react';

export type AdminSegmentOption = {
  id: string;
  label: ReactNode;
};

export function AdminSegmentedControl({
  options,
  value,
  onChange,
  label,
}: {
  options: AdminSegmentOption[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  return (
    <div className="ds-adm-segment ds-nd-list-view" role="group" aria-label={label}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          className={`ds-adm-segment-btn ds-nd-list-view-btn${value === opt.id ? ' ds-adm-segment-btn--active ds-nd-list-view-btn--active' : ''}`}
          onClick={() => onChange(opt.id)}
          aria-pressed={value === opt.id}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
