import { getServerDisplayStatus, type ServerStatusFields } from '../lib/server-runtime';
import { StatusPill, type Tone } from './ui';

function mapTone(tone: 'success' | 'warning' | 'danger' | 'muted' | 'info'): Tone {
  return tone === 'muted' ? 'neutral' : tone;
}

export function ServerStatusBadge({
  status,
  suspended,
  installStatus,
  containerState,
  runtimeState,
  wsConnected,
  compact,
  onDark,
}: ServerStatusFields & {
  /** Live container state from websocket (server detail pages). */
  runtimeState?: string | null;
  wsConnected?: boolean;
  compact?: boolean;
  onDark?: boolean;
}) {
  const display = getServerDisplayStatus(
    { status, suspended, installStatus, containerState },
    { runtimeState, wsConnected },
  );

  return (
    <StatusPill
      label={display.label}
      tone={mapTone(display.tone)}
      compact={compact}
      pulse={display.pulse}
      onDark={onDark}
    />
  );
}
