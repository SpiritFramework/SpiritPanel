export type AdminFilterChip = {
  id: string;
  label: string;
  count?: number;
  alert?: boolean;
};

export function AdminFilterChips({
  options,
  value,
  onChange,
  label = 'Filters',
}: {
  options: AdminFilterChip[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  return (
    <div className="ds-adm-chips ds-nd-list-filters" role="tablist" aria-label={label}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={value === opt.id}
          className={`ds-adm-chip ds-nd-list-filter${value === opt.id ? ' ds-adm-chip--active ds-nd-list-filter--active' : ''}${
            opt.alert && value !== opt.id ? ' ds-adm-chip--alert ds-nd-list-filter--alert' : ''
          }`}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
          {opt.count != null ? (
            <span className="ds-adm-chip-count ds-nd-list-filter-count">{opt.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
