import type { TicketPriority, TicketStatus, User } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getServerAccess, isPanelAdmin } from '../lib/client-server.js';
import { isValidTicketCategory } from '../lib/ticket-categories.js';
import { ticketAttachmentUrl } from '../lib/ticket-attachments.js';

const OPEN_STATUSES: TicketStatus[] = ['open', 'awaiting_reply', 'in_progress'];

export function serializeTicketUser(user: Pick<User, 'id' | 'username' | 'email' | 'firstName' | 'lastName' | 'avatarUrl'>) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
  };
}

export function serializeTicketSummary(ticket: {
  id: string;
  number: number;
  subject: string;
  category: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  user: Parameters<typeof serializeTicketUser>[0];
  server: { id: string; name: string } | null;
  assignee: Parameters<typeof serializeTicketUser>[0] | null;
  messages: Array<{ createdAt: Date; isStaff: boolean }>;
}) {
  const lastMessage = ticket.messages[0] ?? null;
  return {
    id: ticket.id,
    number: ticket.number,
    subject: ticket.subject,
    category: ticket.category,
    status: ticket.status,
    priority: ticket.priority,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    closedAt: ticket.closedAt?.toISOString() ?? null,
    user: serializeTicketUser(ticket.user),
    server: ticket.server ? { id: ticket.server.id, name: ticket.server.name } : null,
    assignee: ticket.assignee ? serializeTicketUser(ticket.assignee) : null,
    lastMessageAt: lastMessage?.createdAt.toISOString() ?? null,
    lastMessageStaff: lastMessage?.isStaff ?? false,
  };
}

export function serializeTicketAttachment(attachment: {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}) {
  return {
    id: attachment.id,
    filename: attachment.filename,
    mimeType: attachment.mimeType,
    size: attachment.size,
    url: ticketAttachmentUrl(attachment.id),
  };
}

export function serializeTicketMessage(message: {
  id: string;
  body: string;
  isStaff: boolean;
  createdAt: Date;
  author: Parameters<typeof serializeTicketUser>[0];
  attachments?: Array<{
    id: string;
    filename: string;
    mimeType: string;
    size: number;
  }>;
}) {
  return {
    id: message.id,
    body: message.body,
    isStaff: message.isStaff,
    createdAt: message.createdAt.toISOString(),
    author: serializeTicketUser(message.author),
    attachments: (message.attachments ?? []).map(serializeTicketAttachment),
  };
}

export async function countOpenTicketsForUser(userId: string): Promise<number> {
  return prisma.supportTicket.count({
    where: { userId, status: { in: OPEN_STATUSES } },
  });
}

export async function assertUserCanAccessServerForTicket(userId: string, serverId: string) {
  const access = await getServerAccess(serverId, userId);
  if (!access) {
    const err = new Error('You do not have access to that server');
    (err as { statusCode?: number }).statusCode = 403;
    throw err;
  }
  return access.server;
}

export function validateTicketCategory(category: string) {
  if (!isValidTicketCategory(category)) {
    const err = new Error('Invalid ticket category');
    (err as { statusCode?: number }).statusCode = 422;
    throw err;
  }
}

export function nextStatusAfterUserReply(current: TicketStatus): TicketStatus {
  if (current === 'resolved' || current === 'closed') return current;
  return 'awaiting_reply';
}

export function nextStatusAfterStaffReply(current: TicketStatus): TicketStatus {
  if (current === 'resolved' || current === 'closed') return current;
  return 'in_progress';
}

export async function assertAssigneeIsStaff(assigneeId: string) {
  const user = await prisma.user.findUnique({
    where: { id: assigneeId },
    select: { id: true, role: true, rootAdmin: true, enabled: true },
  });
  if (!user || !user.enabled || !isPanelAdmin(user)) {
    const err = new Error('Assignee must be an active administrator');
    (err as { statusCode?: number }).statusCode = 422;
    throw err;
  }
  return user;
}

export const ticketInclude = {
  user: {
    select: { id: true, username: true, email: true, firstName: true, lastName: true, avatarUrl: true },
  },
  server: { select: { id: true, name: true } },
  assignee: {
    select: { id: true, username: true, email: true, firstName: true, lastName: true, avatarUrl: true },
  },
  messages: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: { createdAt: true, isStaff: true },
  },
};

export const ticketDetailInclude = {
  user: {
    select: { id: true, username: true, email: true, firstName: true, lastName: true, avatarUrl: true },
  },
  server: { select: { id: true, name: true } },
  assignee: {
    select: { id: true, username: true, email: true, firstName: true, lastName: true, avatarUrl: true },
  },
  messages: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      author: {
        select: { id: true, username: true, email: true, firstName: true, lastName: true, avatarUrl: true },
      },
      attachments: {
        orderBy: { createdAt: 'asc' as const },
        select: { id: true, filename: true, mimeType: true, size: true },
      },
    },
  },
};
