import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useServer } from '../context/ServerContext';
import { useServerRouteId } from './useServerRouteId';
import { getServerAccess } from '../lib/server-access';
import {
  buildStartupEnvironment,
  dockerImageOptions,
  extractStartupPlaceholders,
  substituteStartup,
} from '../lib/startup';
import {
  matchesVariableFilter,
  matchesVariableSearch,
  type VariableFilter,
} from '../lib/startup-utils';

export function useServerStartup() {
  const id = useServerRouteId();
  const { server, refresh } = useServer();
  const access = getServerAccess(server);
  const canUpdate = access.canUpdateStartup;

  const variables = server.variables ?? [];
  const editableVariables = useMemo(
    () => variables.filter((v) => v.eggVariable.userEditable),
    [variables],
  );
  const readOnlyVariables = useMemo(
    () => variables.filter((v) => !v.eggVariable.userEditable),
    [variables],
  );
  const imageOptions = useMemo(
    () => dockerImageOptions(server.egg.dockerImages),
    [server.egg.dockerImages],
  );

  const [startup, setStartup] = useState(server.startup);
  const [image, setImage] = useState(server.image ?? '');
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<VariableFilter>('all');

  useEffect(() => {
    setStartup(server.startup);
    setImage(server.image ?? '');
    setValues({});
    setSaved(false);
  }, [server.startup, server.image, server.variables]);

  const currentValues = useMemo(
    () => Object.fromEntries(variables.map((v) => [v.id, values[v.id] ?? v.variableValue])),
    [variables, values],
  );

  const previewVariables = useMemo(
    () =>
      variables.map((v) => ({
        eggVariable: { envVariable: v.eggVariable.envVariable },
        variableValue: currentValues[v.id] ?? '',
      })),
    [variables, currentValues],
  );

  const previewEnv = useMemo(
    () =>
      buildStartupEnvironment(previewVariables, {
        memory: server.memory,
        defaultAllocation: server.defaultAllocation,
      }),
    [previewVariables, server.memory, server.defaultAllocation],
  );

  const resolvedStartup = substituteStartup(startup, previewEnv);
  const placeholders = extractStartupPlaceholders(startup);

  const startupChanged = startup !== server.startup;
  const imageChanged = image !== (server.image ?? '');
  const variablesChanged = editableVariables.some(
    (v) => (currentValues[v.id] ?? '') !== v.variableValue,
  );
  const hasChanges = startupChanged || imageChanged || variablesChanged;

  const filteredVariables = useMemo(
    () => variables.filter((v) => matchesVariableFilter(v, filter) && matchesVariableSearch(v, search)),
    [variables, filter, search],
  );

  const filteredEditable = useMemo(
    () => filteredVariables.filter((v) => v.eggVariable.userEditable),
    [filteredVariables],
  );

  const filteredReadOnly = useMemo(
    () => filteredVariables.filter((v) => !v.eggVariable.userEditable),
    [filteredVariables],
  );

  const hasActiveFilters = filter !== 'all' || Boolean(search.trim());

  function setVariableValue(variableId: string, value: string) {
    setValues((prev) => ({ ...prev, [variableId]: value }));
    setSaved(false);
  }

  function updateStartup(value: string) {
    setStartup(value);
    setSaved(false);
  }

  function updateImage(value: string) {
    setImage(value);
    setSaved(false);
  }

  async function saveAll() {
    if (!id || !canUpdate || !hasChanges) return;
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      await api.client.updateStartup(id, {
        ...(startupChanged ? { startup } : {}),
        ...(imageChanged && image ? { image } : {}),
        ...(variablesChanged
          ? {
              variables: editableVariables.map((v) => ({
                id: v.id,
                value: currentValues[v.id] ?? '',
              })),
            }
          : {}),
      });
      await refresh();
      setValues({});
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save startup configuration');
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setStartup(server.startup);
    setImage(server.image ?? '');
    setValues({});
    setSaved(false);
    setError('');
  }

  async function reload() {
    setError('');
    try {
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh startup settings');
    }
  }

  return {
    server,
    access,
    canUpdate,
    variables,
    editableVariables,
    readOnlyVariables,
    imageOptions,
    startup,
    image,
    currentValues,
    resolvedStartup,
    placeholders,
    hasChanges,
    saving,
    saved,
    error,
    search,
    setSearch,
    filter,
    setFilter,
    filteredVariables,
    filteredEditable,
    filteredReadOnly,
    hasActiveFilters,
    updateStartup,
    updateImage,
    setVariableValue,
    saveAll,
    resetForm,
    reload,
  };
}
