import { Egg, Fingerprint, Layers, Server, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getServerTheme } from '../../../lib/server-theme';
import { ServerEggIcon } from '../../ServerEggIcon';
import {
  NestDetailMetaGrid,
  NestDetailPanel,
  NestDetailQuickDock,
} from './NestDetailShell';
import type { NestDetailController } from '../../../pages/admin/nest-detail/useNestDetail';
import { NEST_GRADIENT } from '../../../pages/admin/nest-detail/helpers';

export function NestOverviewDashboard({
  ctrl,
  nav,
}: {
  ctrl: NestDetailController;
  nav: { onManage: () => void; onEggs: () => void };
}) {
  const { detail, copied, copyText } = ctrl;
  if (!detail) return null;

  const dockItems = [
    { icon: Settings, label: 'Manage', hint: 'Edit nest details', onClick: nav.onManage },
    {
      icon: Egg,
      label: 'Eggs',
      hint: `${detail.eggCount} in nest`,
      onClick: nav.onEggs,
    },
  ];

  return (
    <div className="ds-nst-ov">
      <NestDetailQuickDock items={dockItems} />

      <div className="ds-nst-ov-bento">
        <div className="ds-nst-ov-bento-main">
          <NestDetailPanel
            icon={Layers}
            title="Nest snapshot"
            description="Category for service templates"
          >
            <div className="ds-nst-snapshot-row">
              <div className="ds-nst-snapshot-icon" style={{ background: NEST_GRADIENT }} aria-hidden>
                <Layers className="h-5 w-5 text-white/90" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="ds-nst-snapshot-name truncate">{detail.name}</p>
                <p className="ds-nst-snapshot-sub truncate">
                  {detail.description || 'No description'}
                </p>
                <p className="ds-nst-snapshot-meta">by {detail.author}</p>
              </div>
            </div>

            <div className="ds-nst-resource-grid">
              <div className="ds-nst-resource-item">
                <span className="ds-nst-resource-label">Eggs</span>
                <span className="ds-nst-resource-value">{detail.eggCount}</span>
              </div>
              <div className="ds-nst-resource-item">
                <span className="ds-nst-resource-label">Servers</span>
                <span className="ds-nst-resource-value">{detail.serverCount}</span>
              </div>
              <div className="ds-nst-resource-item">
                <span className="ds-nst-resource-label">Enabled</span>
                <span className="ds-nst-resource-value">
                  {detail.eggs.filter((e) => e.enabled).length}
                </span>
              </div>
              <div className="ds-nst-resource-item">
                <span className="ds-nst-resource-label">Disabled</span>
                <span className="ds-nst-resource-value">
                  {detail.eggs.filter((e) => !e.enabled).length}
                </span>
              </div>
            </div>
          </NestDetailPanel>

          <NestDetailPanel
            icon={Egg}
            title="Eggs in nest"
            description="Service templates available for provisioning"
            badge={detail.eggs.length > 0 ? String(detail.eggs.length) : undefined}
          >
            {detail.eggs.length === 0 ? (
              <p className="ds-nst-empty-inline">No eggs yet — import a PTDL_v2 JSON file.</p>
            ) : (
              <ul className="ds-nst-egg-preview">
                {detail.eggs.slice(0, 5).map((egg) => {
                  const theme = getServerTheme(egg.name);
                  return (
                    <li key={egg.id}>
                      <Link to={`/admin/eggs/${egg.id}`} className="ds-nst-egg-preview-row">
                        <span
                          className="ds-nst-egg-preview-icon"
                          style={{ background: theme.gradient }}
                          aria-hidden
                        >
                          <ServerEggIcon eggName={egg.name} className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="ds-nst-egg-preview-name truncate">{egg.name}</p>
                          <p className="ds-nst-egg-preview-meta truncate">
                            {egg.variableCount} vars · {egg.serverCount} srv
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
            {detail.eggs.length > 4 ? (
              <button type="button" className="ds-nst-link-btn" onClick={nav.onEggs}>
                View all {detail.eggs.length} eggs
              </button>
            ) : null}
          </NestDetailPanel>
        </div>

        <div className="ds-nst-ov-bento-side">
          <NestDetailPanel icon={Fingerprint} title="Identifiers" description="Panel references">
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
              ]}
            />
          </NestDetailPanel>

          {detail.serverCount > 0 ? (
            <NestDetailPanel icon={Server} title="Deployment" description="Servers using eggs here">
              <p className="ds-nst-empty-inline">
                {detail.serverCount} server{detail.serverCount === 1 ? '' : 's'} provisioned from
                eggs in this nest.
              </p>
            </NestDetailPanel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
