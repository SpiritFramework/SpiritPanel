import type { ServerDatabaseSummary } from './api';

export function remoteLabel(remote: string): string {
  if (remote === '%') return 'Anywhere';
  if (remote === 'localhost' || remote === '127.0.0.1') return 'Local only';
  return remote;
}

export function databaseEndpoint(db: ServerDatabaseSummary): string {
  return `${db.host}:${db.port}`;
}

export function databaseJdbc(db: ServerDatabaseSummary): string {
  return `jdbc:mysql://${db.host}:${db.port}/${db.database}`;
}

export function matchesDatabaseSearch(db: ServerDatabaseSummary, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [db.name, db.database, db.username, db.hostName, db.host].join(' ').toLowerCase();
  return haystack.includes(q);
}

export function buildCredentialExport(
  db: ServerDatabaseSummary,
  canViewPassword: boolean,
): string {
  const lines = [
    `Host: ${databaseEndpoint(db)}`,
    `Database: ${db.database}`,
    `Username: ${db.username}`,
    canViewPassword && db.password ? `Password: ${db.password}` : 'Password: (hidden)',
    `Remote: ${db.remote}`,
    `JDBC: ${databaseJdbc(db)}`,
  ];
  return lines.join('\n');
}
