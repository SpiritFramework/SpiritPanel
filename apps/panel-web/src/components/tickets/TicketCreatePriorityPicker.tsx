import type { TicketPriority } from '../../lib/api';
import { ticketPriorityLabel } from '../../lib/ticket-utils';

const OPTIONS: Array<{
  value: TicketPriority;
  hint: string;
}> = [
  { value: 'low', hint: 'General question, no rush' },
  { value: 'normal', hint: 'Standard support request' },
  { value: 'high', hint: 'Affecting your service' },
  { value: 'urgent', hint: 'Critical — needs immediate help' },
];

/** Priority picker for the new-ticket form only — users cannot change priority after creation. */
export function TicketCreatePriorityPicker({
  value,
  onChange,
  disabled,
}: {
  value: TicketPriority;
  onChange: (priority: TicketPriority) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="ticket-create-priority" disabled={disabled}>
      <legend className="ticket-create-priority__label">How urgent is this?</legend>
      <p className="ticket-create-priority__hint">You can set priority when opening a ticket. Staff may adjust it later.</p>
      <div className="ticket-create-priority__grid" role="radiogroup" aria-label="Ticket priority">
        {OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`ticket-create-priority__option ticket-create-priority__option--${option.value}${
                selected ? ' ticket-create-priority__option--selected' : ''
              }`}
              onClick={() => onChange(option.value)}
            >
              <span className="ticket-create-priority__option-label">{ticketPriorityLabel(option.value)}</span>
              <span className="ticket-create-priority__option-hint">{option.hint}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
