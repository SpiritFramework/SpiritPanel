const PLACEHOLDER_PATTERNS = [
  /^CHANGE_ME/i,
  /change-me/i,
  /^dev-only/i,
  /^dev-secret/i,
  /^your[_-]?/i,
  /^replace[_-]?me/i,
];

const WEAK_PASSWORDS = new Set([
  'admin123!',
  'demo123!',
  'password',
  'password123',
  'changeme',
  'spirit123!',
]);

export function isPlaceholderSecret(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 16) return true;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function isWeakAdminPassword(password: string): boolean {
  const normalized = password.trim().toLowerCase();
  if (password.trim().length < 12) return true;
  return WEAK_PASSWORDS.has(normalized) || isPlaceholderSecret(password);
}

/** Block known-weak passwords for non-admin accounts when policy enforcement is enabled. */
export function isCommonPassword(password: string): boolean {
  const normalized = password.trim().toLowerCase();
  return WEAK_PASSWORDS.has(normalized) || isPlaceholderSecret(password);
}

export function assertProductionSecrets(env: {
  jwtSecret: string;
  appKey: string;
  apiUrl: string;
  databaseUrl: string;
  host: string;
  redisPassword?: string;
  redisAllowInsecure: boolean;
  disableScheduleWorker: boolean;
}): void {
  if (isPlaceholderSecret(env.jwtSecret)) {
    throw new Error('JWT_SECRET must be set to a strong random value in production (openssl rand -base64 48)');
  }
  if (isPlaceholderSecret(env.appKey)) {
    throw new Error('APP_KEY must be set to a strong random value in production (openssl rand -base64 32)');
  }
  if (env.jwtSecret === env.appKey) {
    throw new Error('APP_KEY must differ from JWT_SECRET in production');
  }
  if (/CHANGE_ME/i.test(env.databaseUrl)) {
    throw new Error('DATABASE_URL contains placeholder credentials — update apps/panel-api/.env');
  }
  if (!env.apiUrl.startsWith('https://')) {
    throw new Error('API_URL must use HTTPS in production (FeatherWings remote: URL)');
  }
  if (/localhost|127\.0\.0\.1/i.test(env.apiUrl)) {
    throw new Error('API_URL must be your public panel URL in production, not localhost');
  }
  if (env.host === '0.0.0.0' || env.host === '::') {
    throw new Error(
      'HOST must bind to loopback (127.0.0.1) in production — terminate TLS on Nginx and proxy to the API',
    );
  }
  if (!env.disableScheduleWorker && !env.redisPassword && !env.redisAllowInsecure) {
    throw new Error(
      'REDIS_PASSWORD is required in production when the schedule worker is enabled. Set REDIS_ALLOW_INSECURE=true only for isolated local deployments.',
    );
  }
}
