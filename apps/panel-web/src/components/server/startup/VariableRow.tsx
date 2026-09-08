import { fieldInputClass, fieldTextareaClass } from '../../Layout';
import type { ServerVariable } from '../../../lib/startup-utils';

export function VariableRow({
  variable,
  value,
  readOnly,
  onChange,
}: {
  variable: ServerVariable;
  value: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}) {
  const multiline = variable.eggVariable.fieldType === 'textarea';
  const locked = readOnly || !variable.eggVariable.userEditable;

  return (
    <div className="ds-srv-stu-var">
      <div className="ds-srv-stu-var-head">
        <div className="min-w-0">
          <p className="ds-srv-stu-var-name">{variable.eggVariable.name}</p>
          <code className="ds-srv-stu-var-env">{variable.eggVariable.envVariable}</code>
        </div>
        {locked ? <span className="ds-srv-stu-var-lock">Locked</span> : null}
      </div>

      {multiline ? (
        <textarea
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          readOnly={locked}
          disabled={locked}
          rows={3}
          className={fieldTextareaClass}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          readOnly={locked}
          disabled={locked}
          className={fieldInputClass}
        />
      )}

      {variable.eggVariable.description ? (
        <p className="ds-srv-stu-var-hint">{variable.eggVariable.description}</p>
      ) : null}
    </div>
  );
}
