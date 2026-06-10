import { ServerStatusBadge } from '../ServerStatusBadge';

/** @deprecated Use ServerStatusBadge directly — kept for existing admin imports. */
export function AdminServerStatusBadge({
  status,
  suspended,
  installStatus,
  containerState,
  compact,
  onDark,
}: {
  status: string;
  suspended?: boolean;
  installStatus?: string;
  containerState?: string | null;
  compact?: boolean;
  onDark?: boolean;
}) {
  return (
    <ServerStatusBadge
      status={status}
      suspended={suspended}
      installStatus={installStatus}
      containerState={containerState}
      compact={compact}
      onDark={onDark}
    />
  );
}
