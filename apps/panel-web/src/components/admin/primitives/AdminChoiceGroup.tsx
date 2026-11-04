export function AdminChoiceGroup({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  return (
    <div className="ds-adm-choice ds-nd-st-choice">
      <span className="ds-adm-choice-label ds-nd-st-choice-label">{label}</span>
      <div className="ds-adm-choice-options ds-nd-st-choice-options" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`ds-adm-choice-opt ds-nd-st-choice-opt${value === option.value ? ' ds-adm-choice-opt--on ds-nd-st-choice-opt--on' : ''}`}
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
          >
            {option.label}
          </button>
        ))}
      </div>
      {hint ? <p className="ds-adm-choice-hint ds-nd-st-choice-hint">{hint}</p> : null}
    </div>
  );
}
