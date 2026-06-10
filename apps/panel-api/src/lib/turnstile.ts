import { getTurnstileSettings } from './panel-settings.js';

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
}

export async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<boolean> {
  const settings = await getTurnstileSettings();
  if (!settings.enabled) return true;
  if (!settings.secretKey) return false;
  if (!token.trim()) return false;

  const body = new URLSearchParams({
    secret: settings.secretKey,
    response: token,
  });
  if (remoteIp) body.set('remoteip', remoteIp);

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) return false;
  const data = (await res.json()) as TurnstileVerifyResponse;
  return Boolean(data.success);
}

export async function isTurnstileEnabled(): Promise<boolean> {
  const settings = await getTurnstileSettings();
  return settings.enabled && Boolean(settings.siteKey) && Boolean(settings.secretKey);
}
