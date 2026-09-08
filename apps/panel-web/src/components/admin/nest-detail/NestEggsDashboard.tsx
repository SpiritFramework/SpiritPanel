import { Link } from 'react-router-dom';
import { ChevronRight, Egg, Server, Upload, Variable } from 'lucide-react';
import { Button } from '../../Layout';
import { EmptyState } from '../../ui';
import { ServerEggIcon } from '../../ServerEggIcon';
import { getServerTheme } from '../../../lib/server-theme';
import { NestDetailPanel } from './NestDetailShell';
import type { NestDetailController } from '../../../pages/admin/nest-detail/useNestDetail';

export function NestEggsDashboard({
  ctrl,
  fullAdmin,
  onImport,
}: {
  ctrl: NestDetailController;
  fullAdmin: boolean;
  onImport: () => void;
}) {
  const { detail } = ctrl;
  if (!detail) return null;

  return (
    <div className="ds-nst-eggs">
      <NestDetailPanel
        icon={Egg}
        title={`Eggs in ${detail.name}`}
        description="Service templates in this nest"
        badge={String(detail.eggs.length)}
      >
        {detail.eggs.length === 0 ? (
          <div className="ds-nst-eggs-empty">
            <EmptyState
              title="No eggs"
              description="Import a PTDL_v2 JSON egg into this nest."
            />
            {fullAdmin ? (
              <div className="flex justify-center">
                <Button type="button" onClick={onImport}>
                  <Upload className="h-3.5 w-3.5" aria-hidden />
                  Import egg
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <ul className="ds-nst-egg-list">
            {detail.eggs.map((egg) => {
              const theme = getServerTheme(egg.name);
              return (
                <li key={egg.id}>
                  <Link to={`/admin/eggs/${egg.id}`} className="ds-nst-egg-list-row">
                    <span
                      className="ds-nst-egg-list-icon"
                      style={{ background: theme.gradient }}
                      aria-hidden
                    >
                      <ServerEggIcon eggName={egg.name} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="ds-nst-egg-list-name truncate">{egg.name}</p>
                      <p className="ds-nst-egg-list-meta truncate">{egg.author}</p>
                    </div>
                    <div className="ds-nst-egg-list-chips">
                      <span className="ds-nst-egg-list-chip">
                        <Variable className="h-3 w-3" aria-hidden />
                        {egg.variableCount}
                      </span>
                      <span className="ds-nst-egg-list-chip">
                        <Server className="h-3 w-3" aria-hidden />
                        {egg.serverCount}
                      </span>
                    </div>
                    <span
                      className={`ds-nst-egg-list-status${egg.enabled ? ' ds-nst-egg-list-status--on' : ''}`}
                    >
                      {egg.enabled ? 'Active' : 'Disabled'}
                    </span>
                    <ChevronRight className="ds-nst-egg-list-chevron" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </NestDetailPanel>
    </div>
  );
}
