import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Database, Sparkles, Table2 } from 'lucide-react';
import { api } from '../../../../lib/api';
import { AdminLayout, Page } from '../../../Layout';
import { NodeOverviewSection } from '../../node-detail/NodeDetailShell';
import { Checkbox } from '../../../Checkbox';
import { AdminEditLoading } from '../../AdminEditLayout';
import { AlertBanner, StatusPill } from '../../../ui';

type DatabaseManagerSettings = {
  enabled: boolean;
  allowSqlConsole: boolean;
  allowDataEdits: boolean;
};

export function AdminDatabaseManagerView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [pluginEnabled, setPluginEnabled] = useState(true);
  const [settings, setSettings] = useState<DatabaseManagerSettings>({
    enabled: true,
    allowSqlConsole: true,
    allowDataEdits: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.admin.plugin('database-manager');
      const s = res.plugin.settings as DatabaseManagerSettings;
      setPluginEnabled(res.plugin.enabled);
      setSettings({
        enabled: s.enabled !== false,
        allowSqlConsole: s.allowSqlConsole !== false,
        allowDataEdits: s.allowDataEdits === true,
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

  async function saveSettings(patch: Partial<DatabaseManagerSettings>) {
    const next = { ...settings, ...patch };
    try {
      await api.admin.updatePlugin('database-manager', { settings: next });
      setSettings(next);
      setStatus('Settings saved');
      window.setTimeout(() => setStatus(''), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    }
  }

  async function togglePlugin() {
    try {
      const res = await api.admin.updatePlugin('database-manager', { enabled: !pluginEnabled });
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
        <div className="ds-plg-header-wrap">
          <header className={`ds-plg-header ds-plg-header--${live ? 'live' : 'idle'}`}>
            <nav className="ds-plg-header-crumb" aria-label="Breadcrumb">
              <Link to="/admin">Admin</Link>
              <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden />
              <Link to="/admin/plugins">Plugins</Link>
              <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden />
              <span>Database Manager</span>
            </nav>

            <div className="ds-plg-header-body">
              <div className="ds-plg-header-accent" aria-hidden />
              <div className="ds-plg-header-main">
                <div className="ds-plg-header-identity">
                  <div className="ds-plg-header-icon-wrap" aria-hidden>
                    <Database className="ds-icon" />
                    <span className={`ds-plg-header-pulse ds-plg-header-pulse--${live ? 'live' : 'idle'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="ds-plg-header-title-row">
                      <h1 className="ds-plg-header-title">Database Manager</h1>
                      <StatusPill label={live ? 'Live' : 'Off'} tone={live ? 'success' : 'neutral'} pulse={live} />
                    </div>
                    <p className="ds-plg-header-meta">
                      In-panel MySQL browser for server databases. Create, credentials, and delete stay on Databases —
                      this adds an optional browse/SQL experience when enabled.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>
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
                label="Database manager feature active"
                checked={settings.enabled}
                disabled={!pluginEnabled}
                onChange={(v: boolean) => void saveSettings({ enabled: v })}
              />
              <Checkbox
                label="Allow SQL console"
                checked={settings.allowSqlConsole}
                disabled={!pluginEnabled || !settings.enabled}
                onChange={(v: boolean) => void saveSettings({ allowSqlConsole: v })}
              />
              <Checkbox
                label="Allow data edits (INSERT / UPDATE / DELETE)"
                checked={settings.allowDataEdits}
                disabled={!pluginEnabled || !settings.enabled}
                onChange={(v: boolean) => void saveSettings({ allowDataEdits: v })}
              />
              <p className="ds-plg-settings-note">
                Writes also require the subuser permission <strong>Edit database data</strong>. Owners always have it.
              </p>
            </div>
          </NodeOverviewSection>

          <NodeOverviewSection icon={Table2} title="How it works" description="Server owner experience">
            <ul className="ds-plg-tips">
              <li>Existing Databases page is unchanged — create, credentials, and delete still work the same.</li>
              <li>When this plugin is live, each database row shows a Browse button for the built-in manager.</li>
              <li>Owners can filter tables, browse pages, inspect structure, and run SQL when allowed.</li>
              <li>Connections use that database&apos;s own MySQL user (not the host admin account).</li>
              <li>DDL (DROP / ALTER / CREATE) is always blocked. Writes require the data-edits setting.</li>
              <li>
                On the SQL tab, users can upload a <code>.sql</code> file (or paste a script) to import into that
                database.
              </li>
              <li>
                Subusers need <strong>View databases</strong> to browse and <strong>Edit database data</strong> to
                change rows or import write scripts (when writes are enabled).
              </li>
            </ul>
          </NodeOverviewSection>
        </div>
      </Page>
    </AdminLayout>
  );
}
