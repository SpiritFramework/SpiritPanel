import { useEffect, useState, type ReactNode } from 'react';
import {
  Check,
  Cpu,
  HardDrive,
  MemoryStick,
  Play,
  RotateCcw,
  Save,
  Settings2,
  Terminal,
  Variable,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useServer } from '../../context/ServerContext';
import { useServerRouteId } from '../../hooks/useServerRouteId';
import { getServerAccess } from '../../lib/server-access';
import {
  buildStartupEnvironment,
  dockerImageOptions,
  extractStartupPlaceholders,
  substituteStartup,
} from '../../lib/startup';
import {
  Button,
  fieldInputClass,
  fieldTextareaClass,
  Select,
} from '../../components/Layout';
import { EmptyState, StatCard } from '../../components/ui';
import {
  ServerErrorBanner,
  ServerNotice,
  ServerPage,
  ServerPageHeader,
  ServerPanel,
  ServerToolbarButton,
} from '../../components/server/ServerPage';

export function ServerStartupPage() {
  const id = useServerRouteId();
  const { server, refresh } = useServer();
  const access = getServerAccess(server);
  const canUpdate = access.canUpdateStartup;

  const variables = server.variables ?? [];
  const editableVariables = variables.filter((v) => v.eggVariable.userEditable);
  const readOnlyVariables = variables.filter((v) => !v.eggVariable.userEditable);
  const imageOptions = dockerImageOptions(server.egg.dockerImages);

  const [startup, setStartup] = useState(server.startup);
  const [image, setImage] = useState(server.image ?? '');
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setStartup(server.startup);
    setImage(server.image ?? '');
    setValues({});
    setSaved(false);
  }, [server.startup, server.image, server.variables]);

  const currentValues = Object.fromEntries(
    variables.map((v) => [v.id, values[v.id] ?? v.variableValue]),
  );

  const previewVariables = variables.map((v) => ({
    eggVariable: { envVariable: v.eggVariable.envVariable },
    variableValue: currentValues[v.id] ?? '',
  }));

  const previewEnv = buildStartupEnvironment(previewVariables, {
    memory: server.memory,
    defaultAllocation: server.defaultAllocation,
  });

  const resolvedStartup = substituteStartup(startup, previewEnv);
  const placeholders = extractStartupPlaceholders(startup);

  const startupChanged = startup !== server.startup;
  const imageChanged = image !== (server.image ?? '');
  const variablesChanged = editableVariables.some(
    (v) => (currentValues[v.id] ?? '') !== v.variableValue,
  );
  const hasChanges = startupChanged || imageChanged || variablesChanged;

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

  return (
    <ServerPage>
      <ServerPageHeader
        title="Startup"
        description={`Configure how ${server.egg.name} starts — command, docker image, and environment variables`}
        actions={
          canUpdate ? (
            <>
              <ServerToolbarButton
                icon={RotateCcw}
                label="Reset"
                onClick={resetForm}
                disabled={!hasChanges || saving}
              />
              <Button onClick={saveAll} disabled={saving || !hasChanges}>
                {saving ? (
                  'Saving…'
                ) : saved && !hasChanges ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Save changes
                  </>
                )}
              </Button>
            </>
          ) : undefined
        }
      />

      {!canUpdate && (
        <ServerNotice tone="muted">You can view startup settings but do not have permission to change them.</ServerNotice>
      )}

      <ServerErrorBanner message={error} />

      <div className="grid gap-4 xl:grid-cols-2 xl:items-stretch">
        <ServerPanel
          icon={Terminal}
          title="Startup command"
          description={'Use {{VARIABLE}} placeholders from the environment below'}
          className="startup-panel flex h-full flex-col"
          bodyClassName="flex flex-1 flex-col gap-4"
        >
          <label className="block flex flex-1 flex-col gap-1.5">
            <span className="text-[11px] font-medium text-[var(--muted)]">Command template</span>
            <textarea
              value={startup}
              onChange={(e) => {
                setStartup(e.target.value);
                setSaved(false);
              }}
              readOnly={!canUpdate}
              disabled={!canUpdate}
              spellCheck={false}
              rows={6}
              className="field-code field-code--command flex-1"
              placeholder="java -Xms128M -jar {{SERVER_JARFILE}}"
            />
          </label>

          {placeholders.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {placeholders.map((key) => (
                <span
                  key={key}
                  className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-0.5 font-mono text-[10px] text-[var(--muted)]"
                >
                  {'{{'}
                  {key}
                  {'}}'}
                </span>
              ))}
            </div>
          )}

          {imageOptions.length > 0 &&
            (imageOptions.length === 1 ? (
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[var(--muted)]">Docker image</span>
                <div
                  className={`${fieldInputClass} font-mono text-[11px] text-[var(--muted)]`}
                  aria-readonly
                >
                  {imageOptions[0].value}
                </div>
              </label>
            ) : (
              <Select
                label="Docker image"
                value={image}
                onChange={(e) => {
                  setImage(e.target.value);
                  setSaved(false);
                }}
                disabled={!canUpdate}
              >
                {imageOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} — {opt.value}
                  </option>
                ))}
              </Select>
            ))}
        </ServerPanel>

        <ServerPanel
          icon={Play}
          iconTone="cyan"
          title="Resolved command"
          description="Preview with current variable values — actual start may differ after sync"
          className="startup-panel flex h-full flex-col"
          bodyClassName="flex flex-1 flex-col"
        >
          <pre className="field-code field-code--preview flex-1">{resolvedStartup || '—'}</pre>
        </ServerPanel>
      </div>

      <ServerPanel
        icon={Variable}
        title="Environment variables"
        description="Values substituted into the startup command when the server starts"
        className="startup-panel"
        noPadding
        bodyClassName="p-0"
      >
        {variables.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No variables"
              description="This egg does not expose any configurable environment variables."
            />
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]/50">
            {editableVariables.length > 0 && (
              <VariableGroup title="Editable" count={editableVariables.length}>
                {editableVariables.map((v) => (
                  <VariableField
                    key={v.id}
                    label={v.eggVariable.name}
                    env={v.eggVariable.envVariable}
                    description={v.eggVariable.description}
                    fieldType={v.eggVariable.fieldType}
                    value={currentValues[v.id]}
                    onChange={(value) => {
                      setValues((prev) => ({ ...prev, [v.id]: value }));
                      setSaved(false);
                    }}
                    readOnly={!canUpdate}
                  />
                ))}
              </VariableGroup>
            )}

            {readOnlyVariables.length > 0 && (
              <VariableGroup title="Read-only" count={readOnlyVariables.length}>
                {readOnlyVariables.map((v) => (
                  <VariableField
                    key={v.id}
                    label={v.eggVariable.name}
                    env={v.eggVariable.envVariable}
                    description={v.eggVariable.description}
                    fieldType={v.eggVariable.fieldType}
                    value={currentValues[v.id]}
                    readOnly
                  />
                ))}
              </VariableGroup>
            )}
          </div>
        )}
      </ServerPanel>

      <ServerPanel
        icon={Settings2}
        title="Resource limits"
        description="Applied at container start — edit under Settings if you need to change these"
        bodyClassName="grid gap-3 sm:grid-cols-3"
      >
        <StatCard label="Memory" value={`${server.memory} MiB`} icon={<MemoryStick className="h-3.5 w-3.5" />} />
        <StatCard label="Disk" value={`${server.disk} MiB`} icon={<HardDrive className="h-3.5 w-3.5" />} />
        <StatCard label="CPU limit" value={`${server.cpu}%`} icon={<Cpu className="h-3.5 w-3.5" />} />
      </ServerPanel>
    </ServerPage>
  );
}

function VariableGroup({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 border-b border-[var(--border)]/40 bg-[var(--bg-elevated)]/35 px-4 py-2.5">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">{title}</h4>
        <span className="rounded-full border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)]">
          {count}
        </span>
      </div>
      <div className="grid gap-0 md:grid-cols-2">{children}</div>
    </section>
  );
}

function VariableField({
  label,
  env,
  description,
  fieldType,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  env: string;
  description?: string;
  fieldType?: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}) {
  const multiline = fieldType === 'textarea';

  return (
    <div className="flex flex-col gap-2 border-b border-[var(--border)]/35 p-4 md:border-b-0 md:odd:border-r md:[&:nth-last-child(-n+2)]:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium leading-snug">{label}</p>
          <code className="mt-0.5 inline-block font-mono text-[10px] text-[var(--muted)]">{env}</code>
        </div>
        {readOnly && (
          <span className="shrink-0 rounded-md bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[var(--muted)]">
            Locked
          </span>
        )}
      </div>

      {multiline ? (
        <textarea
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          readOnly={readOnly}
          disabled={readOnly}
          rows={3}
          className={fieldTextareaClass}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          readOnly={readOnly}
          disabled={readOnly}
          className={fieldInputClass}
        />
      )}

      {description && (
        <p className="text-[11px] leading-relaxed text-[var(--muted)]">{description}</p>
      )}
    </div>
  );
}
