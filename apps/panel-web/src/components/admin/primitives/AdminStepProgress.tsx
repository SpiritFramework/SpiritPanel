import { CheckCircle2, Circle } from 'lucide-react';

export type AdminStep = {
  id: string;
  label: string;
  done: boolean;
};

export function AdminStepProgress({
  steps,
  label = 'Setup progress',
}: {
  steps: AdminStep[];
  label?: string;
}) {
  const done = steps.filter((s) => s.done).length;
  const total = steps.length || 1;

  return (
    <nav className="ds-adm-steps ds-nd-create-progress" aria-label={label}>
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={`ds-adm-steps-step ds-nd-create-progress-step${step.done ? ' ds-adm-steps-step--done ds-nd-create-progress-step--done' : ''}`}
        >
          <span className="ds-adm-steps-mark ds-nd-create-progress-mark" aria-hidden>
            {step.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
          </span>
          <span className="ds-adm-steps-label ds-nd-create-progress-label">
            <span className="ds-adm-steps-index ds-nd-create-progress-index">{index + 1}</span>
            {step.label}
          </span>
        </div>
      ))}
      <div className="ds-adm-steps-bar ds-nd-create-progress-bar" aria-hidden>
        <div
          className="ds-adm-steps-fill ds-nd-create-progress-fill"
          style={{ width: `${(done / total) * 100}%` }}
        />
      </div>
    </nav>
  );
}
