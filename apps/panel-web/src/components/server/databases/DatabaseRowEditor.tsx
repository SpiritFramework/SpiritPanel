import { useEffect, useMemo, useState } from 'react';
import { Trash2, X } from 'lucide-react';

type Column = {
  field: string;
  type: string;
  null: string;
  key: string;
  extra: string;
};

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function isAutoIncrement(col: Column) {
  return /auto_increment/i.test(col.extra);
}

function NiceCheck({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      className={`ds-srv-dbm-check${checked ? ' is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="ds-srv-dbm-check-box" aria-hidden>
        <svg viewBox="0 0 16 16" className="ds-srv-dbm-check-icon">
          <path
            d="M3.5 8.5 6.5 11.5 12.5 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>{label}</span>
    </button>
  );
}

export function DatabaseRowEditor({
  mode,
  columns,
  primaryKey,
  initialRow,
  busy,
  error,
  onClose,
  onSave,
  onDelete,
}: {
  mode: 'insert' | 'edit';
  columns: Column[];
  primaryKey: string[];
  initialRow?: Record<string, unknown> | null;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (values: Record<string, string | number | boolean | null>) => void;
  onDelete?: () => void;
}) {
  const editableColumns = useMemo(() => {
    if (mode === 'insert') {
      return columns.filter((c) => !isAutoIncrement(c));
    }
    return columns;
  }, [columns, mode]);

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [nullFields, setNullFields] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    const nextNull: Record<string, boolean> = {};
    for (const col of editableColumns) {
      const raw = initialRow?.[col.field];
      if (raw === null || raw === undefined) {
        next[col.field] = '';
        nextNull[col.field] = mode === 'edit' && raw === null;
      } else {
        next[col.field] = displayValue(raw);
        nextNull[col.field] = false;
      }
    }
    setDraft(next);
    setNullFields(nextNull);
  }, [editableColumns, initialRow, mode]);

  function buildValues(): Record<string, string | number | boolean | null> {
    const out: Record<string, string | number | boolean | null> = {};
    for (const col of editableColumns) {
      if (nullFields[col.field]) {
        out[col.field] = null;
        continue;
      }
      const text = draft[col.field] ?? '';
      if (mode === 'insert' && text === '' && col.null === 'YES') {
        out[col.field] = null;
        continue;
      }
      out[col.field] = text;
    }
    return out;
  }

  return (
    <div className="ds-srv-dbm-editor-overlay" role="dialog" aria-modal="true" aria-label={mode === 'insert' ? 'Insert row' : 'Edit row'}>
      <div className="ds-srv-dbm-editor">
        <header className="ds-srv-dbm-editor-header">
          <div>
            <h3>{mode === 'insert' ? 'Insert row' : 'Edit row'}</h3>
            <p>{mode === 'insert' ? 'Add a new row to this table.' : 'Update values for this row.'}</p>
          </div>
          <button type="button" className="ds-srv-dbm-icon-btn" onClick={onClose} aria-label="Close editor">
            <X className="h-4 w-4" />
          </button>
        </header>

        {error ? <div className="ds-srv-dbm-error">{error}</div> : null}

        <div className="ds-srv-dbm-editor-body">
          {editableColumns.map((col) => {
            const isPk = primaryKey.includes(col.field);
            const lockedPk = mode === 'edit' && isPk;
            const isNull = Boolean(nullFields[col.field]);
            return (
              <div key={col.field} className={`ds-srv-dbm-editor-field${isNull ? ' is-null' : ''}`}>
                <div className="ds-srv-dbm-editor-label">
                  <span className="ds-srv-dbm-editor-field-name">{col.field}</span>
                  {isPk ? <span className="ds-srv-dbm-key-pill is-pri">PRI</span> : null}
                  <code>{col.type}</code>
                </div>
                <div className="ds-srv-dbm-editor-controls">
                  <input
                    className="ds-srv-dbm-editor-input"
                    value={isNull ? '' : (draft[col.field] ?? '')}
                    disabled={busy || lockedPk || isNull}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [col.field]: e.target.value }))}
                    placeholder={col.null === 'YES' ? 'Enter value…' : 'Required'}
                  />
                  {col.null === 'YES' && !lockedPk ? (
                    <NiceCheck
                      checked={isNull}
                      disabled={busy}
                      label="NULL"
                      onChange={(checked) => setNullFields((prev) => ({ ...prev, [col.field]: checked }))}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <footer className="ds-srv-dbm-editor-footer">
          {mode === 'edit' && onDelete ? (
            <button type="button" className="ds-srv-dbm-editor-danger" disabled={busy} onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete row
            </button>
          ) : (
            <span />
          )}
          <div className="ds-srv-dbm-editor-actions">
            <button type="button" className="ds-srv-dbm-text-btn" disabled={busy} onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="ds-srv-dbm-run"
              disabled={busy}
              onClick={() => onSave(buildValues())}
            >
              {busy ? 'Saving…' : mode === 'insert' ? 'Insert' : 'Save changes'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export function rowPrimaryKey(
  row: Record<string, unknown>,
  primaryKey: string[],
): Record<string, string | number | boolean | null> | null {
  if (!primaryKey.length) return null;
  const out: Record<string, string | number | boolean | null> = {};
  for (const key of primaryKey) {
    const value = row[key];
    if (value === undefined) return null;
    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
    } else {
      out[key] = String(value);
    }
  }
  return out;
}
