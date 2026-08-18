export const TICKET_CATEGORIES = [
  { id: 'technical', label: 'Technical issue' },
  { id: 'billing', label: 'Billing' },
  { id: 'server', label: 'Server problem' },
  { id: 'account', label: 'Account' },
  { id: 'other', label: 'Other' },
] as const;

export type TicketCategoryId = (typeof TICKET_CATEGORIES)[number]['id'];

const categoryIds = new Set<string>(TICKET_CATEGORIES.map((c) => c.id));

export function isValidTicketCategory(value: string): value is TicketCategoryId {
  return categoryIds.has(value);
}

export function ticketCategoryLabel(id: string): string {
  return TICKET_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}
