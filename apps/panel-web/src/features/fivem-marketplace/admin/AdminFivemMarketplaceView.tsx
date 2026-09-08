import { useCallback, useEffect, useState } from 'react';
import { api, type FivemCatalogEntryInput, type MarketplaceCatalogPlugin } from '../../../lib/api';
import { AdminLayout, Page } from '../../../components/Layout';
import {
  catalogEntryToForm,
  FivemMarketplaceWorkspace,
} from '../../../components/admin/plugins/fivem/FivemMarketplaceWorkspace';
import { FivemMarketplaceHeader } from '../../../components/admin/plugins/fivem/FivemMarketplaceHeader';
import {
  EMPTY_FIVEM_CATALOG_FORM,
  FivemCatalogEditor,
} from '../../../components/admin/plugins/fivem/FivemCatalogEditor';
import { AdminEditLoading } from '../../../components/admin/AdminEditLayout';
import { AlertBanner } from '../../../components/ui';

type FivemSettings = {
  enabled: boolean;
  allowGithubInstalls: boolean;
  allowCatalogInstalls: boolean;
};

export function AdminFivemMarketplaceView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [catalog, setCatalog] = useState<MarketplaceCatalogPlugin[]>([]);
  const [settings, setSettings] = useState<FivemSettings>({
    enabled: true,
    allowGithubInstalls: true,
    allowCatalogInstalls: true,
  });
  const [editor, setEditor] = useState<{
    mode: 'create' | 'edit';
    data: FivemCatalogEntryInput;
    id?: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pluginRes, catalogRes] = await Promise.all([
        api.admin.plugin('fivem-marketplace'),
        api.admin.fivemCatalog({ includeDisabled: true }),
      ]);
      const s = pluginRes.plugin.settings as FivemSettings;
      setSettings({
        enabled: s.enabled !== false,
        allowGithubInstalls: s.allowGithubInstalls !== false,
        allowCatalogInstalls: s.allowCatalogInstalls !== false,
      });
      setCatalog(catalogRes.plugins);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveSettings(patch: Partial<FivemSettings>) {
    const next = { ...settings, ...patch };
    try {
      await api.admin.updatePlugin('fivem-marketplace', { settings: next });
      setSettings(next);
      setStatus('Settings saved');
      window.setTimeout(() => setStatus(''), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    }
  }

  if (loading && catalog.length === 0) {
    return (
      <AdminLayout>
        <AdminEditLoading />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Page className="ds-plg-page">
        <FivemMarketplaceHeader catalogCount={catalog.length} settings={settings} />

        {error ? (
          <AlertBanner tone="error" className="mb-4">
            {error}
          </AlertBanner>
        ) : null}

        <FivemMarketplaceWorkspace
          loading={loading}
          catalog={catalog}
          settings={settings}
          statusMessage={status || undefined}
          onSaveSettings={(patch) => void saveSettings(patch)}
          onAdd={() => setEditor({ mode: 'create', data: { ...EMPTY_FIVEM_CATALOG_FORM } })}
          onEdit={(entry) =>
            setEditor({ mode: 'edit', id: entry.id, data: catalogEntryToForm(entry) })
          }
          onDelete={(entry) => {
            if (!confirm(`Delete "${entry.name}"?`)) return;
            void api.admin.deleteFivemCatalogEntry(entry.id).then(() => load());
          }}
        />
      </Page>

      <FivemCatalogEditor
        open={editor !== null}
        title={editor?.mode === 'create' ? 'Add catalog resource' : 'Edit catalog resource'}
        initial={editor?.data ?? EMPTY_FIVEM_CATALOG_FORM}
        onClose={() => setEditor(null)}
        onSave={async (data) => {
          if (editor?.mode === 'create') await api.admin.createFivemCatalogEntry(data);
          else if (editor?.id) await api.admin.updateFivemCatalogEntry(editor.id, data);
          setStatus(editor?.mode === 'create' ? 'Resource added' : 'Resource updated');
          await load();
        }}
      />
    </AdminLayout>
  );
}

export { AdminFivemMarketplaceView as AdminFivemMarketplacePluginPage };
