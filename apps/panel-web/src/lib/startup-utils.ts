import type { ServerDetail } from './api';

export type VariableFilter = 'all' | 'editable' | 'locked';

export type ServerVariable = ServerDetail['variables'][number];

export function matchesVariableSearch(variable: ServerVariable, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    variable.eggVariable.name,
    variable.eggVariable.envVariable,
    variable.eggVariable.description,
    variable.variableValue,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function matchesVariableFilter(variable: ServerVariable, filter: VariableFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'editable') return variable.eggVariable.userEditable;
  return !variable.eggVariable.userEditable;
}
