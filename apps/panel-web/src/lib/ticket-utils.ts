import type { TicketPriority, TicketStatus } from '../lib/api';

export const TICKET_CATEGORIES = [
  { id: 'technical', label: 'Technical issue' },
  { id: 'billing', label: 'Billing' },
  { id: 'server', label: 'Server problem' },
  { id: 'account', label: 'Account' },
  { id: 'other', label: 'Other' },
] as const;

export function ticketCategoryLabel(id: string): string {
  return TICKET_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function ticketStatusLabel(status: TicketStatus): string {
  switch (status) {
    case 'open':
      return 'Open';
    case 'awaiting_reply':
      return 'Awaiting reply';
    case 'in_progress':
      return 'In progress';
    case 'resolved':
      return 'Resolved';
    case 'closed':
      return 'Closed';
    default:
      return status;
  }
}

export function ticketPriorityLabel(priority: TicketPriority): string {
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

export function ticketStatusTone(status: TicketStatus): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  switch (status) {
    case 'open':
      return 'info';
    case 'awaiting_reply':
      return 'warning';
    case 'in_progress':
      return 'neutral';
    case 'resolved':
      return 'success';
    case 'closed':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function ticketPriorityTone(priority: TicketPriority): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  switch (priority) {
    case 'low':
      return 'neutral';
    case 'normal':
      return 'info';
    case 'high':
      return 'warning';
    case 'urgent':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function displayTicketUser(user: {
  username: string;
  firstName: string | null;
  lastName: string | null;
}): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || user.username;
}

export function formatTicketTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
