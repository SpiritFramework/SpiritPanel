import { z } from 'zod';
import { getConfig } from './env.js';
import {
  getBrandingSettings,
  getEmailTemplatesSettings,
  getGeneralSettings,
  emailTemplateSchema,
  type EmailTemplate,
  type EmailTemplateId,
} from './panel-settings.js';

export { emailTemplateSchema };

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export const EMAIL_TEMPLATE_PLACEHOLDERS: Record<EmailTemplateId, string[]> = {
  password_reset: ['username', 'resetUrl', 'panelName', 'panelUrl', 'companyName', 'supportEmail', 'year'],
  welcome: ['username', 'email', 'panelName', 'panelUrl', 'companyName', 'supportEmail', 'year'],
  smtp_test: ['panelName', 'panelUrl', 'companyName', 'year'],
  account_suspended: ['username', 'panelName', 'panelUrl', 'companyName', 'supportEmail', 'supportUrl', 'year'],
  account_restored: ['username', 'panelName', 'panelUrl', 'companyName', 'supportEmail', 'year'],
  password_changed: ['username', 'panelName', 'panelUrl', 'companyName', 'supportEmail', 'year'],
  subuser_added: ['username', 'ownerUsername', 'serverName', 'serverUrl', 'panelName', 'panelUrl', 'companyName', 'supportEmail', 'year'],
  server_suspended: ['username', 'serverName', 'serverUrl', 'panelName', 'panelUrl', 'companyName', 'supportEmail', 'year'],
  server_unsuspended: ['username', 'serverName', 'serverUrl', 'panelName', 'panelUrl', 'companyName', 'supportEmail', 'year'],
  server_created: ['username', 'serverName', 'serverUrl', 'serverAddress', 'nodeName', 'eggName', 'panelName', 'panelUrl', 'companyName', 'supportEmail', 'year'],
  server_deployed: ['username', 'serverName', 'serverUrl', 'serverAddress', 'nodeName', 'eggName', 'panelName', 'panelUrl', 'companyName', 'supportEmail', 'year'],
  server_install_failed: ['username', 'serverName', 'serverUrl', 'nodeName', 'eggName', 'panelName', 'panelUrl', 'companyName', 'supportEmail', 'year'],
};

export type EmailTemplateVars = Record<string, string>;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function replacePlaceholders(template: string, vars: EmailTemplateVars): string {
  return template.replace(PLACEHOLDER_RE, (_, key: string) => escapeHtml(vars[key] ?? ''));
}

function absoluteAssetUrl(path: string, panelUrl: string): string | null {
  const trimmed = path.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/')) return `${panelUrl}${trimmed}`;
  return null;
}

export async function buildDefaultEmailVars(extra: EmailTemplateVars = {}): Promise<EmailTemplateVars> {
  const [branding, general] = await Promise.all([getBrandingSettings(), getGeneralSettings()]);
  const panelUrl = getConfig().panelUrl;
  return {
    panelName: branding.panelName,
    panelUrl,
    tagline: branding.tagline,
    companyName: general.companyName || branding.panelName,
    supportEmail: general.supportEmail,
    supportUrl: general.supportUrl,
    year: String(new Date().getFullYear()),
    username: 'player',
    email: 'player@example.com',
    resetUrl: `${panelUrl}/reset-password?token=example`,
    serverName: 'My Minecraft Server',
    serverUrl: `${panelUrl}/servers/example`,
    serverAddress: '203.0.113.10:25565',
    nodeName: 'EU Node 1',
    eggName: 'Minecraft Java',
    ownerUsername: 'admin',
    ...extra,
  };
}

function resolveTemplateButtonUrl(
  templateId: EmailTemplateId,
  vars: EmailTemplateVars,
  panelUrl: string,
): string | undefined {
  switch (templateId) {
    case 'password_reset':
      return vars.resetUrl;
    case 'welcome':
    case 'account_restored':
    case 'password_changed':
      return panelUrl;
    case 'account_suspended':
      return vars.supportUrl?.trim() || panelUrl;
    case 'subuser_added':
    case 'server_unsuspended':
    case 'server_created':
    case 'server_deployed':
    case 'server_install_failed':
      return vars.serverUrl?.trim() || panelUrl;
    case 'server_suspended':
      return `${panelUrl}/servers`;
    default:
      return undefined;
  }
}

interface RenderEmailLayoutInput {
  heading: string;
  bodyHtml: string;
  buttonLabel?: string;
  buttonUrl?: string;
  vars: EmailTemplateVars;
  accent: string;
  secondary: string;
  logoUrl?: string;
}

function renderEmailLayout(input: RenderEmailLayoutInput): string {
  const heading = replacePlaceholders(input.heading, input.vars);
  const body = replacePlaceholders(input.bodyHtml, input.vars);
  const panelName = escapeHtml(input.vars.panelName ?? 'Panel');
  const company = escapeHtml(input.vars.companyName ?? input.vars.panelName ?? 'Panel');
  const supportEmail = input.vars.supportEmail?.trim();
  const supportUrl = input.vars.supportUrl?.trim();
  const panelUrl = escapeHtml(input.vars.panelUrl ?? '');
  const year = escapeHtml(input.vars.year ?? String(new Date().getFullYear()));
  const logo = input.logoUrl ? escapeHtml(input.logoUrl) : '';

  const buttonBlock =
    input.buttonLabel && input.buttonUrl
      ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 8px;">
          <tr>
            <td style="border-radius:10px;background:linear-gradient(135deg,${input.accent},${input.secondary});">
              <a href="${escapeHtml(input.buttonUrl)}" target="_blank" rel="noopener"
                style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">
                ${escapeHtml(replacePlaceholders(input.buttonLabel, input.vars))}
              </a>
            </td>
          </tr>
        </table>`
      : '';

  const supportLine = supportEmail
    ? `<a href="mailto:${escapeHtml(supportEmail)}" style="color:${input.accent};text-decoration:none;">${escapeHtml(supportEmail)}</a>`
    : supportUrl
      ? `<a href="${escapeHtml(supportUrl)}" style="color:${input.accent};text-decoration:none;">Support</a>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:#eef1f6;font-family:Inter,Segoe UI,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef1f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 18px 40px -28px rgba(15,23,42,0.35);">
          <tr>
            <td style="height:5px;background:linear-gradient(90deg,${input.accent},${input.secondary});font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  ${
                    logo
                      ? `<td style="width:52px;vertical-align:middle;padding-right:14px;">
                          <img src="${logo}" alt="" width="44" height="44" style="display:block;border-radius:12px;object-fit:contain;" />
                        </td>`
                      : ''
                  }
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${input.accent};">${panelName}</p>
                  </td>
                </tr>
              </table>
              <h1 style="margin:18px 0 0;font-size:24px;line-height:1.25;font-weight:800;color:#0f172a;letter-spacing:-0.02em;">${heading}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 28px;color:#334155;font-size:15px;line-height:1.65;">
              ${body}
              ${buttonBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 24px;border-top:1px solid #e2e8f0;background:#f8fafc;">
              <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#64748b;">
                Sent by <strong style="color:#334155;">${company}</strong>
                ${panelUrl ? ` · <a href="${panelUrl}" style="color:${input.accent};text-decoration:none;">${panelUrl.replace(/^https?:\/\//, '')}</a>` : ''}
              </p>
              ${supportLine ? `<p style="margin:0;font-size:12px;color:#64748b;">Need help? ${supportLine}</p>` : ''}
              <p style="margin:10px 0 0;font-size:11px;color:#94a3b8;">© ${year} ${company}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function renderEmailMessage(
  templateId: EmailTemplateId,
  vars: EmailTemplateVars,
  overrideTemplate?: EmailTemplate,
): Promise<{ subject: string; html: string; text: string; enabled: boolean }> {
  const settings = await getEmailTemplatesSettings();
  const template = overrideTemplate ?? settings[templateId];
  const branding = await getBrandingSettings();
  const panelUrl = getConfig().panelUrl;
  const accent = branding.accentColor;
  const secondary = branding.secondaryColor || accent;
  const logoUrl = absoluteAssetUrl(branding.logoUrl, panelUrl);

  const mergedVars = { ...(await buildDefaultEmailVars()), ...vars };
  const subject = replacePlaceholders(template.subject, mergedVars);

  const buttonUrl = resolveTemplateButtonUrl(templateId, mergedVars, panelUrl);

  const bodyHtml = replacePlaceholders(template.bodyHtml, mergedVars);
  const html = renderEmailLayout({
    heading: template.heading,
    bodyHtml,
    buttonLabel: template.buttonLabel,
    buttonUrl,
    vars: mergedVars,
    accent,
    secondary,
    logoUrl: logoUrl ?? undefined,
  });

  return {
    subject,
    html,
    text: htmlToPlainText(`${template.heading}\n\n${bodyHtml}`),
    enabled: template.enabled,
  };
}

export async function previewEmailTemplate(
  templateId: EmailTemplateId,
  draft: EmailTemplate,
): Promise<string> {
  const result = await renderEmailMessage(templateId, {}, draft);
  return result.html;
}
