import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export interface DatabaseConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  database: string;
}

export interface EnsureDatabaseOptions {
  /** Full mysql:// URL — if set, only verifies connectivity (unless create: true). */
  databaseUrl?: string;
  user?: string;
  password?: string;
  host?: string;
  port?: number;
  database?: string;
  rootPassword?: string;
  skipCreate?: boolean;
}

export interface EnsureDatabaseResult {
  config: DatabaseConfig;
  databaseUrl: string;
  created: boolean;
}

export function parseDatabaseUrl(url: string): DatabaseConfig {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid DATABASE_URL: ${url}`);
  }
  if (parsed.protocol !== 'mysql:') {
    throw new Error('DATABASE_URL must use mysql:// scheme');
  }
  const database = parsed.pathname.replace(/^\//, '');
  if (!database) {
    throw new Error('DATABASE_URL must include a database name');
  }
  return {
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    host: parsed.hostname || '127.0.0.1',
    port: parsed.port ? Number(parsed.port) : 3306,
    database,
  };
}

export function buildDatabaseUrl(config: DatabaseConfig): string {
  const user = encodeURIComponent(config.user);
  const password = encodeURIComponent(config.password);
  return `mysql://${user}:${password}@${config.host}:${config.port}/${config.database}`;
}

function sqlEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "''");
}

function runMysql(args: string[], input?: string): { ok: boolean; stderr: string } {
  const result = spawnSync('mysql', args, {
    encoding: 'utf8',
    input,
    shell: process.platform === 'win32',
  });
  return {
    ok: result.status === 0,
    stderr: (result.stderr ?? result.stdout ?? '').trim(),
  };
}

function runMysqlWithInput(args: string[], input: string): { ok: boolean; stderr: string } {
  const result = spawnSync('mysql', args, {
    encoding: 'utf8',
    input,
    shell: false,
  });
  const stderr = (result.stderr ?? '').trim();
  const stdout = (result.stdout ?? '').trim();
  return {
    ok: result.status === 0,
    stderr: stderr || stdout,
  };
}

function runSudoMysql(input: string): { ok: boolean; stderr: string } {
  const result = spawnSync('sudo', ['-n', 'mysql'], {
    encoding: 'utf8',
    input,
    shell: false,
  });
  if (result.status === 0) {
    return { ok: true, stderr: '' };
  }
  const stderr = (result.stderr ?? result.stdout ?? '').trim();
  if (/password is required|a password is required|interactive authentication/i.test(stderr)) {
    return {
      ok: false,
      stderr:
        'sudo requires a password for mysql. Run: sudo mysql < deploy/mysql/init.sql\n' +
        '  Or pass --mysql-root-password and ensure mariadb-server is installed.',
    };
  }
  // Retry without -n (may prompt if tty)
  const retry = spawnSync('sudo', ['mysql'], {
    encoding: 'utf8',
    input,
    shell: false,
  });
  return {
    ok: retry.status === 0,
    stderr: (retry.stderr ?? retry.stdout ?? stderr).trim(),
  };
}

function runMariadbAdmin(input: string, rootPassword?: string): { ok: boolean; stderr: string } {
  if (process.platform === 'win32') {
    return { ok: false, stderr: 'not supported on Windows' };
  }

  const attempts: Array<() => { ok: boolean; stderr: string }> = [];

  if (!rootPassword) {
    attempts.push(() => runSudoMysql(input));
    attempts.push(() => runMysqlWithInput(['-u', 'root'], input));
    attempts.push(() => runMysqlWithInput(['-u', 'root', '-h', '127.0.0.1'], input));
  }

  if (rootPassword) {
    attempts.push(() => runMysqlWithInput(['-u', 'root', `-p${rootPassword}`], input));
    attempts.push(() => runMysqlWithInput(['-u', 'root', `-p${rootPassword}`, '-h', '127.0.0.1'], input));
  }

  if (process.env.MYSQL_ROOT_PASSWORD) {
    const pwd = process.env.MYSQL_ROOT_PASSWORD;
    attempts.push(() => runMysqlWithInput(['-u', 'root', `-p${pwd}`], input));
  }

  let lastErr = 'Could not connect as MySQL/MariaDB root';
  for (const attempt of attempts) {
    const result = attempt();
    if (result.ok) return result;
    if (result.stderr) lastErr = result.stderr;
  }

  return { ok: false, stderr: lastErr };
}

export function testDatabaseConnection(config: DatabaseConfig): boolean {
  const args = [
    '-h',
    config.host,
    '-P',
    String(config.port),
    '-u',
    config.user,
    `-p${config.password}`,
    config.database,
    '-e',
    'SELECT 1',
  ];
  return runMysql(args).ok;
}

function createDatabaseSql(config: DatabaseConfig): string {
  const pwd = sqlEscape(config.password);
  return `
CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${config.user}'@'localhost' IDENTIFIED BY '${pwd}';
CREATE USER IF NOT EXISTS '${config.user}'@'127.0.0.1' IDENTIFIED BY '${pwd}';
ALTER USER '${config.user}'@'localhost' IDENTIFIED BY '${pwd}';
ALTER USER '${config.user}'@'127.0.0.1' IDENTIFIED BY '${pwd}';
GRANT ALL PRIVILEGES ON \`${config.database}\`.* TO '${config.user}'@'localhost';
GRANT ALL PRIVILEGES ON \`${config.database}\`.* TO '${config.user}'@'127.0.0.1';
FLUSH PRIVILEGES;
`.trim();
}

export function generateDbPassword(): string {
  return crypto.randomBytes(18).toString('base64url');
}

export function ensureSpiritPanelDatabase(opts: EnsureDatabaseOptions = {}): EnsureDatabaseResult {
  let config: DatabaseConfig;

  if (opts.databaseUrl) {
    config = parseDatabaseUrl(opts.databaseUrl);
    if (opts.skipCreate) {
      if (!testDatabaseConnection(config)) {
        throw new Error(
          `Cannot connect to database ${config.database} as ${config.user}@${config.host}. Check DATABASE_URL.`,
        );
      }
      return { config, databaseUrl: buildDatabaseUrl(config), created: false };
    }
  } else {
    config = {
      user: opts.user ?? 'spirit_panel',
      password: opts.password ?? generateDbPassword(),
      host: opts.host ?? '127.0.0.1',
      port: opts.port ?? 3306,
      database: opts.database ?? 'spirit_panel',
    };
  }

  if (testDatabaseConnection(config)) {
    return { config, databaseUrl: buildDatabaseUrl(config), created: false };
  }

  if (opts.skipCreate) {
    throw new Error(
      `Database ${config.database} is not reachable. Create it manually (see deploy/mysql/init.sql) or re-run without --skip-db-create.`,
    );
  }

  const sql = createDatabaseSql(config);
  const result = runMariadbAdmin(sql, opts.rootPassword);
  if (!result.ok) {
    const bootstrapPath = writeBootstrapSql(config, process.cwd());
    throw new Error(
      `Failed to create database automatically.\n` +
        `  ${result.stderr}\n\n` +
        `Manual fix (run on the server as a user with sudo):\n` +
        `  sudo mysql < ${bootstrapPath}\n` +
        `  pnpm spirit-install --production --api-url YOUR_URL\n\n` +
        `The bootstrap SQL uses the password from your DATABASE_URL / .env.`,
    );
  }

  if (!testDatabaseConnection(config)) {
    throw new Error(
      'Database was created but connection test failed.\n' +
        '  Check the password in DATABASE_URL matches what MariaDB expects.\n' +
        `  User: ${config.user}  Database: ${config.database}`,
    );
  }

  return { config, databaseUrl: buildDatabaseUrl(config), created: true };
}

/** Write SQL bootstrap matching DATABASE_URL credentials (for manual sudo mysql). */
export function writeBootstrapSql(config: DatabaseConfig, rootDir: string): string {
  const sqlPath = path.join(rootDir, 'deploy/mysql/.install-bootstrap.sql');
  fs.mkdirSync(path.dirname(sqlPath), { recursive: true });
  fs.writeFileSync(sqlPath, createDatabaseSql(config) + '\n', { mode: 0o600 });
  return sqlPath;
}

export function hasMysqlClient(): boolean {
  const result = spawnSync('mysql', ['--version'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  return result.status === 0;
}

export function hasMariaDbService(): boolean {
  if (process.platform === 'win32') return false;
  const result = spawnSync('systemctl', ['is-active', 'mariadb'], { encoding: 'utf8' });
  if (result.stdout?.trim() === 'active') return true;
  const mysql = spawnSync('systemctl', ['is-active', 'mysql'], { encoding: 'utf8' });
  return mysql.stdout?.trim() === 'active';
}
