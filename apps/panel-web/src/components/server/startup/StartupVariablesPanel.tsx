import { Search, Variable } from 'lucide-react';
import { EmptyState } from '../../ui';
import type { ServerVariable, VariableFilter } from '../../../lib/startup-utils';
import { VariableRow } from './VariableRow';

const FILTER_OPTIONS: { id: VariableFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'editable', label: 'Editable' },
  { id: 'locked', label: 'Locked' },
];

export function StartupVariablesPanel({
  variables,
  filteredEditable,
  filteredReadOnly,
  filteredCount,
  search,
  filter,
  hasActiveFilters,
  canUpdate,
  currentValues,
  onSearchChange,
  onFilterChange,
  onVariableChange,
}: {
  variables: ServerVariable[];
  filteredEditable: ServerVariable[];
  filteredReadOnly: ServerVariable[];
  filteredCount: number;
  search: string;
  filter: VariableFilter;
  hasActiveFilters: boolean;
  canUpdate: boolean;
  currentValues: Record<string, string>;
  onSearchChange: (value: string) => void;
  onFilterChange: (filter: VariableFilter) => void;
  onVariableChange: (id: string, value: string) => void;
}) {
  return (
    <section className="ds-srv-stu-panel">
      <div className="ds-srv-stu-panel-head">
        <Variable className="h-4 w-4" aria-hidden />
        <div>
          <h3 className="ds-srv-stu-panel-title">Environment variables</h3>
          <p className="ds-srv-stu-panel-meta">Substituted into the startup command when the server starts</p>
        </div>
      </div>

      {variables.length > 0 ? (
        <div className="ds-srv-stu-panel-toolbar">
          <div className="ds-srv-stu-search-wrap">
            <Search className="ds-srv-stu-search-icon" aria-hidden />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search variables…"
              className="ds-srv-stu-search"
            />
          </div>
          <div className="ds-srv-stu-filters" role="group" aria-label="Filter variables">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`ds-srv-stu-filter-btn${filter === opt.id ? ' ds-srv-stu-filter-btn--active' : ''}`}
                aria-pressed={filter === opt.id}
                onClick={() => onFilterChange(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="ds-srv-stu-panel-body">
        {variables.length === 0 ? (
          <div className="ds-srv-stu-empty-wrap">
            <EmptyState
              icon={<Variable className="h-5 w-5" />}
              title="No variables"
              description="This egg does not expose any configurable environment variables."
            />
          </div>
        ) : filteredCount === 0 ? (
          <div className="ds-srv-stu-empty-wrap">
            <EmptyState title="No matching variables" description="Try a different search or filter." />
          </div>
        ) : (
          <>
            {filteredEditable.length > 0 ? (
              <section className="ds-srv-stu-var-group">
                <header className="ds-srv-stu-var-group-head">
                  <h4>Editable</h4>
                  <span>{filteredEditable.length}</span>
                </header>
                <div className="ds-srv-stu-var-grid">
                  {filteredEditable.map((v) => (
                    <VariableRow
                      key={v.id}
                      variable={v}
                      value={currentValues[v.id] ?? ''}
                      readOnly={!canUpdate}
                      onChange={(value) => onVariableChange(v.id, value)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {filteredReadOnly.length > 0 ? (
              <section className="ds-srv-stu-var-group">
                <header className="ds-srv-stu-var-group-head">
                  <h4>Read-only</h4>
                  <span>{filteredReadOnly.length}</span>
                </header>
                <div className="ds-srv-stu-var-grid">
                  {filteredReadOnly.map((v) => (
                    <VariableRow key={v.id} variable={v} value={currentValues[v.id] ?? ''} readOnly />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>

      {variables.length > 0 ? (
        <footer className="ds-srv-stu-panel-footer">
          {hasActiveFilters
            ? `${filteredCount} of ${variables.length} variable${variables.length === 1 ? '' : 's'}`
            : `${variables.length} variable${variables.length === 1 ? '' : 's'}`}
        </footer>
      ) : null}
    </section>
  );
}
