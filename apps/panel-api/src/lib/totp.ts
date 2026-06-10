import { randomBytes, createHash } from 'node:crypto';
import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import { assertTokenCritHeaderSupported } from './jwt-crit.js';
import { getConfig } from './env.js';

export function generateTotpSecret(): string {
  return generateSecret();
}

export function totpKeyUri(secret: string, account: string, issuer: string): string {
  return generateURI({ strategy: 'totp', issuer, label: account, secret });
}

export async function totpQrDataUrl(otpauthUri: string): Promise<string> {
  return QRCode.toDataURL(otpauthUri, { margin: 1, width: 220 });
}

export function verifyTotp(token: string, secret: string): boolean {
  try {
    // epochTolerance of 30s permits codes from the adjacent time step.
    return verifySync({ secret, token: token.replace(/\s+/g, ''), epochTolerance: 30 }).valid;
  } catch {
    return false;
  }
}

/** Generate plaintext recovery codes plus their hashes for storage. */
export function generateRecoveryCodes(count = 8): { codes: string[]; hashes: string[] } {
  const codes: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = randomBytes(5).toString('hex'); // 10 hex chars
    const code = `${raw.slice(0, 5)}-${raw.slice(5)}`;
    codes.push(code);
    hashes.push(hashRecoveryCode(code));
  }
  return { codes, hashes };
}

export function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(code.trim().toLowerCase()).digest('hex');
}

const TWO_FA_PURPOSE = '2fa-challenge';

export function signTwoFactorChallenge(userId: string): string {
  return jwt.sign({ sub: userId, purpose: TWO_FA_PURPOSE }, getConfig().jwtSecret, {
    expiresIn: '10m',
  } as jwt.SignOptions);
}

export function verifyTwoFactorChallenge(token: string): string | null {
  try {
    assertTokenCritHeaderSupported(token);
    const payload = jwt.verify(token, getConfig().jwtSecret) as { sub: string; purpose?: string };
    if (payload.purpose !== TWO_FA_PURPOSE) return null;
    return payload.sub;
  } catch {
    return null;
  }
}
