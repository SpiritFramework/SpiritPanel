import nodemailer from 'nodemailer';
import { getSmtpSettings, type SmtpSettings } from './panel-settings.js';

interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function buildTransport(smtp: SmtpSettings) {
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.username ? { user: smtp.username, pass: smtp.password } : undefined,
  });
}

export async function isMailEnabled(): Promise<boolean> {
  const smtp = await getSmtpSettings();
  return smtp.enabled && !!smtp.host;
}

/** Send a raw email using the configured SMTP transport. Throws on failure. */
export async function sendMail(input: SendMailInput, override?: SmtpSettings): Promise<void> {
  const smtp = override ?? (await getSmtpSettings());
  if (!smtp.host) throw new Error('SMTP is not configured');
  const transport = buildTransport(smtp);
  const from = smtp.fromName ? `"${smtp.fromName}" <${smtp.fromAddress}>` : smtp.fromAddress;
  await transport.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}

/** Verify SMTP connectivity (used by the admin "send test email" button). */
export async function verifySmtp(smtp: SmtpSettings): Promise<void> {
  const transport = buildTransport(smtp);
  await transport.verify();
}
