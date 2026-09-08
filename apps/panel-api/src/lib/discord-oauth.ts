import jwt from 'jsonwebtoken';
import { getConfig } from './env.js';
import { JWT_HS256_SIGN, JWT_HS256_VERIFY } from './jwt-options.js';
import { assertTokenCritHeaderSupported } from './jwt-crit.js';

const STATE_PURPOSE = 'discord-oauth';
const LINK_INTENT_PURPOSE = 'discord-link-intent';
const DISCORD_AUTHORIZE = 'https://discord.com/api/oauth2/authorize';
const DISCORD_TOKEN = 'https://discord.com/api/oauth2/token';
const DISCORD_ME = 'https://discord.com/api/users/@me';

export interface DiscordAuthCredentials {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
}

export interface DiscordOAuthState {
  intent: 'login' | 'link';
  userId?: string;
}

export interface DiscordIdentity {
  id: string;
  username: string;
  globalName: string | null;
  handle: string;
}

export function discordRedirectUri(): string {
  const panel = getConfig().panelUrl.replace(/\/$/, '');
  return `${panel}/api/auth/discord/callback`;
}

export function isDiscordAuthReady(settings: DiscordAuthCredentials): boolean {
  return Boolean(settings.enabled && settings.clientId.trim() && settings.clientSecret.trim());
}

export function formatDiscordHandle(username: string, discriminator?: string | null): string {
  const disc = discriminator?.trim();
  if (disc && disc !== '0' && disc !== '0000') return `${username}#${disc}`;
  return username;
}

export function signDiscordOAuthState(payload: DiscordOAuthState): string {
  return jwt.sign(
    { purpose: STATE_PURPOSE, intent: payload.intent, userId: payload.userId },
    getConfig().jwtSecret,
    { ...JWT_HS256_SIGN, expiresIn: '10m' },
  );
}

export function verifyDiscordOAuthState(token: string): DiscordOAuthState | null {
  try {
    assertTokenCritHeaderSupported(token);
    const payload = jwt.verify(token, getConfig().jwtSecret, JWT_HS256_VERIFY) as {
      purpose?: string;
      intent?: string;
      userId?: string;
    };
    if (payload.purpose !== STATE_PURPOSE) return null;
    if (payload.intent !== 'login' && payload.intent !== 'link') return null;
    return {
      intent: payload.intent,
      userId: typeof payload.userId === 'string' ? payload.userId : undefined,
    };
  } catch {
    return null;
  }
}

/** Short-lived proof that the user confirmed password (and 2FA) before linking Discord. */
export function signDiscordLinkIntent(userId: string): string {
  return jwt.sign(
    { purpose: LINK_INTENT_PURPOSE, userId },
    getConfig().jwtSecret,
    { ...JWT_HS256_SIGN, expiresIn: '5m' },
  );
}

export function verifyDiscordLinkIntent(token: string): string | null {
  try {
    assertTokenCritHeaderSupported(token);
    const payload = jwt.verify(token, getConfig().jwtSecret, JWT_HS256_VERIFY) as {
      purpose?: string;
      userId?: string;
    };
    if (payload.purpose !== LINK_INTENT_PURPOSE) return null;
    return typeof payload.userId === 'string' ? payload.userId : null;
  } catch {
    return null;
  }
}

export function buildDiscordAuthorizeUrl(clientId: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: discordRedirectUri(),
    response_type: 'code',
    scope: 'identify',
    state,
    prompt: 'consent',
  });
  return `${DISCORD_AUTHORIZE}?${params.toString()}`;
}

export async function exchangeDiscordCode(
  code: string,
  settings: DiscordAuthCredentials,
): Promise<string | null> {
  const body = new URLSearchParams({
    client_id: settings.clientId.trim(),
    client_secret: settings.clientSecret.trim(),
    grant_type: 'authorization_code',
    code,
    redirect_uri: discordRedirectUri(),
  });

  const res = await fetch(DISCORD_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token?.trim() || null;
}

export async function fetchDiscordIdentity(accessToken: string): Promise<DiscordIdentity | null> {
  const res = await fetch(DISCORD_ME, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    id?: string;
    username?: string;
    global_name?: string | null;
    discriminator?: string;
  };
  if (!data.id || !data.username) return null;
  return {
    id: data.id,
    username: data.username,
    globalName: data.global_name ?? null,
    handle: formatDiscordHandle(data.username, data.discriminator),
  };
}
