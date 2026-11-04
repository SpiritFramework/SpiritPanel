import { Github, Layers, Store } from 'lucide-react';
import { AdminHero, AdminKpiStrip } from '../../primitives';

export function FivemMarketplaceHeader({
  catalogCount,
  settings,
}: {
  catalogCount: number;
  settings: { enabled: boolean; allowGithubInstalls: boolean; allowCatalogInstalls: boolean };
}) {
  const live = settings.enabled;

  return (
    <div className="ds-nd-list-top">
      <AdminHero
        eyebrow="Plugins · FiveM"
        title="FiveM Marketplace"
        description="Curated resources and GitHub discovery for FiveM servers — installs patch server.cfg automatically"
        pill={live ? 'Live' : 'Off'}
        pillTone={live ? 'ok' : 'neutral'}
      />
      <AdminKpiStrip
        label="Marketplace summary"
        columns={4}
        items={[
          { icon: Store, label: 'Catalog', value: catalogCount },
          {
            icon: Layers,
            label: 'Host catalog',
            value: settings.allowCatalogInstalls ? 'On' : 'Off',
            tone: settings.allowCatalogInstalls ? 'success' : undefined,
          },
          {
            icon: Github,
            label: 'GitHub',
            value: settings.allowGithubInstalls ? 'On' : 'Off',
            tone: settings.allowGithubInstalls ? 'success' : undefined,
          },
          {
            icon: Store,
            label: 'Status',
            value: live ? 'Live' : 'Off',
            tone: live ? 'success' : undefined,
          },
        ]}
      />
    </div>
  );
}
