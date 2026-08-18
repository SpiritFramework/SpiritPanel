import type { TicketPriority, TicketStatus } from '../../lib/api';
import { ticketPriorityLabel, ticketStatusLabel, ticketPriorityTone, ticketStatusTone } from '../../lib/ticket-utils';
import { StatusPill } from '../ui';

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <StatusPill label={ticketStatusLabel(status)} tone={ticketStatusTone(status)} />;
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return <StatusPill label={ticketPriorityLabel(priority)} tone={ticketPriorityTone(priority)} />;
}
