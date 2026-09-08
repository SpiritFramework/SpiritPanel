import { Container, Terminal } from 'lucide-react';
import { fieldInputClass, Select } from '../../Layout';

export function StartupCommandPanel({
  startup,
  placeholders,
  image,
  imageOptions,
  canUpdate,
  onStartupChange,
  onImageChange,
}: {
  startup: string;
  placeholders: string[];
  image: string;
  imageOptions: Array<{ label: string; value: string }>;
  canUpdate: boolean;
  onStartupChange: (value: string) => void;
  onImageChange: (value: string) => void;
}) {
  return (
    <section className="ds-srv-stu-command">
      <div className="ds-srv-stu-command-header">
        <Terminal className="h-4 w-4" aria-hidden />
        <div>
          <h3 className="ds-srv-stu-command-title">Startup command</h3>
          <p className="ds-srv-stu-command-meta">Use {'{{VARIABLE}}'} placeholders from the environment below</p>
        </div>
      </div>

      <div className="ds-srv-stu-command-body">
        <label className="ds-srv-stu-field">
          <span className="ds-srv-stu-field-label">Command template</span>
          <textarea
            value={startup}
            onChange={(e) => onStartupChange(e.target.value)}
            readOnly={!canUpdate}
            disabled={!canUpdate}
            spellCheck={false}
            rows={6}
            className="ds-srv-stu-textarea ds-srv-stu-textarea--command"
            placeholder="java -Xms128M -jar {{SERVER_JARFILE}}"
          />
        </label>

        {placeholders.length > 0 ? (
          <div className="ds-srv-stu-placeholders">
            {placeholders.map((key) => (
              <span key={key} className="ds-srv-stu-placeholder-chip">
                {'{{'}
                {key}
                {'}}'}
              </span>
            ))}
          </div>
        ) : null}

        {imageOptions.length > 0 ? (
          imageOptions.length === 1 ? (
            <label className="ds-srv-stu-field">
              <span className="ds-srv-stu-field-label">Docker image</span>
              <div className={`${fieldInputClass} ds-srv-stu-image-readonly`} aria-readonly>
                <Container className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                <span>{imageOptions[0].value}</span>
              </div>
            </label>
          ) : (
            <Select
              label="Docker image"
              value={image}
              onChange={(e) => onImageChange(e.target.value)}
              disabled={!canUpdate}
            >
              {imageOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — {opt.value}
                </option>
              ))}
            </Select>
          )
        ) : null}
      </div>
    </section>
  );
}
