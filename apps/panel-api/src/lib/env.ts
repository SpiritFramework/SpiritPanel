import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertProductionSecrets } from './secret-validation.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from panel-api root (works for src/ and dist/)
config({ path: resolve(__dirname, '../../.env') });

export interface AppConfig {
  nodeEnv: string;
  isProduction: boolean;
  port: number;
  host: string;
  databaseUrl: string;
  jwtSecret: string;
  appKey: string;
  apiUrl: string;
  panelUrl: string;
  redisHost: string;
  redisPort: number;
  redisPassword: string | undefined;
  redisTls: boolean;
  disableScheduleWorker: boolean;
  disableStatsCollector: boolean;
  corsOrigins: string[];
}

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isProduction = nodeEnv === 'production';

  const jwtSecret = requireEnv('JWT_SECRET', isProduction ? undefined : 'dev-secret-change-me');
  const appKey = requireEnv('APP_KEY', isProduction ? undefined : process.env.APP_KEY ?? jwtSecret);
  const panelUrl = process.env.PANEL_URL ?? 'http://localhost:5173';
  const apiUrl = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
  const databaseUrl = requireEnv('DATABASE_URL');

  const redisPassword = process.env.REDIS_PASSWORD?.trim() || undefined;
  const redisTls = process.env.REDIS_TLS === 'true';
  const redisAllowInsecure = process.env.REDIS_ALLOW_INSECURE === 'true';
  const host = process.env.HOST ?? (isProduction ? '127.0.0.1' : '0.0.0.0');

  if (isProduction) {
    assertProductionSecrets({
      jwtSecret,
      appKey,
      apiUrl,
      databaseUrl,
      host,
      redisPassword,
      redisAllowInsecure,
      disableScheduleWorker: process.env.DISABLE_SCHEDULE_WORKER === 'true',
    });
  }

  const corsOrigins = (process.env.CORS_ORIGINS ?? panelUrl)
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  return {
    nodeEnv,
    isProduction,
    port: Number(process.env.PORT ?? 3000),
    host,
    databaseUrl,
    jwtSecret,
    appKey,
    apiUrl: apiUrl.replace(/\/$/, ''),
    panelUrl: panelUrl.replace(/\/$/, ''),
    redisHost: process.env.REDIS_HOST ?? '127.0.0.1',
    redisPort: Number(process.env.REDIS_PORT ?? 6379),
    redisPassword,
    redisTls,
    disableScheduleWorker: process.env.DISABLE_SCHEDULE_WORKER === 'true',
    disableStatsCollector: process.env.DISABLE_STATS_COLLECTOR === 'true',
    corsOrigins,
  };
}

let cached: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!cached) cached = loadConfig();
  return cached;
}
