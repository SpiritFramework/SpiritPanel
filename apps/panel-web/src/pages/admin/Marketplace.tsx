import { useEffect, useState } from 'react';
import { Github, Package, Store } from 'lucide-react';
import { api } from '../../lib/api';
import {
  DEFAULT_MARKETPLACE,
  DEFAULT_MINECRAFT_PLUGINS,
  type PanelMarketplaceSettings,
  type PanelMinecraftPluginsSettings,
} from '../../lib/panel-settings';
import { AdminLayout } from '../../components/Layout';
import { Checkbox } from '../../components/Checkbox';
import {
  AdminDetailBody,
  AdminDetailHero,
  AdminDetailPage,
  AdminFormStatus,
  AdminSettingsPanel,
} from '../../components/AdminDetailLayout';

export function AdminMarketplacePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [marketplace, setMarketplace] = useState<PanelMarketplaceSettings>(DEFAULT_MARKETPLACE);
  const [minecraftPlugins, setMinecraftPlugins] = useState<PanelMinecraftPluginsSettings>(DEFAULT_MINECRAFT_PLUGINS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    void api.admin
      .settings()
      .then((s) => {
        setMarketplace({ ...DEFAULT_MARKETPLACE, ...(s.marketplace as PanelMarketplaceSettings | undefined) });
        setMinecraftPlugins({
          ...DEFAULT_MINECRAFT_PLUGINS,
          ...(s.minecraft_plugins as PanelMinecraftPluginsSettings | undefined),
        });
      })
      .catch(() => setError('Failed to load marketplace settings'))
      .finally(() => setLoading(false));
  }, []);

  async function updateMarketplaceSetting(patch: Partial<PanelMarketplaceSettings>) {
    setSaving(true);
    setError('');
    setStatus('');
    const next = { ...marketplace, ...patch };
    try {
      await api.admin.updateSettings({ marketplace: next });
      setMarketplace(next);
      setStatus('FiveM marketplace settings saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update marketplace setting');
    } finally {
      setSaving(false);
    }
  }

  async function updateMinecraftPluginsSetting(patch: Partial<PanelMinecraftPluginsSettings>) {
    setSaving(true);
    setError('');
    setStatus('');
    const next = { ...minecraftPlugins, ...patch };
    try {
      await api.admin.updateSettings({ minecraft_plugins: next });
      setMinecraftPlugins(next);
      setStatus('Minecraft plugin settings saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update Minecraft plugin setting');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout>
      <AdminDetailPage
        breadcrumb={[
          { label: 'Admin', to: '/admin' },
          { label: 'Marketplace' },
        ]}
      >
        <AdminDetailHero
          title="Marketplace & plugins"
          subtitle="FiveM resources from GitHub and Minecraft plugins/mods from Modrinth. Files are downloaded at install time — nothing is hosted on your panel."
          icon={Package}
          stats={[
            { label: 'FiveM', value: marketplace.enabled ? 'On' : 'Off' },
            { label: 'Minecraft', value: minecraftPlugins.enabled ? 'On' : 'Off' },
            { label: 'Sources', value: 'GitHub + Modrinth' },
          ]}
        />

        <AdminDetailBody>
          {error && <AdminFormStatus error={error} />}
          {status && <AdminFormStatus saved />}

          {loading ? (
            <p className="text-sm text-[var(--muted)]">Loading settings…</p>
          ) : (
            <>
              <AdminSettingsPanel
                title="FiveM marketplace"
                description="Control whether FiveM server owners can browse and install from GitHub"
                icon={Store}
              >
                <div className="space-y-3">
                  <Checkbox
                    label="Enable FiveM marketplace for users"
                    description="When disabled, the marketplace tab is hidden and install APIs are blocked."
                    checked={marketplace.enabled}
                    disabled={saving}
                    onChange={(enabled) => void updateMarketplaceSetting({ enabled })}
                  />
                  <Checkbox
                    label="Allow GitHub installs"
                    description="Discover tab with featured scripts, search, and custom install paths."
                    checked={marketplace.allowGithubInstalls}
                    disabled={saving || !marketplace.enabled}
                    onChange={(allowGithubInstalls) => void updateMarketplaceSetting({ allowGithubInstalls })}
                  />
                </div>
              </AdminSettingsPanel>

              <AdminSettingsPanel
                title="Minecraft plugins"
                description="One-click Modrinth installs for Paper, Spigot, Purpur, Fabric, Forge, Velocity, and more"
                icon={Package}
              >
                <div className="space-y-3">
                  <Checkbox
                    label="Enable Minecraft plugin store"
                    description="Shows a Plugins tab on Java Minecraft servers and enables browse/install APIs."
                    checked={minecraftPlugins.enabled}
                    disabled={saving}
                    onChange={(enabled) => void updateMinecraftPluginsSetting({ enabled })}
                  />
                  <Checkbox
                    label="Allow Modrinth installs"
                    description="Download JARs/zips from Modrinth into plugins/, mods/, or datapacks/."
                    checked={minecraftPlugins.allowModrinthInstalls}
                    disabled={saving || !minecraftPlugins.enabled}
                    onChange={(allowModrinthInstalls) =>
                      void updateMinecraftPluginsSetting({ allowModrinthInstalls })
                    }
                  />
                </div>
              </AdminSettingsPanel>
            </>
          )}

          <AdminSettingsPanel
            title="How it works"
            description="Catalogs are resolved at install time from public sources"
            icon={Github}
          >
            <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
              <li>FiveM: users browse GitHub; resources land under resources/ with optional server.cfg patching.</li>
              <li>Minecraft: browse is filtered by egg platform (Paper, Fabric, etc.) and server version variables.</li>
              <li>Plugins install to /plugins, mods to /mods, datapacks to /world/datapacks (level-name aware).</li>
              <li>Required Modrinth dependencies are installed automatically when available.</li>
            </ul>
          </AdminSettingsPanel>
        </AdminDetailBody>
      </AdminDetailPage>
    </AdminLayout>
  );
}
