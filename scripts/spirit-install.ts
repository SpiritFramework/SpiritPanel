#!/usr/bin/env tsx
/**
 * Spirit-Panel installer
 *
 *   ./install                                    # local dev
 *   ./install --production --api-url https://... # production
 *
 * Guides: docs/LOCAL.md (dev) · docs/PRODUCTION.md (deploy)
 */
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import {
  buildDatabaseUrl,
  ensureSpiritPanelDatabase,
  hasMariaDbService,
  hasMysqlClient,
  parseDatabaseUrl,
  testDatabaseConnection,
  type DatabaseConfig,
  type EnsureDatabaseResult,
} from './lib/database-setup.js';

// Inline — avoid importing panel-api during install before build
function isWeakAdminPassword(password: string): boolean {
  const p = password.trim();
  if (p.length < 12) return true;
  const lower = p.toLowerCase();
  if (['admin123!', 'demo123!', 'password', 'password123', 'changeme'].includes(lower)) return true;
  if (/^change_me/i.test(p) || /^your[_-]/i.test(p) || /^dev-only/i.test(p)) return true;
  return false;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ENV_PATH = path.join(ROOT, 'apps/panel-api/.env');

const DEV_DATABASE_URL = 'mysql://spirit:spirit@127.0.0.1:3306/spirit_panel';

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

interface Options {
  production: boolean;
  skipDocker: boolean;
  skipDb: boolean;
  skipBuild: boolean;
  skipDbCreate: boolean;
  databaseUrl?: string;
  apiUrl?: string;
  panelUrl?: string;
  adminPassword?: string;
  mysqlRootPassword?: string;
  dbUser?: string;
  dbName?: string;
  dbPassword?: string;
  fixDatabase: boolean;
  help: boolean;
}

interface InstallCreds {
  adminPassword: string;
  apiUrl?: string;
  databaseUrl: string;
  dbCreated: boolean;
  dbUser?: string;
  dbPassword?: string;
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    production: false,
    skipDocker: false,
    skipDb: false,
    skipBuild: false,
    skipDbCreate: false,
    fixDatabase: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--production':
      case '-p':
        opts.production = true;
        break;
      case '--dev':
      case '-d':
        opts.production = false;
        break;
      case '--skip-docker':
        opts.skipDocker = true;
        break;
      case '--skip-db':
        opts.skipDb = true;
        break;
      case '--skip-build':
        opts.skipBuild = true;
        break;
      case '--skip-db-create':
        opts.skipDbCreate = true;
        break;
      case '--database-url':
        opts.databaseUrl = argv[++i];
        break;
      case '--api-url':
        opts.apiUrl = argv[++i];
        break;
      case '--panel-url':
        opts.panelUrl = argv[++i];
        break;
      case '--admin-password':
        opts.adminPassword = argv[++i];
        break;
      case '--mysql-root-password':
        opts.mysqlRootPassword = argv[++i];
        break;
      case '--db-user':
        opts.dbUser = argv[++i];
        break;
      case '--db-name':
        opts.dbName = argv[++i];
        break;
      case '--db-password':
        opts.dbPassword = argv[++i];
        break;
      case '--fix-database':
        opts.fixDatabase = true;
        break;
      case '--help':
      case '-h':
        opts.help = true;
        break;
      default:
        if (arg.startsWith('-')) {
          fail(`Unknown option: ${arg}\nRun: pnpm spirit-install --help`);
        }
    }
  }

  return opts;
}

function printHelp() {
  console.log(`
${c.bold}Spirit-Panel Install${c.reset}

  ${c.dim}Local dev${c.reset}       ./install
  ${c.dim}Production${c.reset}      ./install --production --api-url https://panel.example.com
  ${c.dim}Local guide${c.reset}    docs/LOCAL.md
  ${c.dim}Production${c.reset}     docs/PRODUCTION.md

Options:
  --production, -p       Production (HTTPS, strong secrets, build)
  --dev, -d              Development (default)
  --api-url URL          Public panel URL — required for production (or prompted)
  --mysql-root-password  MariaDB root password if needed
  --admin-password PASS  Admin login (auto-generated in production if omitted)
  --database-url URL     Use existing MySQL database
  --fix-database         Re-create DB user from .env
  --skip-docker          Don't start Docker (dev)
  --skip-db              Skip migrations and seed
  --skip-build           Skip pnpm build
  --help, -h             Show this help
`);
}

let step = 0;
function stepLog(title: string, detail?: string) {
  step += 1;
  log(`[${step}] ${title}`, detail);
}

function log(step: string, detail?: string) {
  const msg = detail
    ? `${c.cyan}==>${c.reset} ${step} ${c.dim}${detail}${c.reset}`
    : `${c.cyan}==>${c.reset} ${step}`;
  console.log(msg);
}

function ok(message: string) {
  console.log(`    ${c.green}✓${c.reset} ${message}`);
}

function warn(message: string) {
  console.log(`    ${c.yellow}!${c.reset} ${message}`);
}

function fail(message: string): never {
  console.error(`\n${c.red}Error:${c.reset} ${message}\n`);
  process.exit(1);
}

function run(cmd: string, args: string[], opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  const result = spawnSync(cmd, args, {
    cwd: opts.cwd ?? ROOT,
    env: opts.env ? { ...process.env, ...opts.env } : process.env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    fail(`Command failed: ${cmd} ${args.join(' ')}`);
  }
}

function runSoft(cmd: string, args: string[], opts: { cwd?: string } = {}): boolean {
  const result = spawnSync(cmd, args, {
    cwd: opts.cwd ?? ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  return result.status === 0;
}

function checkPrerequisites() {
  stepLog('Checking prerequisites');
  const nodeMajor = Number(process.version.slice(1).split('.')[0]);
  if (nodeMajor < 20) {
    fail(`Node.js 20+ required (found ${process.version})`);
  }
  ok(`Node.js ${process.version}`);

  if (!runSoft('pnpm', ['--version'])) {
    fail('pnpm is required. Install: npm install -g pnpm');
  }
}

function secret(bytes: number): string {
  return crypto.randomBytes(bytes).toString('base64');
}

/** Quote .env values that contain spaces or shell-special characters. */
function formatEnvValue(value: string): string {
  if (/^[A-Za-z0-9_./:@+-]+$/.test(value)) {
    return value;
  }
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function setEnvLine(content: string, key: string, value: string): string {
  const line = `${key}=${formatEnvValue(value)}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  if (pattern.test(content)) {
    return content.replace(pattern, line);
  }
  return `${content.trimEnd()}\n${line}\n`;
}

function readDatabaseUrlFromEnvFile(): string | undefined {
  if (!fs.existsSync(ENV_PATH)) return undefined;
  const content = fs.readFileSync(ENV_PATH, 'utf8');
  const match = content.match(/^DATABASE_URL="([^"]+)"/m);
  return match?.[1];
}

function hasDocker(): boolean {
  return runSoft('docker', ['--version']);
}

async function waitForMariaDb(maxSeconds = 90): Promise<boolean> {
  const deadline = Date.now() + maxSeconds * 1000;
  while (Date.now() < deadline) {
    const result = spawnSync('docker', ['compose', 'ps', 'mariadb'], {
      cwd: ROOT,
      encoding: 'utf8',
      shell: process.platform === 'win32',
    });
    if (result.stdout?.includes('healthy')) {
      return true;
    }
    await sleep(2000);
  }
  return false;
}

async function startDockerServices(services: string[]) {
  if (!hasDocker()) {
    return false;
  }
  stepLog('Starting Docker', services.join(', '));
  run('docker', ['compose', 'up', '-d', ...services]);
  if (services.includes('mariadb')) {
    if (await waitForMariaDb()) {
      ok('MariaDB container is healthy');
    } else {
      warn('MariaDB container health check timed out');
    }
  }
  return true;
}

async function prepareDatabase(opts: Options): Promise<EnsureDatabaseResult & { source: string }> {
  stepLog('Setting up database');

  if (opts.skipDbCreate && opts.databaseUrl) {
    const result = ensureSpiritPanelDatabase({
      databaseUrl: opts.databaseUrl,
      skipCreate: true,
    });
    ok(`Connected to ${result.config.database}`);
    return { ...result, source: 'existing' };
  }

  if (opts.databaseUrl) {
    try {
      const result = ensureSpiritPanelDatabase({
        databaseUrl: opts.databaseUrl,
        rootPassword: opts.mysqlRootPassword,
        skipCreate: false,
      });
      ok(result.created ? `Created database ${result.config.database}` : `Using ${result.config.database}`);
      return { ...result, source: 'provided-url' };
    } catch (err) {
      fail(err instanceof Error ? err.message : String(err));
    }
  }

  if (!opts.production) {
    const url = readDatabaseUrlFromEnvFile() ?? DEV_DATABASE_URL;
    if (testDatabaseConnection(parseDatabaseUrl(url))) {
      ok(`Development database ready (${parseDatabaseUrl(url).database})`);
      return {
        config: parseDatabaseUrl(url),
        databaseUrl: url,
        created: false,
        source: 'docker-dev',
      };
    }
    fail(
      'Development database not reachable.\n' +
        '  Run without --skip-docker to start MariaDB via Docker, or set DATABASE_URL in apps/panel-api/.env',
    );
  }

  // Production: use or repair .env DATABASE_URL
  const existingUrl = opts.databaseUrl ?? readDatabaseUrlFromEnvFile();
  if (existingUrl && !/CHANGE_ME/i.test(existingUrl)) {
    let cfg: DatabaseConfig;
    try {
      cfg = parseDatabaseUrl(existingUrl);
    } catch (err) {
      fail(err instanceof Error ? err.message : String(err));
    }

    const connected = testDatabaseConnection(cfg);
    if (connected && !opts.fixDatabase) {
      ok(`Database "${cfg.database}" connected as ${cfg.user}`);
      return {
        config: cfg,
        databaseUrl: existingUrl,
        created: false,
        source: 'env-file',
      };
    }

    if (!connected) {
      warn(`Cannot connect as '${cfg.user}'@localhost — provisioning database (sudo mysql)`);
    } else {
      warn('Re-provisioning database (--fix-database)');
    }

    try {
      const result = ensureSpiritPanelDatabase({
        databaseUrl: existingUrl,
        rootPassword: opts.mysqlRootPassword,
      });
      ok(
        result.created
          ? `Created database "${result.config.database}" and user "${result.config.user}"`
          : `Database "${result.config.database}" ready`,
      );
      return { ...result, source: 'repaired' };
    } catch (err) {
      fail(err instanceof Error ? err.message : String(err));
    }
  }

  // No DATABASE_URL yet — auto-create
  if (!opts.skipDocker && !hasMariaDbService() && hasDocker()) {
    warn('Local MariaDB not running — starting Docker MariaDB for production');
    await startDockerServices(['mariadb', 'redis']);
    const dockerUrl = DEV_DATABASE_URL;
    ok(`Using Docker database (${parseDatabaseUrl(dockerUrl).database})`);
    return {
      config: parseDatabaseUrl(dockerUrl),
      databaseUrl: dockerUrl,
      created: true,
      source: 'docker-prod',
    };
  }

  if (!hasMysqlClient() && !hasMariaDbService()) {
    fail(
      'MariaDB/MySQL not found on this server.\n' +
        '  Ubuntu: sudo apt install -y mariadb-server\n' +
        '  Or install Docker and re-run without --skip-docker',
    );
  }

  try {
    const result = ensureSpiritPanelDatabase({
      user: opts.dbUser,
      password: opts.dbPassword,
      database: opts.dbName,
      rootPassword: opts.mysqlRootPassword,
    });
    if (result.created) {
      ok(`Created database "${result.config.database}" and user "${result.config.user}"`);
    } else {
      ok(`Using existing database "${result.config.database}"`);
    }
    return { ...result, source: 'auto-provision' };
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }
}

function writeEnvFile(content: string) {
  fs.mkdirSync(path.dirname(ENV_PATH), { recursive: true });
  fs.writeFileSync(ENV_PATH, content, { mode: 0o600 });
}

function setupDevEnv(databaseUrl: string) {
  if (fs.existsSync(ENV_PATH)) {
    ok('apps/panel-api/.env already exists');
    return;
  }
  const template = path.join(ROOT, '.env.example');
  if (!fs.existsSync(template)) {
    fail('Missing .env.example');
  }
  let content = fs.readFileSync(template, 'utf8');
  content = content.replace(/^DATABASE_URL="[^"]*"/m, `DATABASE_URL="${databaseUrl}"`);
  writeEnvFile(content);
  ok('Created apps/panel-api/.env (development)');
}

function updateEnvDatabaseUrl(databaseUrl: string) {
  if (!fs.existsSync(ENV_PATH)) return;
  let content = fs.readFileSync(ENV_PATH, 'utf8');
  if (content.match(/^DATABASE_URL="/m)) {
    content = content.replace(/^DATABASE_URL="[^"]*"/m, `DATABASE_URL="${databaseUrl}"`);
  } else if (content.match(/^DATABASE_URL=/m)) {
    content = content.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${databaseUrl}"`);
  } else {
    content = `DATABASE_URL="${databaseUrl}"\n` + content;
  }
  writeEnvFile(content);
}

function setupProductionEnv(
  opts: Options,
  databaseUrl: string,
): { adminPassword: string; apiUrl: string } {
  const apiUrl = (opts.apiUrl ?? process.env.API_URL)?.replace(/\/$/, '');
  if (!apiUrl) {
    fail(
      'Production install needs your public panel URL.\n' +
        '  Pass: --api-url https://panel.spirithost.co.uk',
    );
  }
  if (!apiUrl.startsWith('https://')) {
    fail('Production --api-url must use HTTPS');
  }

  const panelUrl = (opts.panelUrl ?? process.env.PANEL_URL ?? apiUrl).replace(/\/$/, '');

  let adminPassword =
    opts.adminPassword ?? process.env.ADMIN_PASSWORD;

  if (fs.existsSync(ENV_PATH)) {
    const existing = fs.readFileSync(ENV_PATH, 'utf8');
    const adminMatch = existing.match(/^ADMIN_PASSWORD=(.+)$/m);
    if (!adminPassword && adminMatch) {
      adminPassword = adminMatch[1].replace(/^"|"$/g, '');
    }
  }

  if (!adminPassword || isWeakAdminPassword(adminPassword)) {
    if (opts.adminPassword && !isWeakAdminPassword(opts.adminPassword)) {
      adminPassword = opts.adminPassword;
    } else {
      adminPassword = secret(18);
      warn('ADMIN_PASSWORD missing or weak — generated a new admin password (saved to .env)');
    }
  }

  if (fs.existsSync(ENV_PATH)) {
    ok('apps/panel-api/.env already exists — syncing DATABASE_URL and API_URL');
    let content = fs.readFileSync(ENV_PATH, 'utf8');
    if (!content.includes('DATABASE_URL=')) {
      content = `DATABASE_URL="${databaseUrl}"\n` + content;
    } else {
      content = content.replace(/^DATABASE_URL="[^"]*"/m, `DATABASE_URL="${databaseUrl}"`);
      content = content.replace(/^DATABASE_URL=(.+)$/m, `DATABASE_URL="${databaseUrl}"`);
    }
    if (opts.apiUrl) {
      content = content.replace(/^API_URL="[^"]*"/m, `API_URL="${apiUrl}"`);
      content = content.replace(/^PANEL_URL="[^"]*"/m, `PANEL_URL="${panelUrl}"`);
    }
    content = setEnvLine(content, 'ADMIN_PASSWORD', adminPassword);
    writeEnvFile(content);
    return { adminPassword, apiUrl };
  }

  const templatePath = path.join(ROOT, 'deploy/env/production.example');
  if (!fs.existsSync(templatePath)) {
    fail('Missing deploy/env/production.example');
  }

  let content = fs.readFileSync(templatePath, 'utf8');
  content = content
    .replace(/JWT_SECRET="[^"]*"/, `JWT_SECRET="${secret(48)}"`)
    .replace(/APP_KEY="[^"]*"/, `APP_KEY="${secret(32)}"`)
    .replace(/DATABASE_URL="[^"]*"/, `DATABASE_URL="${databaseUrl}"`)
    .replace(/^API_URL="[^"]*"/m, `API_URL="${apiUrl}"`)
    .replace(/^PANEL_URL="[^"]*"/m, `PANEL_URL="${panelUrl}"`)
    .replace(/^ADMIN_PASSWORD=.*$/m, `ADMIN_PASSWORD=${formatEnvValue(adminPassword)}`);

  writeEnvFile(content);
  ok('Created apps/panel-api/.env with generated secrets');
  return { adminPassword, apiUrl };
}

function installDependencies() {
  stepLog('Installing dependencies');
  run('pnpm', ['install']);
  ok('Dependencies installed');
}

function buildPackages() {
  stepLog('Building shared packages');
  run('pnpm', ['--filter', '@spirit/shared-types', 'build']);
  run('pnpm', ['--filter', '@spirit/shared', 'build']);
  ok('Shared packages built');
}

function setupDatabaseSchema(production: boolean) {
  stepLog('Applying database schema + seed');

  const url = readDatabaseUrlFromEnvFile();
  if (url) {
    const cfg = parseDatabaseUrl(url);
    if (!testDatabaseConnection(cfg)) {
      fail(
        `Database connection failed before migrate.\n` +
          `  User: ${cfg.user}  Database: ${cfg.database}\n\n` +
          `Fix:\n` +
          `  sudo mysql < deploy/mysql/.install-bootstrap.sql\n` +
          `  (re-run spirit-install first to generate that file, or use --fix-database)\n` +
          `  Or: pnpm spirit-install --production --api-url YOUR_URL --fix-database`,
      );
    }
    ok('Database connection verified');
  }

  run('pnpm', ['db:generate']);

  const apiDir = path.join(ROOT, 'apps/panel-api');
  const deployOk = runSoft('pnpm', ['db:deploy'], { cwd: apiDir });
  if (!deployOk) {
    warn('migrate deploy failed, trying db:push');
    run('pnpm', ['db:push'], { cwd: apiDir });
    ok('Schema applied via db:push');
    runSoft('pnpm', ['exec', 'prisma', 'migrate', 'resolve', '--applied', '20250605000000_init'], {
      cwd: apiDir,
    });
  } else {
    ok('Tables created');
  }

  run('pnpm', ['db:seed'], {
    cwd: path.join(ROOT, 'apps/panel-api'),
    env: { NODE_ENV: production ? 'production' : 'development' },
  });
  ok('Admin user and panel settings seeded');
}

function buildApps() {
  stepLog('Building applications');
  run('pnpm', ['build']);
  ok('Build complete');
}

function verifyProduction() {
  stepLog('Verifying production config');
  if (runSoft('pnpm', ['verify:prod'])) {
    ok('Production checks passed');
  } else {
    warn('verify:prod failed — review apps/panel-api/.env before going live');
  }
}

function readAdminEmail(): string {
  if (!fs.existsSync(ENV_PATH)) return 'admin@spirithost.co.uk';
  const content = fs.readFileSync(ENV_PATH, 'utf8');
  const match = content.match(/^ADMIN_EMAIL=(.+)$/m);
  return match?.[1]?.replace(/^"|"$/g, '') ?? 'admin@spirithost.co.uk';
}

function printSummary(creds: InstallCreds) {
  const adminEmail = readAdminEmail();

  console.log('');
  console.log(`${c.green}${c.bold}Spirit-Panel install complete!${c.reset}`);
  console.log('');

  const showDbCreds =
    creds.dbUser &&
    creds.dbPassword &&
    (creds.dbCreated || creds.databaseUrl.includes('spirit:spirit@'));

  if (showDbCreds) {
    console.log(`  ${c.bold}Database${c.reset} (save these):`);
    console.log(`    URL:      ${c.dim}${creds.databaseUrl}${c.reset}`);
    console.log(`    User:     ${creds.dbUser}`);
    console.log(`    Password: ${creds.dbPassword}`);
    console.log('');
  } else if (creds.apiUrl) {
    console.log(`  Database:   ${c.dim}${creds.databaseUrl}${c.reset}`);
    console.log('');
  }

  if (creds.apiUrl) {
    console.log(`  ${c.bold}Next steps${c.reset} — see docs/PRODUCTION.md for details:`);
    console.log('');
    console.log('    1. sudo cp deploy/systemd/spirit-panel-api.service /etc/systemd/system/');
    console.log('    2. sudo cp deploy/nginx/spirit-panel.conf /etc/nginx/sites-available/spirit-panel');
    console.log('    3. Edit nginx config (server_name, root path) + enable site');
    console.log('    4. sudo certbot --nginx -d YOUR_DOMAIN');
    console.log('    5. sudo systemctl enable --now spirit-panel-api');
    console.log('    6. Admin → Nodes → add FeatherWings game node');
    console.log('');
    console.log(`  ${c.bold}Panel URL${c.reset}   ${creds.apiUrl}`);
    console.log(`  ${c.bold}Admin login${c.reset} ${adminEmail}`);
    console.log(`  ${c.bold}Password${c.reset}    ${creds.adminPassword}`);
    console.log('');
    console.log(`  ${c.yellow}Save these credentials now.${c.reset}`);
  } else {
    console.log('  Start developing:');
    console.log('    pnpm dev');
    console.log('');
    console.log('  URLs:');
    console.log('    Web    http://localhost:5173');
    console.log('    API    http://localhost:3000/health');
    console.log('');
    console.log(`  Login:  ${adminEmail} / admin123!`);
    console.log('');
    console.log('  Production deploy: see docs/PRODUCTION.md');
  }
  console.log('');
}

async function promptApiUrl(): Promise<string> {
  const rl = readline.createInterface({ input, output });
  try {
    console.log('');
    console.log(`  ${c.dim}Production needs your public HTTPS panel URL.${c.reset}`);
    console.log(`  ${c.dim}FeatherWings uses this as remote: in config.yml${c.reset}`);
    console.log('');
    const answer = await rl.question('  Panel URL (e.g. https://panel.example.com): ');
    const url = answer.trim().replace(/\/$/, '');
    if (!url.startsWith('https://')) {
      fail('Production URL must start with https://');
    }
    return url;
  } finally {
    rl.close();
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  if (opts.production && !opts.apiUrl) {
    opts.apiUrl = await promptApiUrl();
  }

  console.log('');
  console.log(`${c.bold}Spirit-Panel${c.reset} ${c.dim}· ${opts.production ? 'production install' : 'development setup'}${c.reset}`);
  console.log('');

  checkPrerequisites();

  if (!opts.skipDocker && !opts.production) {
    await startDockerServices(['mariadb', 'redis']);
  } else if (!opts.skipDocker && opts.production && hasDocker() && !hasMariaDbService()) {
    await startDockerServices(['redis']);
  }

  let dbResult: EnsureDatabaseResult & { source: string };
  if (!opts.skipDb) {
    dbResult = await prepareDatabase(opts);
  } else {
    const url = opts.databaseUrl ?? readDatabaseUrlFromEnvFile() ?? DEV_DATABASE_URL;
    dbResult = {
      config: parseDatabaseUrl(url),
      databaseUrl: url,
      created: false,
      source: 'skipped',
    };
  }

  let adminPassword: string;
  let apiUrl: string | undefined;

  if (opts.production) {
    stepLog('Writing production environment');
    const env = setupProductionEnv(opts, dbResult.databaseUrl);
    adminPassword = env.adminPassword;
    apiUrl = env.apiUrl;
  } else {
    stepLog('Writing development environment');
    setupDevEnv(dbResult.databaseUrl);
    adminPassword = 'admin123!';
  }

  updateEnvDatabaseUrl(dbResult.databaseUrl);

  installDependencies();
  buildPackages();

  if (!opts.skipDb) {
    setupDatabaseSchema(opts.production);
  }

  if (!opts.skipBuild) {
    buildApps();
  }

  if (opts.production && !opts.skipBuild) {
    verifyProduction();
  }

  printSummary({
    adminPassword,
    apiUrl,
    databaseUrl: dbResult.databaseUrl,
    dbCreated: dbResult.created,
    dbUser: dbResult.config.user,
    dbPassword: dbResult.config.password,
  });
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
