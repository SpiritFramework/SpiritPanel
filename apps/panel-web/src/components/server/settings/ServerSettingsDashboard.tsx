import { useState } from 'react';
import { useServerSettings } from '../../../hooks/useServerSettings';
import { SettingsHeader } from './SettingsHeader';
import { SettingsStatsRow } from './SettingsStatsRow';
import { SettingsGeneralPanel } from './SettingsGeneralPanel';
import { SettingsOverviewPanel } from './SettingsOverviewPanel';
import { SettingsReinstallPanel } from './SettingsReinstallPanel';

export function ServerSettingsDashboard() {
  const set = useServerSettings();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await set.reload();
    window.setTimeout(() => setRefreshing(false), 400);
  }

  return (
    <div className="ds-srv-set-shell">
      <SettingsHeader
        serverName={set.server.name}
        eggName={set.server.egg.name}
        eggLogoUrl={set.server.egg.logoUrl}
        hasChanges={set.hasChanges}
        saving={set.saving}
        saved={set.saved}
        canEdit={set.canEditSettings}
        refreshing={refreshing}
        suspended={set.server.suspended}
        onRefresh={() => void handleRefresh()}
        onReset={set.resetForm}
        onSave={() => void set.handleSave()}
      />

      <div className="ds-srv-set-body">
        {set.error ? <div className="ds-srv-set-error">{set.error}</div> : null}

        <SettingsStatsRow
          memory={set.server.memory}
          disk={set.server.disk}
          cpu={set.server.cpu}
          eggName={set.server.egg.name}
          nodeName={set.server.node.name}
        />

        <div className="ds-srv-set-grid">
          <SettingsGeneralPanel
            name={set.name}
            description={set.description}
            canEdit={set.canEditSettings}
            onNameChange={set.setName}
            onDescriptionChange={set.setDescription}
            onSubmit={() => void set.handleSave()}
          />

          <SettingsOverviewPanel
            server={set.server}
            live={set.live}
            address={set.address}
            showInstallFailedHint={set.showInstallFailedHint}
            copiedKey={set.copiedKey}
            onCopy={(text, key) => void set.copyText(text, key)}
          />
        </div>

        <SettingsReinstallPanel
          serverName={set.server.name}
          canReinstall={set.access.canReinstall}
          installing={set.installing}
          suspended={set.server.suspended}
          confirmReinstall={set.confirmReinstall}
          wipeFiles={set.wipeFiles}
          reinstalling={set.reinstalling}
          reinstallError={set.reinstallError}
          onStartConfirm={() => set.setConfirmReinstall(true)}
          onCancelConfirm={() => set.setConfirmReinstall(false)}
          onWipeFilesChange={set.setWipeFiles}
          onReinstall={() => void set.handleReinstall()}
        />
      </div>
    </div>
  );
}
