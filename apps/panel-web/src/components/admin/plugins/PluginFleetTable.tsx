import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { AdminPanelPlugin } from '../../../lib/api';
import { Button } from '../../Layout';
import {
  isPluginActive,
  pluginGameLabel,
  pluginIcon,
  pluginManagePath,
  pluginNavLabel,
} from './plugin-fleet-utils';

export function PluginFleetTable({
  rows,
  busyId,
  onToggle,
}: {
  rows: AdminPanelPlugin[];
  busyId: string | null;
  onToggle: (plugin: AdminPanelPlugin) => void;
}) {
  return (
    <div className="ds-plg-table-wrap">
      <table className="ds-plg-table">
        <thead>
          <tr>
            <th>Plugin</th>
            <th>Game</th>
            <th>Server tab</th>
            <th>Catalog</th>
            <th>Status</th>
            <th className="ds-plg-table-actions" aria-label="Actions" />
            <th className="ds-plg-table-chevron" aria-hidden />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <PluginFleetTableRow
              key={row.id}
              plugin={row}
              busy={busyId === row.id}
              onToggle={() => onToggle(row)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PluginFleetTableRow({
  plugin,
  busy,
  onToggle,
}: {
  plugin: AdminPanelPlugin;
  busy: boolean;
  onToggle: () => void;
}) {
  const navigate = useNavigate();
  const Icon = pluginIcon(plugin.id);
  const active = isPluginActive(plugin);
  const managePath = pluginManagePath(plugin);

  return (
    <tr
      className="ds-plg-table-row"
      tabIndex={managePath ? 0 : undefined}
      onClick={() => {
        if (managePath) navigate(managePath);
      }}
      onKeyDown={(e) => {
        if (!managePath) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(managePath);
        }
      }}
    >
      <td>
        <div className="ds-plg-table-plugin">
          <span className="ds-plg-table-icon" aria-hidden>
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0">
            <span className="ds-plg-table-name block truncate">{plugin.name}</span>
            <span className="ds-plg-table-sub block truncate">v{plugin.version}</span>
          </span>
        </div>
      </td>
      <td>{pluginGameLabel(plugin.id)}</td>
      <td className="ds-text-muted">{pluginNavLabel(plugin) ?? '—'}</td>
      <td>
        {plugin.stats?.catalogCount !== undefined ? plugin.stats.catalogCount : '—'}
      </td>
      <td>
        <span className={`ds-plg-table-badge ds-plg-table-badge--${active ? 'active' : 'off'}`}>
          {active ? 'Active' : 'Off'}
        </span>
      </td>
      <td className="ds-plg-table-actions" onClick={(e) => e.stopPropagation()}>
        <Button type="button" size="sm" variant={plugin.enabled ? 'secondary' : 'primary'} disabled={busy} onClick={onToggle}>
          {plugin.enabled ? 'Disable' : 'Enable'}
        </Button>
        {managePath ? (
          <Link to={managePath} className="ds-plg-table-manage">
            Manage
          </Link>
        ) : null}
      </td>
      <td className="ds-plg-table-chevron">
        {managePath ? <ChevronRight className="h-4 w-4" aria-hidden /> : null}
      </td>
    </tr>
  );
}
