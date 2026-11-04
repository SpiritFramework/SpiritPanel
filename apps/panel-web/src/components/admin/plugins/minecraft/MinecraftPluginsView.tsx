import { useCallback, useEffect, useState } from 'react';
import { Download, Sparkles } from 'lucide-react';
import { api } from '../../../../lib/api';
import { AdminLayout, Page } from '../../../Layout';
import { NodeOverviewSection } from '../../node-detail/NodeDetailShell';
import { Checkbox } from '../../../Checkbox';
import { AdminEditLoading } from '../../AdminEditLayout';
import { AdminHero } from '../../primitives';
import { AlertBanner } from '../../../ui';

type MinecraftSettings = {
  enabled: boolean;
  allowModrinthInstalls: boolean;
};

export function AdminMinecraftPluginsView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [pluginEnabled, setPluginEnabled] = useState(true);
  const [settings, setSettings] = useState<MinecraftSettings>({
    enabled: true,
    allowModrinthInstalls: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.admin.plugin('minecraft-plugins');
      const s = res.plugin.settings as MinecraftSettings;
      setPluginEnabled(res.plugin.enabled);
      setSettings({
        enabled: s.enabled !== false,
        allowModrinthInstalls: s.allowModrinthInstalls !== false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveSettings(patch: Partial<MinecraftSettings>) {
    const next = { ...settings, ...patch };
    try {
      await api.admin.updatePlugin('minecraft-plugins', { settings: next });
      setSettings(next);
      setStatus('Settings saved');
      window.setTimeout(() => setStatus(''), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    }
  }

  async function togglePlugin() {
    try {
      const res = await api.admin.updatePlugin('minecraft-plugins', { enabled: !pluginEnabled });
      setPluginEnabled(res.plugin.enabled);
      setStatus(res.plugin.enabled ? 'Plugin enabled' : 'Plugin disabled');
      window.setTimeout(() => setStatus(''), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update plugin');
    }
  }

  const live = pluginEnabled && settings.enabled;

  if (loading) {
    return (
      <AdminLayout>
        <AdminEditLoading />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Page className="ds-plg-page">
        <div className="ds-nd-list-top">
          <AdminHero
            eyebrow="Plugins · Minecraft"
            title="Minecraft Plugins"
            description="Modrinth search and one-click plugin installs for Java Minecraft servers"
            pill={live ? 'Live' : 'Off'}
            pillTone={live ? 'ok' : 'neutral'}
          />
        </div>

        {error ? (
          <AlertBanner tone="error" className="mb-4">
            {error}
          </AlertBanner>
        ) : null}
        {status ? (
          <p className="ds-plg-status-msg" role="status">
            {status}
          </p>
        ) : null}

        <div className="ds-plg-fivem-grid">
          <NodeOverviewSection icon={Sparkles} title="Visibility" description="Panel and server owner access">
            <div className="ds-plg-settings-stack">
              <Checkbox label="Plugin enabled on panel" checked={pluginEnabled} onChange={() => void togglePlugin()} />
              <Checkbox
                label="Minecraft plugins feature active"
                checked={settings.enabled}
                disabled={!pluginEnabled}
                onChange={(v: boolean) => void saveSettings({ enabled: v })}
              />
              <Checkbox
                label="Allow Modrinth installs"
                checked={settings.allowModrinthInstalls}
                disabled={!pluginEnabled || !settings.enabled}
                onChange={(v: boolean) => void saveSettings({ allowModrinthInstalls: v })}
              />
            </div>
          </NodeOverviewSection>

          <NodeOverviewSection icon={Download} title="How it works" description="Server owner experience">
            <ul className="ds-plg-tips">
              <li>Owners browse Modrinth from the Plugins tab on Java Minecraft servers.</li>
              <li>Compatible versions are filtered to the server&apos;s game version.</li>
              <li>Installs write directly to the server plugins folder via Wings.</li>
            </ul>
          </NodeOverviewSection>
        </div>
      </Page>
    </AdminLayout>
  );
}
