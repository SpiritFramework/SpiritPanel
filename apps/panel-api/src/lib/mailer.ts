import { renderEmailMessage, type EmailTemplateVars } from './email-templates.js';
import { getConfig } from './env.js';
import { sendMail, verifySmtp, isMailEnabled } from './mailer-core.js';
import type { EmailTemplateId, SmtpSettings } from './panel-settings.js';

export { sendMail, verifySmtp, isMailEnabled };

export interface ServerEmailContext {
  id: string;
  name: string;
  owner: { email: string; username: string };
  node?: { name: string } | null;
  egg?: { name: string } | null;
  defaultAllocation?: { ip: string; port: number } | null;
}

function buildServerEmailVars(ctx: ServerEmailContext): EmailTemplateVars {
  const panelUrl = getConfig().panelUrl;
  const alloc = ctx.defaultAllocation;
  return {
    username: ctx.owner.username,
    serverName: ctx.name,
    serverUrl: `${panelUrl}/servers/${ctx.id}`,
    nodeName: ctx.node?.name ?? '',
    eggName: ctx.egg?.name ?? '',
    serverAddress: alloc ? `${alloc.ip}:${alloc.port}` : '',
  };
}

async function sendTemplatedEmail(
  templateId: EmailTemplateId,
  to: string,
  vars: EmailTemplateVars,
): Promise<void> {
  const rendered = await renderEmailMessage(templateId, vars);
  if (!rendered.enabled) return;
  await sendMail({ to, subject: rendered.subject, html: rendered.html, text: rendered.text });
}

export async function sendPasswordResetEmail(to: string, username: string, resetUrl: string): Promise<void> {
  await sendTemplatedEmail('password_reset', to, { username, resetUrl });
}

export async function sendWelcomeEmail(to: string, username: string, email: string): Promise<void> {
  await sendTemplatedEmail('welcome', to, { username, email });
}

export async function sendTestEmail(to: string, smtp: SmtpSettings): Promise<void> {
  const rendered = await renderEmailMessage('smtp_test', {});
  await sendMail({ to, subject: rendered.subject, html: rendered.html, text: rendered.text }, smtp);
}

export async function sendAccountSuspendedEmail(to: string, username: string): Promise<void> {
  await sendTemplatedEmail('account_suspended', to, { username });
}

export async function sendAccountRestoredEmail(to: string, username: string): Promise<void> {
  await sendTemplatedEmail('account_restored', to, { username });
}

export async function sendPasswordChangedEmail(to: string, username: string): Promise<void> {
  await sendTemplatedEmail('password_changed', to, { username });
}

export async function sendSubuserAddedEmail(
  to: string,
  username: string,
  serverName: string,
  serverId: string,
  ownerUsername: string,
): Promise<void> {
  const panelUrl = getConfig().panelUrl;
  await sendTemplatedEmail('subuser_added', to, {
    username,
    serverName,
    serverUrl: `${panelUrl}/servers/${serverId}`,
    ownerUsername,
  });
}

export async function sendServerSuspendedEmail(
  to: string,
  username: string,
  serverName: string,
  serverId: string,
): Promise<void> {
  const panelUrl = getConfig().panelUrl;
  await sendTemplatedEmail('server_suspended', to, {
    username,
    serverName,
    serverUrl: `${panelUrl}/servers/${serverId}`,
  });
}

export async function sendServerUnsuspendedEmail(
  to: string,
  username: string,
  serverName: string,
  serverId: string,
): Promise<void> {
  const panelUrl = getConfig().panelUrl;
  await sendTemplatedEmail('server_unsuspended', to, {
    username,
    serverName,
    serverUrl: `${panelUrl}/servers/${serverId}`,
  });
}

export async function sendServerCreatedEmail(ctx: ServerEmailContext): Promise<void> {
  await sendTemplatedEmail('server_created', ctx.owner.email, buildServerEmailVars(ctx));
}

export async function sendServerDeployedEmail(ctx: ServerEmailContext): Promise<void> {
  await sendTemplatedEmail('server_deployed', ctx.owner.email, buildServerEmailVars(ctx));
}

export async function sendServerInstallFailedEmail(ctx: ServerEmailContext): Promise<void> {
  await sendTemplatedEmail('server_install_failed', ctx.owner.email, buildServerEmailVars(ctx));
}
