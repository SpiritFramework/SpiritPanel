import { Box, Egg, Fingerprint, Layers, Settings, Terminal, Variable } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getServerTheme } from '../../../lib/server-theme';
import { ServerEggIcon } from '../../ServerEggIcon';
import {
  EggDetailMetaGrid,
  EggDetailPanel,
  EggDetailQuickDock,
} from './EggDetailShell';
import type { EggDetailController } from '../../../pages/admin/egg-detail/useEggDetail';
import { EGG_GRADIENT } from '../../../pages/admin/egg-detail/helpers';

export function EggOverviewDashboard({
  ctrl,
  nav,
}: {
  ctrl: EggDetailController;
  nav: {
    onManage: () => void;
    onVariables: () => void;
    onConfig: () => void;
  };
}) {
  const { detail, copied, copyText, dockerImageEntries } = ctrl;
  if (!detail) return null;

  const theme = getServerTheme(detail.name);
  const gradient = theme.gradient ?? EGG_GRADIENT;

  const dockItems = [
    { icon: Settings, label: 'Manage', hint: 'Name & availability', onClick: nav.onManage },
    {
      icon: Variable,
      label: 'Variables',
      hint: `${detail.variables.length} defined`,
      onClick: nav.onVariables,
    },
    {
      icon: Terminal,
      label: 'Config',
      hint: 'Startup & docker',
      onClick: nav.onConfig,
    },
  ];

  return (
    <div className="ds-egg-ov">
      {!detail.enabled ? (
        <div className="ds-egg-banner ds-egg-banner--warning">
          <Egg className="h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="ds-egg-banner-title">Egg disabled</p>
            <p className="ds-egg-banner-text">
              Disabled eggs cannot be selected when creating new servers.
            </p>
          </div>
        </div>
      ) : null}

      <EggDetailQuickDock items={dockItems} />

      <div className="ds-egg-ov-bento">
        <div className="ds-egg-ov-bento-main">
          <EggDetailPanel icon={Egg} title="Egg snapshot" description="Service template details">
            <div className="ds-egg-snapshot-row">
              <div className="ds-egg-snapshot-icon" style={{ background: gradient }} aria-hidden>
                <ServerEggIcon
                  eggName={detail.name}
                  logoUrl={detail.logoUrl}
                  className="h-5 w-5"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="ds-egg-snapshot-name truncate">{detail.name}</p>
                <p className="ds-egg-snapshot-sub truncate">
                  {detail.description || 'No description'}
                </p>
                <p className="ds-egg-snapshot-meta">by {detail.author}</p>
              </div>
            </div>

            <div className="ds-egg-resource-grid">
              <div className="ds-egg-resource-item">
                <span className="ds-egg-resource-label">Variables</span>
                <span className="ds-egg-resource-value">{detail.variables.length}</span>
              </div>
              <div className="ds-egg-resource-item">
                <span className="ds-egg-resource-label">Servers</span>
                <span className="ds-egg-resource-value">{detail.serverCount}</span>
              </div>
              <div className="ds-egg-resource-item">
                <span className="ds-egg-resource-label">Images</span>
                <span className="ds-egg-resource-value">{dockerImageEntries.length}</span>
              </div>
              <div className="ds-egg-resource-item">
                <span className="ds-egg-resource-label">Features</span>
                <span className="ds-egg-resource-value">{detail.features.length}</span>
              </div>
            </div>
          </EggDetailPanel>

          <EggDetailPanel
            icon={Terminal}
            title="Startup command"
            description="Executed when the server starts"
          >
            <pre className="ds-egg-code-block">{detail.startup}</pre>
            <p className="ds-egg-code-hint">
              Stop signal: <code>{detail.configStop}</code>
            </p>
          </EggDetailPanel>
        </div>

        <div className="ds-egg-ov-bento-side">
          <EggDetailPanel icon={Layers} title="Nest" description="Parent category">
            <Link to={`/admin/nests/${detail.nestId}`} className="ds-egg-nest-link">
              <Layers className="h-4 w-4 opacity-70" aria-hidden />
              <span className="truncate">{detail.nest.name}</span>
            </Link>
          </EggDetailPanel>

          <EggDetailPanel icon={Fingerprint} title="Identifiers" description="Panel references">
            <EggDetailMetaGrid
              items={[
                {
                  label: 'Egg ID',
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
          </EggDetailPanel>

          {dockerImageEntries.length > 0 ? (
            <EggDetailPanel
              icon={Box}
              title="Docker images"
              description="Container images for this egg"
              badge={String(dockerImageEntries.length)}
            >
              <ul className="ds-egg-image-preview">
                {dockerImageEntries.slice(0, 3).map(([label, image]) => (
                  <li key={label} className="ds-egg-image-row">
                    <span className="ds-egg-image-label">{label}</span>
                    <span className="ds-egg-image-value truncate" title={image}>
                      {image}
                    </span>
                  </li>
                ))}
              </ul>
              {dockerImageEntries.length > 3 ? (
                <button type="button" className="ds-egg-link-btn" onClick={nav.onConfig}>
                  View all images
                </button>
              ) : null}
            </EggDetailPanel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
