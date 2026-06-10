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

export function EggVariablesEditor({
  eggId,
  variables,
  onSaved,
}: {
  eggId: string;
  variables: AdminEggVariable[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState<EggVariableInput[]>(variables);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm(variables);
    setSaved(false);
    setError('');
  }, [variables]);

  const hasChanges = useMemo(() => JSON.stringify(form) !== JSON.stringify(variables), [form, variables]);

  function resetForm() {
    setForm(variables);
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

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      if (form.some((v) => !v.name.trim() || !v.envVariable.trim())) {
        throw new Error('Each variable needs a name and environment variable');
      }
      await api.admin.updateEggVariables(
        eggId,
        form.map(({ id, ...rest }) => (id ? { id, ...rest } : rest)),
      );
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save variables');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      {form.length === 0 ? (
        <EmptyState title="No variables" description="Add environment variables for this egg." />
      ) : (
        <div className="space-y-3">
          {form.map((variable, index) => (
            <div
              key={variable.id ?? `new-${index}`}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/25 p-4"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Variable {index + 1}
                </p>
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                  aria-label="Remove variable"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
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

              <div className="mt-3">
                <Input
                  label="Description"
                  value={variable.description}
                  onChange={(e) => updateRow(index, { description: e.target.value })}
                  placeholder="Optional help text shown to users"
                />
              </div>

              <div className="mt-3">
                <Input
                  label="Validation rules"
                  value={variable.rules}
                  onChange={(e) => updateRow(index, { rules: e.target.value })}
                  placeholder="required|string|max:64"
                />
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Checkbox
                  checked={variable.userViewable}
                  onChange={(checked) => updateRow(index, { userViewable: checked, ...(checked ? {} : { userEditable: false }) })}
                  label="User can view"
                  description="Show on the server Startup tab"
                />
                <Checkbox
                  checked={variable.userEditable}
                  onChange={(checked) => updateRow(index, { userEditable: checked, ...(checked ? { userViewable: true } : {}) })}
                  label="User can edit"
                  description="Allow changes from the Startup tab"
                  disabled={!variable.userViewable}
                />
              </div>
            </div>
          ))}
        </div>
      )}

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

      <p className="text-[11px] text-[var(--muted)]">
        User view/edit flags control what server owners and subusers see on their Startup tab. Hidden variables are admin-only.
      </p>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>
      )}

      {(hasChanges || saved) && (
        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]/95 px-4 py-3 backdrop-blur-sm">
          <p className="text-xs">
            {saved && !hasChanges ? (
              <span className="text-green-400">Variables saved</span>
            ) : (
              <span className="text-[var(--muted)]">Unsaved variable changes</span>
            )}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" disabled={!hasChanges || saving} onClick={resetForm}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
            <Button type="submit" disabled={!hasChanges || saving}>
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Saving…' : 'Save variables'}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
