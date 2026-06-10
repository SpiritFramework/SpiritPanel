export type EmailTemplateId =
  | 'password_reset'
  | 'welcome'
  | 'smtp_test'
  | 'account_suspended'
  | 'account_restored'
  | 'password_changed'
  | 'subuser_added'
  | 'server_suspended'
  | 'server_unsuspended'
  | 'server_created'
  | 'server_deployed'
  | 'server_install_failed';

export interface EmailTemplate {
  subject: string;
  heading: string;
  bodyHtml: string;
  buttonLabel?: string;
  enabled: boolean;
}

export type EmailTemplatesSettings = Record<EmailTemplateId, EmailTemplate>;

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplatesSettings = {
  password_reset: {
    enabled: true,
    subject: 'Reset your {{panelName}} password',
    heading: 'Reset your password',
    buttonLabel: 'Reset password',
    bodyHtml:
      '<p>Hi {{username}},</p><p>We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p><p style="color:#64748b;font-size:13px;">If you did not request this, you can safely ignore this email.</p>',
  },
  welcome: {
    enabled: false,
    subject: 'Welcome to {{panelName}}',
    heading: 'Welcome aboard',
    buttonLabel: 'Open panel',
    bodyHtml:
      '<p>Hi {{username}},</p><p>Your account is ready. You can sign in any time to manage your game servers, files, and console.</p><p>If you have questions, our support team is here to help.</p>',
  },
  smtp_test: {
    enabled: true,
    subject: '{{panelName}} SMTP test',
    heading: 'SMTP test successful',
    bodyHtml:
      '<p>This is a test email from your <strong>{{panelName}}</strong> installation.</p><p>If you are reading this, outbound email delivery is configured correctly.</p>',
  },
  account_suspended: {
    enabled: true,
    subject: 'Your {{panelName}} account has been suspended',
    heading: 'Account suspended',
    buttonLabel: 'Contact support',
    bodyHtml:
      '<p>Hi {{username}},</p><p>Your account has been suspended and you will not be able to sign in until an administrator restores it.</p><p>If you believe this was a mistake, please contact our support team.</p>',
  },
  account_restored: {
    enabled: true,
    subject: 'Your {{panelName}} account has been restored',
    heading: 'Account restored',
    buttonLabel: 'Sign in',
    bodyHtml:
      '<p>Hi {{username}},</p><p>Good news — your account has been restored and you can sign in again.</p>',
  },
  password_changed: {
    enabled: true,
    subject: 'Your {{panelName}} password was changed',
    heading: 'Password changed',
    buttonLabel: 'Open panel',
    bodyHtml:
      '<p>Hi {{username}},</p><p>Your password was recently changed. If you did not make this change, contact support immediately.</p>',
  },
  subuser_added: {
    enabled: true,
    subject: 'You have access to {{serverName}} on {{panelName}}',
    heading: 'Server access granted',
    buttonLabel: 'Open server',
    bodyHtml:
      '<p>Hi {{username}},</p><p>{{ownerUsername}} has granted you access to the server <strong>{{serverName}}</strong>.</p><p>You can manage this server from your panel dashboard.</p>',
  },
  server_suspended: {
    enabled: true,
    subject: '{{serverName}} has been suspended',
    heading: 'Server suspended',
    buttonLabel: 'View servers',
    bodyHtml:
      '<p>Hi {{username}},</p><p>Your server <strong>{{serverName}}</strong> has been suspended by an administrator.</p><p>The server will not start until it is unsuspended. Contact support if you have questions.</p>',
  },
  server_unsuspended: {
    enabled: true,
    subject: '{{serverName}} has been restored',
    heading: 'Server restored',
    buttonLabel: 'Open server',
    bodyHtml:
      '<p>Hi {{username}},</p><p>Your server <strong>{{serverName}}</strong> has been unsuspended and is available again.</p>',
  },
  server_created: {
    enabled: true,
    subject: '{{serverName}} is being set up on {{panelName}}',
    heading: 'Server provisioning started',
    buttonLabel: 'View server',
    bodyHtml:
      '<p>Hi {{username}},</p><p>Your server <strong>{{serverName}}</strong> has been created and is now installing. We will email you when it is ready to use.</p><p style="color:#64748b;font-size:13px;">Egg: {{eggName}} · Node: {{nodeName}}</p>',
  },
  server_deployed: {
    enabled: true,
    subject: '{{serverName}} is ready on {{panelName}}',
    heading: 'Your server is ready',
    buttonLabel: 'Open server',
    bodyHtml:
      '<p>Hi {{username}},</p><p>Great news — <strong>{{serverName}}</strong> has finished installing and is ready to use.</p><p>Connect at <strong>{{serverAddress}}</strong> once you start the server from the panel.</p><p style="color:#64748b;font-size:13px;">Egg: {{eggName}} · Node: {{nodeName}}</p>',
  },
  server_install_failed: {
    enabled: true,
    subject: '{{serverName}} installation failed',
    heading: 'Server installation failed',
    buttonLabel: 'View server',
    bodyHtml:
      '<p>Hi {{username}},</p><p>Unfortunately, installation for <strong>{{serverName}}</strong> did not complete successfully.</p><p>Please open the server in the panel to review logs and try reinstalling, or contact support if you need help.</p>',
  },
};

export const EMAIL_TEMPLATE_META: {
  id: EmailTemplateId;
  label: string;
  description: string;
  placeholders: string[];
}[] = [
  {
    id: 'password_reset',
    label: 'Password reset',
    description: 'Sent when a user requests a password reset link',
    placeholders: ['username', 'resetUrl', 'panelName', 'panelUrl', 'companyName', 'supportEmail', 'year'],
  },
  {
    id: 'welcome',
    label: 'Welcome email',
    description: 'Sent after a new user registers (when enabled)',
    placeholders: ['username', 'email', 'panelName', 'panelUrl', 'companyName', 'supportEmail', 'year'],
  },
  {
    id: 'smtp_test',
    label: 'SMTP test',
    description: 'Sent when an admin runs the test email action',
    placeholders: ['panelName', 'panelUrl', 'companyName', 'year'],
  },
  {
    id: 'account_suspended',
    label: 'Account suspended',
    description: 'Sent when an admin suspends a user account',
    placeholders: ['username', 'panelName', 'panelUrl', 'companyName', 'supportEmail', 'supportUrl', 'year'],
  },
  {
    id: 'account_restored',
    label: 'Account restored',
    description: 'Sent when an admin unsuspends a user account',
    placeholders: ['username', 'panelName', 'panelUrl', 'companyName', 'supportEmail', 'year'],
  },
  {
    id: 'password_changed',
    label: 'Password changed',
    description: 'Sent after a password is reset or changed by an admin',
    placeholders: ['username', 'panelName', 'panelUrl', 'companyName', 'supportEmail', 'year'],
  },
  {
    id: 'subuser_added',
    label: 'Subuser access',
    description: 'Sent when a user is added as a subuser on a server',
    placeholders: ['username', 'ownerUsername', 'serverName', 'serverUrl', 'panelName', 'panelUrl', 'companyName', 'supportEmail', 'year'],
  },
  {
    id: 'server_suspended',
    label: 'Server suspended',
    description: 'Sent to the server owner when an admin suspends their server',
    placeholders: ['username', 'serverName', 'serverUrl', 'panelName', 'panelUrl', 'companyName', 'supportEmail', 'year'],
  },
  {
    id: 'server_unsuspended',
    label: 'Server restored',
    description: 'Sent to the server owner when an admin unsuspends their server',
    placeholders: ['username', 'serverName', 'serverUrl', 'panelName', 'panelUrl', 'companyName', 'supportEmail', 'year'],
  },
  {
    id: 'server_created',
    label: 'Server created',
    description: 'Sent when a new server is provisioned and installation begins',
    placeholders: ['username', 'serverName', 'serverUrl', 'serverAddress', 'nodeName', 'eggName', 'panelName', 'panelUrl', 'companyName', 'supportEmail', 'year'],
  },
  {
    id: 'server_deployed',
    label: 'Server deployed',
    description: 'Sent when server installation completes successfully',
    placeholders: ['username', 'serverName', 'serverUrl', 'serverAddress', 'nodeName', 'eggName', 'panelName', 'panelUrl', 'companyName', 'supportEmail', 'year'],
  },
  {
    id: 'server_install_failed',
    label: 'Install failed',
    description: 'Sent when server installation fails on the node',
    placeholders: ['username', 'serverName', 'serverUrl', 'nodeName', 'eggName', 'panelName', 'panelUrl', 'companyName', 'supportEmail', 'year'],
  },
];

export interface TurnstileForm {
  enabled: boolean;
  siteKey: string;
  secretKey: string;
}

export const DEFAULT_TURNSTILE_FORM: TurnstileForm = {
  enabled: false,
  siteKey: '',
  secretKey: '',
};
