import { KeyRound, Link2 } from 'lucide-react';
import type { ServerDatabaseSummary } from '../../../lib/api';
import { databaseEndpoint } from '../../../lib/database-utils';

export function DatabasesConnectPanel({ database, count }: { database: ServerDatabaseSummary; count: number }) {
  return (
    <section className="ds-srv-db-connect">
      <div className="ds-srv-db-connect-header">
        <Link2 className="h-4 w-4" aria-hidden />
        <div>
          <h3 className="ds-srv-db-connect-title">Connect from your server</h3>
          <p className="ds-srv-db-connect-meta">Use these credentials in plugin configs — reachable from your game container</p>
        </div>
      </div>
      <div className="ds-srv-db-connect-grid">
        <div className="ds-srv-db-connect-card">
          <span className="ds-srv-db-connect-card-icon ds-srv-db-connect-card-icon--endpoint" aria-hidden>
            <Link2 className="h-4 w-4" />
          </span>
          <p className="ds-srv-db-connect-card-label">MySQL endpoint</p>
          <p className="ds-srv-db-connect-card-value">{databaseEndpoint(database)}</p>
          <p className="ds-srv-db-connect-card-hint">{database.hostName}</p>
        </div>
        <div className="ds-srv-db-connect-card">
          <span className="ds-srv-db-connect-card-icon ds-srv-db-connect-card-icon--auth" aria-hidden>
            <KeyRound className="h-4 w-4" />
          </span>
          <p className="ds-srv-db-connect-card-label">Authentication</p>
          <p className="ds-srv-db-connect-card-value">Username + password per database</p>
          <p className="ds-srv-db-connect-card-hint">
            {count} database{count === 1 ? '' : 's'} provisioned — expand a card below for full credentials
          </p>
        </div>
      </div>
    </section>
  );
}
