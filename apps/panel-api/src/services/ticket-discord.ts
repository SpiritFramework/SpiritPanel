import type { TicketPriority } from '@prisma/client';
import { getConfig } from '../lib/env.js';
import { ticketCategoryLabel } from '../lib/ticket-categories.js';
import { getBrandingSettings, getTicketsSettings } from '../lib/panel-settings.js';

type TicketUser = {
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

type TicketNotify = {
  id: string;
  number: number;
  subject: string;
  category: string;
  priority: TicketPriority;
  server: { name: string } | null;
  user: TicketUser;
};

export type TicketDiscordEvent = 'opened' | 'user_reply';

interface DiscordLogger {
  warn: (obj: Record<string, unknown>, msg: string) => void;
}

function displayUser(user: TicketUser): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || user.username;
}

function priorityLabel(priority: TicketPriority): string {
  switch (priority) {
    case 'low':
      return 'Low';
    case 'normal':
      return 'Normal';
    case 'high':
      return 'High';
    case 'urgent':
      return 'Urgent';
    default:
      return priority;
  }
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function messagePreview(body: string, imageCount: number): string {
  const parts: string[] = [];
  if (body.trim()) parts.push(truncate(body.trim(), 900));
  if (imageCount > 0) {
    parts.push(`📷 ${imageCount} image${imageCount === 1 ? '' : 's'} attached`);
  }
  return parts.join('\n\n') || '_No text content_';
}

function embedColor(kind: TicketDiscordEvent, priority: TicketPriority): number {
  if (kind === 'user_reply') return 0xf59e0b;
  if (priority === 'urgent') return 0xef4444;
  if (priority === 'high') return 0xf97316;
  return 0x6366f1;
}

export async function notifyTicketDiscordEvent(
  log: DiscordLogger,
  kind: TicketDiscordEvent,
  ticket: TicketNotify,
  messageBody: string,
  imageCount = 0,
): Promise<void> {
  const settings = await getTicketsSettings();
  if (!settings.discordWebhookEnabled || !settings.discordWebhookUrl) return;

  const branding = await getBrandingSettings();
  const panelUrl = getConfig().panelUrl;
  const ticketUrl = `${panelUrl}/admin/tickets/${ticket.id}`;
  const userLabel = `${displayUser(ticket.user)} (${ticket.user.email})`;

  const title =
    kind === 'opened'
      ? `New support ticket #${ticket.number}`
      : `User replied on ticket #${ticket.number}`;

  const payload = {
    username: `${branding.panelName} Support`,
    embeds: [
      {
        title,
        url: ticketUrl,
        color: embedColor(kind, ticket.priority),
        description: messagePreview(messageBody, imageCount),
        fields: [
          { name: 'Subject', value: truncate(ticket.subject, 256), inline: false },
          { name: 'User', value: truncate(userLabel, 256), inline: true },
          { name: 'Category', value: ticketCategoryLabel(ticket.category), inline: true },
          { name: 'Priority', value: priorityLabel(ticket.priority), inline: true },
          ...(ticket.server
            ? [{ name: 'Server', value: truncate(ticket.server.name, 256), inline: true }]
            : []),
        ],
        footer: { text: branding.panelName },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const res = await fetch(settings.discordWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    log.warn(
      { status: res.status, body: text.slice(0, 200), ticketId: ticket.id, kind },
      'Discord ticket webhook failed',
    );
  }
}
