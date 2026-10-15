import { useEffect, useMemo, useState } from 'react';
import { Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { api, type AdminEggVariable, type EggVariableInput } from '../lib/api';
import { Button, Input } from './Layout';
import { Checkbox } from './Checkbox';
import { EmptyState } from './ui';

function emptyVariable(): EggVariableInput {
  return {
    name: '',
    description: '',
    envVariable: '',
    defaultValue: '',
    userViewable: true,
    userEditable: true,
    rules: '',
    fieldType: 'text',
  };
}

function toFormRows(variables: AdminEggVariable[]): EggVariableInput[] {
  return variables.map((v) => ({
    id: v.id,
    name: v.name,
    description: v.description,
    envVariable: v.envVariable,
    defaultValue: v.defaultValue,
    userViewable: v.userViewable,
    userEditable: v.userEditable,
    rules: v.rules,
    fieldType: v.fieldType,
  }));
}

export function EggVariablesEditor({
  eggId,
  variables,
  onSaved,
}: {
  eggId: string;
  variables: AdminEggVariable[];
  onSaved: (variables: AdminEggVariable[]) => void;
}) {
  const [form, setForm] = useState<EggVariableInput[]>(() => toFormRows(variables));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm(toFormRows(variables));
    setError('');
  }, [variables]);

  const hasChanges = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(toFormRows(variables)),
    [form, variables],
  );

  function resetForm() {
    setForm(toFormRows(variables));
    setError('');
    setSaved(false);
  }

  function updateRow(index: number, patch: Partial<EggVariableInput>) {
    setForm((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setSaved(false);
  }

  function removeRow(index: number) {
    setForm((rows) => rows.filter((_, i) => i !== index));
    setSaved(false);
  }

  async function save() {
    if (saving || !hasChanges) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      if (form.some((v) => !v.name.trim() || !v.envVariable.trim())) {
        throw new Error('Each variable needs a name and environment variable');
      }
      const savedVariables = await api.admin.updateEggVariables(
        eggId,
        form.map(({ id, ...rest }) => (id ? { id, ...rest } : rest)),
      );
      setSaved(true);
      onSaved(savedVariables);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save variables');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ds-egg-vars-editor">
      {form.length === 0 ? (
        <EmptyState title="No variables" description="Add environment variables for this egg." />
      ) : (
        <div className="ds-egg-vars-list">
          {form.map((variable, index) => (
            <article key={variable.id ?? `new-${index}`} className="ds-egg-var-card">
              <header className="ds-egg-var-card-head">
                <div className="min-w-0">
                  <p className="ds-egg-var-card-index">Variable {index + 1}</p>
                  <p className="ds-egg-var-card-env truncate font-mono">
                    {variable.envVariable || 'ENV_VARIABLE'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="ds-egg-var-remove"
                  aria-label="Remove variable"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </header>

              <div className="ds-egg-var-grid">
                <Input
                  label="Name"
                  value={variable.name}
                  onChange={(e) => updateRow(index, { name: e.target.value })}
                  required
                  placeholder="Server JAR File"
                />
                <Input
                  label="Environment variable"
                  value={variable.envVariable}
                  onChange={(e) => updateRow(index, { envVariable: e.target.value.toUpperCase() })}
                  required
                  placeholder="SERVER_JARFILE"
                  className="font-mono"
                />
                <Input
                  label="Default value"
                  value={variable.defaultValue}
                  onChange={(e) => updateRow(index, { defaultValue: e.target.value })}
                  placeholder="server.jar"
                />
                <Input
                  label="Field type"
                  value={variable.fieldType}
                  onChange={(e) => updateRow(index, { fieldType: e.target.value })}
                  placeholder="text"
                />
              </div>

              <div className="ds-egg-var-stack">
                <Input
                  label="Description"
                  value={variable.description}
                  onChange={(e) => updateRow(index, { description: e.target.value })}
                  placeholder="Optional help text shown to users"
                />
                <Input
                  label="Validation rules"
                  value={variable.rules}
                  onChange={(e) => updateRow(index, { rules: e.target.value })}
                  placeholder="required|string|max:64"
                />
              </div>

              <div className="ds-egg-var-flags">
                <Checkbox
                  checked={variable.userViewable}
                  onChange={(checked) =>
                    updateRow(index, {
                      userViewable: checked,
                      ...(checked ? {} : { userEditable: false }),
                    })
                  }
                  label="User can view"
                  description="Show on the server Startup tab"
                />
                <Checkbox
                  checked={variable.userEditable}
                  onChange={(checked) =>
                    updateRow(index, {
                      userEditable: checked,
                      ...(checked ? { userViewable: true } : {}),
                    })
                  }
                  label="User can edit"
                  description="Allow changes from the Startup tab"
                  disabled={!variable.userViewable}
                />
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="ds-egg-vars-toolbar">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setForm((rows) => [...rows, emptyVariable()]);
            setSaved(false);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add variable
        </Button>
        <p className="ds-egg-vars-hint">
          View/edit flags control the server Startup tab. Hidden variables stay admin-only.
        </p>
      </div>

      {error ? <div className="ds-egg-form-error">{error}</div> : null}

      <div
        className={`ds-nd-st-savebar${hasChanges ? ' ds-nd-st-savebar--dirty' : ''}${saved && !hasChanges ? ' ds-nd-st-savebar--saved' : ''}`}
        role="status"
        aria-live="polite"
      >
        <div className="ds-nd-st-savebar-status">
          {error && hasChanges ? (
            <span className="ds-nd-st-savebar-msg ds-nd-st-savebar-msg--error">{error}</span>
          ) : saved && !hasChanges ? (
            <span className="ds-nd-st-savebar-msg ds-nd-st-savebar-msg--success">Variables saved</span>
          ) : hasChanges ? (
            <span className="ds-nd-st-savebar-msg">
              <span className="ds-nd-st-savebar-dot" aria-hidden />
              Unsaved variable changes
            </span>
          ) : (
            <span className="ds-nd-st-savebar-msg ds-nd-st-savebar-msg--idle">All variables saved</span>
          )}
        </div>
        <div className="ds-nd-st-savebar-actions">
          <Button type="button" variant="ghost" disabled={!hasChanges || saving} onClick={resetForm}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
          <Button type="button" disabled={!hasChanges || saving} onClick={() => void save()}>
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving…' : 'Save variables'}
          </Button>
        </div>
      </div>
    </div>
  );
}
