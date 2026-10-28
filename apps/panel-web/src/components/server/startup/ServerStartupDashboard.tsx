import { useState } from 'react';
import { useServerStartup } from '../../../hooks/useServerStartup';
import { StartupHeader } from './StartupHeader';
import { StartupStatsRow } from './StartupStatsRow';
import { StartupCommandPanel } from './StartupCommandPanel';
import { StartupPreviewPanel } from './StartupPreviewPanel';
import { StartupRecoveryPanel } from './StartupRecoveryPanel';
import { StartupVariablesPanel } from './StartupVariablesPanel';

export function ServerStartupDashboard({
  variant = 'page',
}: {
  /** Compact chrome when nested under Admin → Servers → detail → Manage. */
  variant?: 'page' | 'embedded';
}) {
  const stu = useServerStartup();
  const [refreshing, setRefreshing] = useState(false);
  const embedded = variant === 'embedded';

  async function handleRefresh() {
    setRefreshing(true);
    await stu.reload();
    window.setTimeout(() => setRefreshing(false), 400);
  }

  return (
    <div className={`ds-srv-stu-shell${embedded ? ' ds-srv-stu-shell--embedded' : ''}`}>
      <StartupHeader
        serverName={stu.server.name}
        eggName={stu.server.egg.name}
        eggLogoUrl={stu.server.egg.logoUrl}
        hasChanges={stu.hasChanges}
        saving={stu.saving}
        saved={stu.saved}
        canUpdate={stu.canUpdate}
        refreshing={refreshing}
        editableCount={stu.editableVariables.length}
        embedded={embedded}
        onRefresh={() => void handleRefresh()}
        onReset={stu.resetForm}
        onSave={() => void stu.saveAll()}
      />

      <div className="ds-srv-stu-body">
        {!stu.canUpdate ? (
          <div className="ds-srv-stu-notice">
            You can view startup settings but do not have permission to change them.
          </div>
        ) : null}

        {stu.error ? <div className="ds-srv-stu-error">{stu.error}</div> : null}

        {stu.access.isAdminSupport ? (
          <div className="ds-srv-stu-notice ds-srv-stu-notice--support">
            Admin support: egg-locked environment variables are editable here for this user&apos;s
            server.
          </div>
        ) : null}

        {!embedded ? (
          <StartupStatsRow
            variableCount={stu.variables.length}
            editableCount={stu.editableVariables.length}
            placeholderCount={stu.placeholders.length}
            memory={stu.server.memory}
            disk={stu.server.disk}
            cpu={stu.server.cpu}
          />
        ) : null}

        <div className="ds-srv-stu-command-grid">
          <StartupCommandPanel
            startup={stu.startup}
            placeholders={stu.placeholders}
            image={stu.image}
            imageOptions={stu.imageOptions}
            canUpdate={stu.canUpdate}
            onStartupChange={stu.updateStartup}
            onImageChange={stu.updateImage}
          />
          <StartupPreviewPanel resolvedStartup={stu.resolvedStartup} />
        </div>

        <StartupRecoveryPanel
          crashDetectionEnabled={stu.crashDetectionEnabled}
          autoStartEnabled={stu.autoStartEnabled}
          canUpdate={stu.canUpdate}
          onCrashDetectionChange={stu.setCrashDetectionEnabled}
          onAutoStartChange={stu.setAutoStartEnabled}
        />

        <StartupVariablesPanel
          variables={stu.variables}
          filteredEditable={stu.filteredEditable}
          filteredReadOnly={stu.filteredReadOnly}
          filteredCount={stu.filteredVariables.length}
          search={stu.search}
          filter={stu.filter}
          hasActiveFilters={stu.hasActiveFilters}
          canUpdate={stu.canUpdate}
          currentValues={stu.currentValues}
          onSearchChange={stu.setSearch}
          onFilterChange={stu.setFilter}
          onVariableChange={stu.setVariableValue}
        />
      </div>
    </div>
  );
}
