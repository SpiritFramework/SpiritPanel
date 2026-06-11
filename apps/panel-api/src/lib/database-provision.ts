import { randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';
import { decryptSecret } from './secret-crypto.js';

export interface DatabaseHostConnection {
  host: string;
  port: number;
  username: string;
  password: string;
}

export function generateDatabaseName(serverUuidShort: string): string {
  const suffix = randomBytes(4).toString('hex');
  return `s${serverUuidShort}_${suffix}`.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 48);
}

export function generateDatabaseUsername(serverUuidShort: string): string {
  const suffix = randomBytes(4).toString('hex');
  return `u${serverUuidShort}_${suffix}`.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 32);
}

export function generateDatabasePassword(): string {
  return randomBytes(24).toString('base64url').slice(0, 32);
}

function escapeIdentifier(value: string): string {
  return value.replace(/`/g, '``');
}

function escapeUserHost(username: string, host: string): { user: string; host: string } {
  const safeUser = username.replace(/'/g, "''");
  const safeHost = host.replace(/'/g, "''");
  return { user: safeUser, host: safeHost };
}

export async function testDatabaseHostConnection(host: DatabaseHostConnection): Promise<void> {
  let conn: mysql.Connection | undefined;
  try {
    conn = await mysql.createConnection({
      host: host.host,
      port: host.port,
      user: host.username,
      password: host.password,
      connectTimeout: 8000,
    });
    await conn.ping();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(msg)) {
      throw new Error(
        `Cannot reach MySQL at ${host.host}:${host.port}. The panel connects from its own server — use an address reachable from the panel (often this node's FQDN), not 127.0.0.1 unless MySQL runs on the panel machine.`,
      );
    }
    if (/access denied/i.test(msg)) {
      throw new Error(
        `Access denied for '${host.username}'. Check the password and that this user may connect from the panel server's IP.`,
      );
    }
    throw new Error(msg);
  } finally {
    await conn?.end();
  }
}

export async function provisionServerDatabase(
  host: DatabaseHostConnection,
  database: string,
  username: string,
  password: string,
  remote: string,
): Promise<void> {
  const conn = await mysql.createConnection({
    host: host.host,
    port: host.port,
    user: host.username,
    password: host.password,
    multipleStatements: false,
    connectTimeout: 10000,
  });

  const dbId = escapeIdentifier(database);
  const { user, host: remoteHost } = escapeUserHost(username, remote);

  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbId}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`CREATE USER IF NOT EXISTS '${user}'@'${remoteHost}' IDENTIFIED BY ?`, [password]);
    await conn.query(`GRANT ALL PRIVILEGES ON \`${dbId}\`.* TO '${user}'@'${remoteHost}'`);
    await conn.query('FLUSH PRIVILEGES');
  } finally {
    await conn.end();
  }
}

export async function deprovisionServerDatabase(
  host: DatabaseHostConnection,
  database: string,
  username: string,
  remote: string,
): Promise<void> {
  const conn = await mysql.createConnection({
    host: host.host,
    port: host.port,
    user: host.username,
    password: host.password,
    multipleStatements: false,
    connectTimeout: 10000,
  });

  const dbId = escapeIdentifier(database);
  const { user, host: remoteHost } = escapeUserHost(username, remote);

  try {
    await conn.query(`DROP DATABASE IF EXISTS \`${dbId}\``);
    await conn.query(`DROP USER IF EXISTS '${user}'@'${remoteHost}'`);
    await conn.query('FLUSH PRIVILEGES');
  } finally {
    await conn.end();
  }
}

export function hostFromRecord(record: {
  host: string;
  port: number;
  username: string;
  password: string;
}): DatabaseHostConnection {
  return {
    host: record.host,
    port: record.port,
    username: record.username,
    password: decryptSecret(record.password),
  };
}
