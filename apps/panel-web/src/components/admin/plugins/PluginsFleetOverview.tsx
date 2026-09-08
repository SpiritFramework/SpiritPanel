import { PLUGIN_ECOSYSTEM } from './plugin-fleet-utils';

export function PluginsFleetOverview() {
  return (
    <section className="ds-plg-overview" aria-label="Plugin ecosystem">
      <div className="ds-plg-overview-head">
        <div>
          <p className="ds-plg-overview-label">How plugins work</p>
          <p className="ds-plg-overview-sub">
            Built-in extensions add server-side tabs and install flows — toggle them here, then open Manage
            for catalogs and fine-grained settings.
          </p>
        </div>
      </div>

      <ul className="ds-plg-eco-grid">
        {PLUGIN_ECOSYSTEM.map((item) => (
          <li key={item.title} className="ds-plg-eco-card">
            <span className="ds-plg-eco-icon" aria-hidden>
              <item.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="ds-plg-eco-title">{item.title}</p>
              <p className="ds-plg-eco-body">{item.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
