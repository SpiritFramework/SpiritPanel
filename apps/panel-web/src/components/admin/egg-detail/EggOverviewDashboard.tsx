import { Box, Egg, Fingerprint, Layers, Terminal, Variable } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AdminCallout, AdminToolButton } from '../primitives';
import {
  EggDetailMetaGrid,
  EggDetailPanel,
  EggDetailUsageMeter,
} from './EggDetailShell';
import type { EggDetailController } from '../../../pages/admin/egg-detail/useEggDetail';

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

  const usageMax = Math.max(
    detail.variables.length,
    detail.serverCount,
    dockerImageEntries.length,
    detail.features.length,
    1,
  );
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
  const viewableVars = detail.variables.filter((v) => v.userViewable).length;

  return (
    <div className="ds-egg-ov ds-ud-ov">
      {!detail.enabled ? (
        <AdminCallout
          tone="warning"
          icon={Egg}
          title="Egg disabled"
          description="Disabled eggs cannot be selected when creating new servers."
          action={
            <AdminToolButton type="button" onClick={nav.onManage}>
              Manage egg
            </AdminToolButton>
          }
        />
      ) : null}

      <EggDetailPanel
        tone="identity"
        icon={Egg}
        eyebrow="Template"
        title="Footprint"
        description="Service template metadata and deployment footprint"
        badge={detail.enabled ? 'Enabled' : 'Disabled'}
        actions={
          <AdminToolButton type="button" onClick={nav.onManage}>
            Edit egg
          </AdminToolButton>
        }
      >
        <EggDetailMetaGrid
          items={[
            { label: 'Name', value: detail.name },
            { label: 'Author', value: detail.author },
            {
              label: 'Description',
              value: detail.description?.trim() || 'No description',
            },
            {
              label: 'Nest',
              value: detail.nest.name,
            },
          ]}
        />

        <div className="ds-ud-usage-meters">
          <EggDetailUsageMeter label="Variables" value={detail.variables.length} max={usageMax} />
          <EggDetailUsageMeter label="Servers" value={detail.serverCount} max={usageMax} />
          <EggDetailUsageMeter label="Images" value={dockerImageEntries.length} max={usageMax} />
        </div>
      </EggDetailPanel>

      <EggDetailPanel
        tone="wings"
        icon={Terminal}
        eyebrow="Runtime"
        title="Startup command"
        description="Executed when the server starts"
        actions={
          <AdminToolButton type="button" onClick={nav.onConfig}>
            Open config
          </AdminToolButton>
        }
      >
        <pre className="ds-egg-code-block">{detail.startup}</pre>
        <p className="ds-egg-code-hint">
          Stop signal: <code>{detail.configStop}</code>
        </p>
      </EggDetailPanel>

      <div className="ds-egg-ov-grid ds-ud-ov-grid">
        <EggDetailPanel
          tone="connection"
          icon={Fingerprint}
          eyebrow="References"
          title="Identifiers"
          description="Panel references for this egg"
        >
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
              {
                label: 'Short UUID',
                value: uuidShort,
                mono: true,
              },
              { label: 'Created', value: created },
              { label: 'Updated', value: updated },
            ]}
          />
        </EggDetailPanel>

        <EggDetailPanel
          tone="capacity"
          icon={Layers}
          eyebrow="Catalog"
          title="Nest & usage"
          description="Parent nest and live deployment"
          actions={
            <AdminToolButton to={`/admin/nests/${detail.nestId}`}>
              Open nest
            </AdminToolButton>
          }
        >
          <Link to={`/admin/nests/${detail.nestId}`} className="ds-egg-nest-link">
            <Layers className="h-4 w-4 opacity-70" aria-hidden />
            <span className="truncate">{detail.nest.name}</span>
          </Link>
          <EggDetailMetaGrid
            items={[
              { label: 'Servers using egg', value: String(detail.serverCount) },
              { label: 'User-viewable vars', value: String(viewableVars) },
              { label: 'Features', value: String(detail.features.length) },
            ]}
          />
        </EggDetailPanel>
      </div>

      <div className="ds-egg-ov-grid ds-ud-ov-grid">
        <EggDetailPanel
          tone="trends"
          icon={Variable}
          eyebrow="Environment"
          title="Variables"
          description="Startup environment keys for this egg"
          badge={String(detail.variables.length)}
          actions={
            <AdminToolButton type="button" onClick={nav.onVariables}>
              Manage variables
            </AdminToolButton>
          }
        >
          {detail.variables.length === 0 ? (
            <p className="ds-egg-empty-inline ds-ud-empty-inline">No variables defined yet.</p>
          ) : (
            <ul className="ds-egg-var-preview">
              {detail.variables.slice(0, 5).map((variable) => (
                <li key={variable.id} className="ds-egg-var-preview-row">
                  <div className="min-w-0 flex-1">
                    <p className="ds-egg-var-preview-name truncate">{variable.name}</p>
                    <p className="ds-egg-var-preview-meta truncate">
                      <code>{variable.envVariable}</code>
                      {variable.defaultValue ? ` · ${variable.defaultValue}` : ''}
                    </p>
                  </div>
                  <span className="ds-egg-var-preview-flags">
                    {variable.userEditable ? 'Editable' : variable.userViewable ? 'Viewable' : 'Hidden'}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {detail.variables.length > 5 ? (
            <button type="button" className="ds-egg-link-btn" onClick={nav.onVariables}>
              View all {detail.variables.length} variables
            </button>
          ) : null}
        </EggDetailPanel>

        <EggDetailPanel
          tone="capacity"
          icon={Box}
          eyebrow="Containers"
          title="Docker images"
          description="Images available when provisioning"
          badge={dockerImageEntries.length > 0 ? String(dockerImageEntries.length) : undefined}
          actions={
            dockerImageEntries.length > 0 ? (
              <AdminToolButton type="button" onClick={nav.onConfig}>
                View config
              </AdminToolButton>
            ) : undefined
          }
        >
          {dockerImageEntries.length === 0 ? (
            <p className="ds-egg-empty-inline ds-ud-empty-inline">No docker images configured.</p>
          ) : (
            <ul className="ds-egg-image-preview">
              {dockerImageEntries.slice(0, 4).map(([label, image]) => (
                <li key={label} className="ds-egg-image-row">
                  <span className="ds-egg-image-label">{label}</span>
                  <span className="ds-egg-image-value truncate" title={image}>
                    {image}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {detail.features.length > 0 ? (
            <div className="ds-egg-feature-tags mt-3">
              {detail.features.map((f) => (
                <span key={f} className="ds-egg-feature-tag">
                  {f}
                </span>
              ))}
            </div>
          ) : null}
        </EggDetailPanel>
      </div>
    </div>
  );
}
