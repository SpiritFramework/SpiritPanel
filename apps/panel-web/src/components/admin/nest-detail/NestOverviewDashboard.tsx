import { Egg, Fingerprint, Layers, Server, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getServerTheme } from '../../../lib/server-theme';
import { ServerEggIcon } from '../../ServerEggIcon';
import { AdminCallout, AdminToolButton } from '../primitives';
import {
  NestDetailMetaGrid,
  NestDetailPanel,
  NestDetailUsageMeter,
} from './NestDetailShell';
import type { NestDetailController } from '../../../pages/admin/nest-detail/useNestDetail';

export function NestOverviewDashboard({
  ctrl,
  nav,
  fullAdmin,
  onImport,
}: {
  ctrl: NestDetailController;
  nav: { onManage: () => void; onEggs: () => void };
  fullAdmin: boolean;
  onImport?: () => void;
}) {
  const { detail, copied, copyText } = ctrl;
  if (!detail) return null;

  const enabledEggs = detail.eggs.filter((e) => e.enabled).length;
  const disabledEggs = detail.eggs.length - enabledEggs;
  const usageMax = Math.max(detail.eggCount, detail.serverCount, enabledEggs, 1);
  const created = new Date(detail.createdAt).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const updated = new Date(detail.updatedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const uuidShort = detail.uuid.split('-')[0] ?? detail.uuid.slice(0, 8);

  return (
    <div className="ds-nst-ov ds-ud-ov">
      {detail.eggCount === 0 ? (
        <AdminCallout
          tone="warning"
          icon={Egg}
          title="This nest has no eggs"
          description="Import a PTDL_v2 egg JSON to make templates available for provisioning."
          action={
            fullAdmin && onImport ? (
              <AdminToolButton type="button" onClick={onImport} primary>
                <Upload className="h-3.5 w-3.5" aria-hidden />
                Import egg
              </AdminToolButton>
            ) : (
              <AdminToolButton type="button" onClick={nav.onEggs}>
                Open eggs
              </AdminToolButton>
            )
          }
        />
      ) : null}

      <NestDetailPanel
        tone="identity"
        icon={Layers}
        eyebrow="Catalog"
        title="Footprint"
        description="Category metadata and deployment footprint"
        actions={
          <AdminToolButton type="button" onClick={nav.onManage}>
            Edit nest
          </AdminToolButton>
        }
      >
        <NestDetailMetaGrid
          items={[
            { label: 'Name', value: detail.name },
            { label: 'Author', value: detail.author },
            {
              label: 'Description',
              value: detail.description?.trim() || 'No description',
            },
          ]}
        />

        <div className="ds-ud-usage-meters">
          <NestDetailUsageMeter label="Eggs" value={detail.eggCount} max={usageMax} />
          <NestDetailUsageMeter label="Enabled" value={enabledEggs} max={usageMax} />
          <NestDetailUsageMeter label="Servers" value={detail.serverCount} max={usageMax} />
        </div>
      </NestDetailPanel>

      <NestDetailPanel
        tone="capacity"
        icon={Egg}
        eyebrow="Templates"
        title="Eggs in nest"
        description="Service templates available for provisioning"
        badge={detail.eggs.length > 0 ? String(detail.eggs.length) : undefined}
        actions={
          detail.eggs.length > 0 ? (
            <AdminToolButton type="button" onClick={nav.onEggs}>
              View all
            </AdminToolButton>
          ) : fullAdmin && onImport ? (
            <AdminToolButton type="button" onClick={onImport} primary>
              <Upload className="h-3.5 w-3.5" aria-hidden />
              Import
            </AdminToolButton>
          ) : undefined
        }
      >
        {detail.eggs.length === 0 ? (
          <p className="ds-nst-empty-inline ds-ud-empty-inline">
            No eggs yet — import a PTDL_v2 JSON file.
          </p>
        ) : (
          <ul className="ds-nst-egg-preview ds-ud-server-preview">
            {detail.eggs.slice(0, 6).map((egg) => {
              const theme = getServerTheme(egg.name);
              const hasLogo = Boolean(egg.logoUrl?.trim());
              return (
                <li key={egg.id}>
                  <Link to={`/admin/eggs/${egg.id}`} className="ds-nst-egg-preview-row ds-ud-server-preview-row">
                    <span
                      className="ds-nst-egg-preview-icon ds-ud-server-preview-icon"
                      style={{
                        background: hasLogo
                          ? 'color-mix(in srgb, var(--surface) 70%, transparent)'
                          : theme.gradient,
                      }}
                      aria-hidden
                    >
                      <ServerEggIcon
                        eggName={egg.name}
                        logoUrl={egg.logoUrl}
                        className="h-3.5 w-3.5"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="ds-nst-egg-preview-name ds-ud-server-preview-name truncate">
                        {egg.name}
                      </p>
                      <p className="ds-nst-egg-preview-meta ds-ud-server-preview-meta truncate">
                        {egg.variableCount} vars · {egg.serverCount} srv
                        {egg.author ? ` · ${egg.author}` : ''}
                      </p>
                    </div>
                    <span
                      className={`ds-nst-egg-preview-status${egg.enabled ? '' : ' ds-nst-egg-preview-status--off'}`}
                    >
                      {egg.enabled ? 'Active' : 'Off'}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </NestDetailPanel>

      <div className="ds-nst-ov-grid ds-ud-ov-grid">
        <NestDetailPanel
          tone="connection"
          icon={Fingerprint}
          eyebrow="References"
          title="Identifiers"
          description="Panel references for this nest"
        >
          <NestDetailMetaGrid
            items={[
              {
                label: 'Nest ID',
                value: detail.id,
                mono: true,
                onCopy: () => void copyText(detail.id, 'id'),
                copied: copied === 'id',
              },
              {
                label: 'UUID',
                value: detail.uuid,
                mono: true,
                onCopy: () => void copyText(detail.uuid, 'uuid'),
                copied: copied === 'uuid',
              },
              {
                label: 'Short UUID',
                value: uuidShort,
                mono: true,
              },
              { label: 'Created', value: created },
              { label: 'Updated', value: updated },
            ]}
          />
        </NestDetailPanel>

        <NestDetailPanel
          tone="trends"
          icon={Server}
          eyebrow="Fleet"
          title="Deployment"
          description="Servers using eggs from this nest"
          badge={detail.serverCount > 0 ? String(detail.serverCount) : undefined}
          actions={
            <AdminToolButton type="button" onClick={nav.onEggs}>
              Browse eggs
            </AdminToolButton>
          }
        >
          <NestDetailMetaGrid
            items={[
              { label: 'Provisioned servers', value: String(detail.serverCount) },
              { label: 'Enabled eggs', value: String(enabledEggs) },
              { label: 'Disabled eggs', value: String(disabledEggs) },
            ]}
          />
          <p className="ds-nst-empty-inline ds-ud-empty-inline mt-3">
            {detail.serverCount > 0
              ? `${detail.serverCount} server${detail.serverCount === 1 ? '' : 's'} provisioned from eggs in this nest.`
              : 'No servers are using eggs from this nest yet.'}
          </p>
        </NestDetailPanel>
      </div>
    </div>
  );
}
