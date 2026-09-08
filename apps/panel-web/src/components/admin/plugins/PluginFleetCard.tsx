import { Link } from 'react-router-dom';
import { ArrowUpRight, Server, Settings2 } from 'lucide-react';
import type { AdminPanelPlugin } from '../../../lib/api';
import { Button } from '../../Layout';
import { Checkbox } from '../../Checkbox';
import {
  isPluginActive,
  pluginAccentTone,
  pluginGameLabel,
  pluginIcon,
  pluginManagePath,
  pluginNavLabel,
} from './plugin-fleet-utils';

export function PluginFleetCard({
  plugin,
  busy,
  onToggle,
}: {
  plugin: AdminPanelPlugin;
  busy: boolean;
  onToggle: () => void;
}) {
  const Icon = pluginIcon(plugin.id);
  const active = isPluginActive(plugin);
  const tone = active ? pluginAccentTone(plugin.id) : 'off';
  const managePath = pluginManagePath(plugin);
  const navLabel = pluginNavLabel(plugin);

  return (
    <article className={`ds-plg-card ds-plg-card--${tone}`}>
      <div className="ds-plg-card-accent" aria-hidden />

      <div className="ds-plg-card-top">
        <div className="ds-plg-card-icon" aria-hidden>
          <Icon className="ds-icon ds-icon--sm" />
          <span className={`ds-plg-card-pulse ds-plg-card-pulse--${tone}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="ds-plg-card-title">{plugin.name}</h2>
            <span className={`ds-plg-card-badge ds-plg-card-badge--${active ? 'active' : 'off'}`}>
              {active ? 'Active' : 'Off'}
            </span>
            <span className="ds-plg-card-version">v{plugin.version}</span>
          </div>
          <p className="ds-plg-card-game">{pluginGameLabel(plugin.id)}</p>
          <p className="ds-plg-card-desc">{plugin.description}</p>
        </div>

        {managePath ? (
          <Link to={managePath} className="ds-plg-card-link" aria-label={`Manage ${plugin.name}`}>
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : null}
      </div>

      <div className="ds-plg-card-stats">
        {navLabel ? (
          <span className="ds-plg-card-stat">
            <Server className="h-3 w-3" aria-hidden />
            Server tab: {navLabel}
          </span>
        ) : null}
        {plugin.stats?.catalogCount !== undefined ? (
          <span className="ds-plg-card-stat">
            <Settings2 className="h-3 w-3" aria-hidden />
            {plugin.stats.catalogCount} catalog entries
          </span>
        ) : (
          <span className="ds-plg-card-stat">
            <Settings2 className="h-3 w-3" aria-hidden />
            Modrinth-powered installs
          </span>
        )}
        {plugin.author ? (
          <span className="ds-plg-card-stat ds-text-muted">by {plugin.author}</span>
        ) : null}
      </div>

      <div className="ds-plg-card-foot">
        <Checkbox
          label="Enabled on panel"
          checked={plugin.enabled}
          disabled={busy}
          onChange={onToggle}
        />
        {managePath ? (
          <Link to={managePath}>
            <Button type="button" variant="secondary" size="sm">
              Manage
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </Link>
        ) : null}
      </div>
    </article>
  );
}
