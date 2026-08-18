import type { FastifyInstance } from 'fastify';
import { createReadStream } from 'node:fs';
import { randomBytes, createHash } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { hashPassword, invalidateUserSessions, signToken, verifyPassword } from '../lib/auth.js';
import {
  assertLoginAllowed,
  clearLoginFailures,
  recordLoginFailure,
} from '../lib/login-guard.js';
import { AUTH_RATE_LIMIT, LOGIN_RATE_LIMIT, PASSWORD_RESET_LIMIT } from '../lib/rate-limits.js';
import { requestIp } from '../lib/client-server.js';
import { assertPasswordMeetsPolicy, getPasswordMinLength } from '../lib/password-policy.js';
import { requireAuth } from '../middleware/auth.js';
import { clearSessionCookie, setSessionCookie } from '../lib/session-cookie.js';
import { logAuthActivity } from '../lib/admin-activity.js';
import {
  brandingAssetExists,
  resolveBrandingAssetPath,
} from '../lib/branding-assets.js';
import {
  getMaintenanceSettings,
  getMinPasswordLength,
  getPublicPanelConfig,
  getRegistrationEnabled,
} from '../lib/panel-settings.js';
import {
  isMailEnabled,
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from '../lib/mailer.js';
import { isTurnstileEnabled, verifyTurnstileToken } from '../lib/turnstile.js';
import { getConfig } from '../lib/env.js';
import { PANEL_AUTHOR } from '../lib/product-meta.js';
import { isSafeHttpUrl } from '../lib/safe-url.js';
import { encryptSecret, decryptSecret } from '../lib/secret-crypto.js';
import { validateGithubPat } from '../lib/github-auth.js';
import {
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  signTwoFactorChallenge,
  totpKeyUri,
  totpQrDataUrl,
  verifyTotp,
  verifyTwoFactorChallenge,
} from '../lib/totp.js';
import { getGeneralSettings } from '../lib/panel-settings.js';

const sshKeyName = z.string().min(1).max(64);

function parsePublicKey(input: string): { ok: true; normalized: string } | { ok: false; error: string } {
  const trimmed = input.trim().replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
  const parts = trimmed.split(' ');
  const validTypes = [
    'ssh-rsa',
    'ssh-ed25519',
    'ecdsa-sha2-nistp256',
    'ecdsa-sha2-nistp384',
    'ecdsa-sha2-nistp521',
    'sk-ssh-ed25519@openssh.com',
    'sk-ecdsa-sha2-nistp256@openssh.com',
  ];
  if (parts.length < 2 || !validTypes.includes(parts[0]!)) {
    return { ok: false, error: 'That does not look like a valid OpenSSH public key.' };
  }
  if (!/^[A-Za-z0-9+/=]+$/.test(parts[1]!)) {
    return { ok: false, error: 'The key body is not valid base64.' };
  }
  return { ok: true, normalized: `${parts[0]} ${parts[1]}${parts[2] ? ` ${parts.slice(2).join(' ')}` : ''}` };
}

async function assertTurnstile(request: { ip: string }, token?: string) {
  if (!(await isTurnstileEnabled())) return;
  if (!token?.trim()) {
    throw Object.assign(new Error('Please complete the security check.'), { statusCode: 400 });
  }
  const ok = await verifyTurnstileToken(token, request.ip);
  if (!ok) {
    throw Object.assign(new Error('Security verification failed. Please try again.'), { statusCode: 403 });
  }
}

function issueAuthSession(
  reply: import('fastify').FastifyReply,
  user: {
    id: string;
    email: string;
    role: string;
    tokenVersion: number;
    uuid: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl?: string | null;
    rootAdmin: boolean;
    createdAt: Date;
  },
) {
  const token = signToken({
    id: user.id,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });
  setSessionCookie(reply, token, user.role);
  return { user: sanitizeUser(user) };
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', { config: LOGIN_RATE_LIMIT }, async (request, reply) => {
    const body = z
      .object({
        identifier: z.string().min(1).optional(),
        email: z.string().min(1).optional(),
        password: z.string().min(1),
        turnstileToken: z.string().optional(),
      })
      .refine((data) => Boolean(data.identifier?.trim() || data.email?.trim()), {
        message: 'Username or email is required',
      })
      .parse(request.body);

    try {
      await assertTurnstile(request, body.turnstileToken);
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode ?? 400;
      return reply.status(statusCode).send({ error: err instanceof Error ? err.message : 'Security check failed' });
    }

    const identifier = (body.identifier ?? body.email ?? '').trim();
    const isEmail = identifier.includes('@');

    try {
      assertLoginAllowed(identifier, request.ip);
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode ?? 429;
      return reply.status(statusCode).send({ error: err instanceof Error ? err.message : 'Too many attempts' });
    }

    const user = await prisma.user.findFirst({
      where: isEmail
        ? { email: identifier.toLowerCase() }
        : { OR: [{ username: identifier }, { username: identifier.toLowerCase() }] },
    });

    if (!user) {
      recordLoginFailure(identifier, request.ip);
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      recordLoginFailure(identifier, request.ip);
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    clearLoginFailures(identifier, request.ip);

    if (!user.enabled) {
      return reply.status(403).send({
        error: 'Your account has been suspended. Please contact an administrator for assistance.',
      });
    }

    const maintenance = await getMaintenanceSettings();
    if (maintenance.enabled && !user.rootAdmin) {
      const elevated = user.role === 'admin' || user.role === 'staff';
      if (!elevated) {
        return reply.status(503).send({ error: maintenance.message });
      }
      if (!maintenance.allowAdminLogin) {
        return reply.status(503).send({ error: maintenance.message });
      }
    }

    if (user.totpEnabled && user.totpSecret) {
      return { twoFactorRequired: true, challenge: signTwoFactorChallenge(user.id) };
    }

    await logAuthActivity(request, {
      event: 'auth.login',
      actorId: user.id,
      description: `${user.username} logged in`,
      properties: { role: user.role },
    });

    return issueAuthSession(reply, user);
  });

  app.post('/login/2fa', { config: AUTH_RATE_LIMIT }, async (request, reply) => {
    const body = z
      .object({ challenge: z.string().min(10), code: z.string().min(4).max(20) })
      .parse(request.body);

    const userId = verifyTwoFactorChallenge(body.challenge);
    if (!userId) {
      return reply.status(401).send({ error: 'Your verification session expired. Please sign in again.' });
    }

    const ip = requestIp(request);
    try {
      assertLoginAllowed(`2fa:${userId}`, ip);
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode ?? 429;
      return reply.status(statusCode).send({ error: err instanceof Error ? err.message : 'Too many attempts' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.enabled || !user.totpEnabled || !user.totpSecret) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const code = body.code.trim();
    let verified = verifyTotp(code, decryptSecret(user.totpSecret));

    if (!verified) {
      verified = await consumeRecoveryCode(user.id, user.totpRecoveryCodes, code);
    }

    if (!verified) {
      recordLoginFailure(`2fa:${userId}`, ip);
      return reply.status(401).send({ error: 'Invalid authentication code' });
    }

    clearLoginFailures(`2fa:${userId}`, ip);
    await logAuthActivity(request, {
      event: 'auth.login',
      actorId: user.id,
      description: `${user.username} logged in (2FA)`,
      properties: { role: user.role },
    });

    return issueAuthSession(reply, user);
  });

  app.post('/register', { config: AUTH_RATE_LIMIT }, async (request, reply) => {
    const enabled = await getRegistrationEnabled();
    if (!enabled) {
      return reply.status(403).send({ error: 'Registration is disabled' });
    }

    const maintenance = await getMaintenanceSettings();
    if (maintenance.enabled) {
      return reply.status(503).send({ error: maintenance.message });
    }

    const minPasswordLength = await getMinPasswordLength();

    const body = z
      .object({
        email: z.string().email(),
        username: z.string().min(3).max(32),
        password: z.string().min(minPasswordLength),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        turnstileToken: z.string().optional(),
      })
      .parse(request.body);

    try {
      await assertTurnstile(request, body.turnstileToken);
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode ?? 400;
      return reply.status(statusCode).send({ error: err instanceof Error ? err.message : 'Security check failed' });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: body.email }, { username: body.username }] },
    });
    if (existing) {
      return reply.status(422).send({ error: 'Email or username already taken' });
    }

    try {
      await assertPasswordMeetsPolicy(body.password);
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode ?? 422;
      return reply.status(statusCode).send({
        error: err instanceof Error ? err.message : 'Invalid password',
      });
    }

    const user = await prisma.user.create({
      data: {
        email: body.email,
        username: body.username,
        passwordHash: await hashPassword(body.password),
        firstName: body.firstName,
        lastName: body.lastName,
      },
    });

    await logAuthActivity(request, {
      event: 'auth.register',
      actorId: user.id,
      description: `New account registered: ${user.username}`,
      properties: { email: user.email },
    });

    if (await isMailEnabled()) {
      try {
        await sendWelcomeEmail(user.email, user.username, user.email);
      } catch (err) {
        request.log.error({ err }, 'Failed to send welcome email');
      }
    }

    return issueAuthSession(reply, user);
  });

  app.post('/forgot-password', { config: PASSWORD_RESET_LIMIT }, async (request, reply) => {
    const body = z
      .object({ email: z.string().email(), turnstileToken: z.string().optional() })
      .parse(request.body);

    try {
      await assertTurnstile(request, body.turnstileToken);
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode ?? 400;
      return reply.status(statusCode).send({ error: err instanceof Error ? err.message : 'Security check failed' });
    }

    const mailEnabled = await isMailEnabled();

    // Always return success to avoid leaking which emails exist.
    const respond = () => ({ success: true, mailEnabled });

    if (!mailEnabled) return respond();

    const user = await prisma.user.findFirst({ where: { email: body.email.toLowerCase() } });
    if (!user || !user.enabled) return respond();

    // Invalidate previous outstanding tokens.
    await prisma.passwordReset.deleteMany({ where: { userId: user.id, usedAt: null } });

    const token = randomBytes(32).toString('hex');
    await prisma.passwordReset.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });

    const resetUrl = `${getConfig().panelUrl}/reset-password?token=${token}`;
    try {
      await sendPasswordResetEmail(user.email, user.username, resetUrl);
      await logAuthActivity(request, {
        event: 'auth.password.reset_requested',
        actorId: user.id,
        description: `${user.username} requested a password reset`,
      });
    } catch (err) {
      request.log.error({ err }, 'Failed to send password reset email');
    }
    return respond();
  });

  app.post('/reset-password', { config: AUTH_RATE_LIMIT }, async (request, reply) => {
    const minPasswordLength = await getMinPasswordLength();
    const body = z
      .object({ token: z.string().min(10), password: z.string().min(minPasswordLength) })
      .parse(request.body);

    try {
      await assertPasswordMeetsPolicy(body.password);
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode ?? 422;
      return reply.status(statusCode).send({
        error: err instanceof Error ? err.message : 'Invalid password',
      });
    }

    const reset = await prisma.passwordReset.findUnique({ where: { token: body.token } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      return reply.status(400).send({ error: 'This reset link is invalid or has expired.' });
    }

    const user = await prisma.user.update({
      where: { id: reset.userId },
      data: {
        passwordHash: await hashPassword(body.password),
        tokenVersion: { increment: 1 },
      },
    });
    await prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } });
    clearSessionCookie(reply);

    if (await isMailEnabled()) {
      try {
        await sendPasswordChangedEmail(user.email, user.username);
      } catch (err) {
        request.log.error({ err }, 'Failed to send password changed email');
      }
    }

    await logAuthActivity(request, {
      event: 'auth.password.reset',
      actorId: reset.userId,
      description: 'Password reset via email link',
    });
    return { success: true };
  });

  app.post('/logout', { preHandler: requireAuth }, async (request, reply) => {
    await invalidateUserSessions(request.user!.id);
    clearSessionCookie(reply);
    return { success: true };
  });

  app.get('/me', { preHandler: requireAuth }, async (request) => {
    return sanitizeUser(request.user!);
  });

  app.patch('/me', { preHandler: requireAuth }, async (request, reply) => {
    const minPasswordLength = await getPasswordMinLength();
    const body = z
      .object({
        email: z.string().email().optional(),
        username: z.string().min(3).max(32).optional(),
        firstName: z.string().max(64).optional().nullable(),
        lastName: z.string().max(64).optional().nullable(),
        avatarUrl: z
          .union([
            z.literal(''),
            z.null(),
            z.string().max(512).refine(isSafeHttpUrl, { message: 'Avatar URL must use http or https' }),
          ])
          .optional(),
        currentPassword: z.string().optional(),
        newPassword: z.string().min(minPasswordLength).optional(),
      })
      .parse(request.body);

    const user = await prisma.user.findUnique({ where: { id: request.user!.id } });
    if (!user) return reply.status(404).send({ error: 'Not found' });

    if (body.newPassword) {
      if (!body.currentPassword) {
        return reply.status(422).send({ error: 'Current password is required to set a new password' });
      }
      const valid = await verifyPassword(body.currentPassword, user.passwordHash);
      if (!valid) return reply.status(403).send({ error: 'Current password is incorrect' });
      try {
        await assertPasswordMeetsPolicy(body.newPassword);
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode ?? 422;
        return reply.status(statusCode).send({
          error: err instanceof Error ? err.message : 'Invalid password',
        });
      }
    }

    if (body.email && body.email !== user.email) {
      const taken = await prisma.user.findFirst({
        where: { email: body.email, id: { not: user.id } },
      });
      if (taken) return reply.status(422).send({ error: 'Email is already in use' });
    }

    if (body.username && body.username !== user.username) {
      const taken = await prisma.user.findFirst({
        where: { username: body.username, id: { not: user.id } },
      });
      if (taken) return reply.status(422).send({ error: 'Username is already in use' });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.username !== undefined ? { username: body.username } : {}),
        ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
        ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
        ...(body.avatarUrl !== undefined
          ? { avatarUrl: body.avatarUrl === '' ? null : body.avatarUrl }
          : {}),
        ...(body.newPassword
          ? { passwordHash: await hashPassword(body.newPassword), tokenVersion: { increment: 1 } }
          : {}),
      },
    });

    const changes: string[] = [];
    if (body.email && body.email !== user.email) changes.push('email');
    if (body.username && body.username !== user.username) changes.push('username');
    if (body.avatarUrl !== undefined && body.avatarUrl !== user.avatarUrl) changes.push('avatar');
    if (body.newPassword) changes.push('password');

    if (changes.length) {
      await logAuthActivity(request, {
        event: 'auth.profile.updated',
        actorId: user.id,
        description: `${user.username} updated profile (${changes.join(', ')})`,
      });
    }

    if (body.newPassword) {
      return issueAuthSession(reply, updated);
    }

    return sanitizeUser(updated);
  });

  // ---- Two-factor authentication ----
  app.get('/me/2fa', { preHandler: requireAuth }, async (request) => {
    const user = request.user!;
    let recoveryRemaining = 0;
    if (user.totpRecoveryCodes) {
      try {
        recoveryRemaining = (JSON.parse(user.totpRecoveryCodes) as string[]).length;
      } catch {
        recoveryRemaining = 0;
      }
    }
    return { enabled: user.totpEnabled, recoveryRemaining };
  });

  app.post('/me/2fa/setup', { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    if (user.totpEnabled) {
      return reply.status(409).send({ error: 'Two-factor authentication is already enabled' });
    }
    const secret = generateTotpSecret();
    const general = await getGeneralSettings();
    const issuer = general.companyName || PANEL_AUTHOR;
    const otpauth = totpKeyUri(secret, user.email, issuer);
    const qr = await totpQrDataUrl(otpauth);

    // Stash the pending (not yet confirmed) secret encrypted; totpEnabled stays false.
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: encryptSecret(secret) },
    });

    return { secret, otpauth, qr };
  });

  app.post('/me/2fa/enable', { preHandler: requireAuth }, async (request, reply) => {
    const body = z.object({ code: z.string().min(4).max(10) }).parse(request.body);
    const user = await prisma.user.findUnique({ where: { id: request.user!.id } });
    if (!user) return reply.status(404).send({ error: 'Not found' });
    if (user.totpEnabled) return reply.status(409).send({ error: 'Already enabled' });
    if (!user.totpSecret) {
      return reply.status(400).send({ error: 'Start setup before enabling two-factor authentication' });
    }
    if (!verifyTotp(body.code.trim(), decryptSecret(user.totpSecret))) {
      return reply.status(400).send({ error: 'That code is incorrect. Check your authenticator app and try again.' });
    }

    const { codes, hashes } = generateRecoveryCodes();
    await prisma.user.update({
      where: { id: user.id },
      data: { totpEnabled: true, totpRecoveryCodes: JSON.stringify(hashes) },
    });

    await logAuthActivity(request, {
      event: 'auth.2fa.enabled',
      actorId: user.id,
      description: `${user.username} enabled two-factor authentication`,
    });

    return { success: true, recoveryCodes: codes };
  });

  app.post('/me/2fa/disable', { preHandler: requireAuth }, async (request, reply) => {
    const body = z.object({ password: z.string().min(1) }).parse(request.body);
    const user = await prisma.user.findUnique({ where: { id: request.user!.id } });
    if (!user) return reply.status(404).send({ error: 'Not found' });
    if (!(await verifyPassword(body.password, user.passwordHash))) {
      return reply.status(403).send({ error: 'Password is incorrect' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { totpEnabled: false, totpSecret: null, totpRecoveryCodes: null },
    });

    await logAuthActivity(request, {
      event: 'auth.2fa.disabled',
      actorId: user.id,
      description: `${user.username} disabled two-factor authentication`,
    });

    return { success: true };
  });

  app.post('/me/2fa/recovery-codes', { preHandler: requireAuth }, async (request, reply) => {
    const body = z.object({ password: z.string().min(1) }).parse(request.body);
    const user = await prisma.user.findUnique({ where: { id: request.user!.id } });
    if (!user) return reply.status(404).send({ error: 'Not found' });
    if (!user.totpEnabled) return reply.status(400).send({ error: 'Two-factor authentication is not enabled' });
    if (!(await verifyPassword(body.password, user.passwordHash))) {
      return reply.status(403).send({ error: 'Password is incorrect' });
    }
    const { codes, hashes } = generateRecoveryCodes();
    await prisma.user.update({
      where: { id: user.id },
      data: { totpRecoveryCodes: JSON.stringify(hashes) },
    });
    return { recoveryCodes: codes };
  });

  // ---- GitHub PAT (marketplace rate limits) ----
  app.get('/me/github-pat', { preHandler: requireAuth }, async (request) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.id },
      select: { githubPatEnc: true },
    });
    return { configured: Boolean(user?.githubPatEnc) };
  });

  app.put('/me/github-pat', { preHandler: requireAuth }, async (request, reply) => {
    const body = z.object({ token: z.string().min(1).max(512) }).parse(request.body);
    const trimmed = body.token.trim();
    let login: string;
    try {
      ({ login } = await validateGithubPat(trimmed));
    } catch (err) {
      return reply.status(422).send({ error: err instanceof Error ? err.message : 'Invalid GitHub token' });
    }

    await prisma.user.update({
      where: { id: request.user!.id },
      data: { githubPatEnc: encryptSecret(trimmed) },
    });

    await logAuthActivity(request, {
      event: 'auth.github_pat.saved',
      actorId: request.user!.id,
      description: `${request.user!.username} linked GitHub account @${login} for marketplace`,
    });

    return { configured: true, login };
  });

  app.delete('/me/github-pat', { preHandler: requireAuth }, async (request) => {
    await prisma.user.update({
      where: { id: request.user!.id },
      data: { githubPatEnc: null },
    });
    await logAuthActivity(request, {
      event: 'auth.github_pat.removed',
      actorId: request.user!.id,
      description: `${request.user!.username} removed their GitHub token`,
    });
    return { configured: false };
  });

  // ---- SSH keys ----
  app.get('/me/ssh-keys', { preHandler: requireAuth }, async (request) => {
    const keys = await prisma.userSshKey.findMany({
      where: { userId: request.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    return keys.map(serializeSshKey);
  });

  app.post('/me/ssh-keys', { preHandler: requireAuth }, async (request, reply) => {
    const body = z.object({ name: sshKeyName, publicKey: z.string().min(1).max(16384) }).parse(request.body);
    const parsed = parsePublicKey(body.publicKey);
    if (!parsed.ok) return reply.status(422).send({ error: parsed.error });

    const existing = await prisma.userSshKey.findFirst({
      where: { userId: request.user!.id, publicKey: parsed.normalized },
    });
    if (existing) return reply.status(409).send({ error: 'That SSH key has already been added.' });

    const key = await prisma.userSshKey.create({
      data: { userId: request.user!.id, name: body.name.trim(), publicKey: parsed.normalized },
    });

    await logAuthActivity(request, {
      event: 'auth.ssh_key.added',
      actorId: request.user!.id,
      description: `${request.user!.username} added SSH key "${body.name.trim()}"`,
    });

    return serializeSshKey(key);
  });

  app.delete('/me/ssh-keys/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const key = await prisma.userSshKey.findFirst({ where: { id, userId: request.user!.id } });
    if (!key) return reply.status(404).send({ error: 'SSH key not found' });
    await prisma.userSshKey.delete({ where: { id: key.id } });

    await logAuthActivity(request, {
      event: 'auth.ssh_key.removed',
      actorId: request.user!.id,
      description: `${request.user!.username} removed SSH key "${key.name}"`,
    });

    return { success: true };
  });

  app.get('/branding', async () => getPublicPanelConfig());

  app.get('/branding/assets/:filename', async (request, reply) => {
    const { filename } = request.params as { filename: string };
    if (!(await brandingAssetExists(filename))) {
      return reply.status(404).send({ error: 'Not found' });
    }
    const path = resolveBrandingAssetPath(filename)!;
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'svg') {
      return reply.status(404).send({ error: 'Not found' });
    }
    const types: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      ico: 'image/x-icon',
    };
    reply.header('Cache-Control', 'public, max-age=300');
    if (ext && types[ext]) reply.type(types[ext]);
    return reply.send(createReadStream(path));
  });
}

async function consumeRecoveryCode(
  userId: string,
  stored: string | null,
  code: string,
): Promise<boolean> {
  if (!stored) return false;
  let hashes: string[];
  try {
    hashes = JSON.parse(stored) as string[];
  } catch {
    return false;
  }
  const target = hashRecoveryCode(code);
  const index = hashes.indexOf(target);
  if (index === -1) return false;
  hashes.splice(index, 1);
  await prisma.user.update({
    where: { id: userId },
    data: { totpRecoveryCodes: JSON.stringify(hashes) },
  });
  return true;
}

function serializeSshKey(key: { id: string; name: string; publicKey: string; createdAt: Date }) {
  const fingerprint = sshKeyFingerprint(key.publicKey);
  return { id: key.id, name: key.name, publicKey: key.publicKey, fingerprint, createdAt: key.createdAt };
}

function sshKeyFingerprint(publicKey: string): string {
  const parts = publicKey.trim().split(/\s+/);
  const body = parts[1];
  if (!body) return '';
  try {
    const hash = createHash('sha256').update(Buffer.from(body, 'base64')).digest('base64').replace(/=+$/, '');
    return `SHA256:${hash}`;
  } catch {
    return '';
  }
}

function sanitizeUser(user: {  id: string;
  uuid: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl?: string | null;
  role: string;
  rootAdmin: boolean;
  createdAt: Date;
}) {
  return {
    id: user.id,
    uuid: user.uuid,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role,
    rootAdmin: user.rootAdmin,
    createdAt: user.createdAt,
  };
}
