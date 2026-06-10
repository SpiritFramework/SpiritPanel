export class ResourceQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResourceQuotaError';
  }
}

/** Limit 0 means none allowed — not unlimited. */
export function canCreateUnderLimit(limit: number, used: number): boolean {
  const safeLimit = limit ?? 0;
  const safeUsed = used ?? 0;
  return safeUsed < safeLimit;
}

export function resourceQuotaMeta(limit: number, used: number, hasPermission: boolean) {
  const safeLimit = limit ?? 0;
  const safeUsed = used ?? 0;
  return {
    limit: safeLimit,
    used: safeUsed,
    canCreate: hasPermission && canCreateUnderLimit(safeLimit, safeUsed),
  };
}

export function assertUnderLimit(limit: number, used: number, resourceLabel: string) {
  const safeLimit = limit ?? 0;
  const safeUsed = used ?? 0;
  if (safeUsed >= safeLimit) {
    throw new ResourceQuotaError(
      safeLimit === 0
        ? `${resourceLabel}s are not allowed on this server (limit 0).`
        : `${resourceLabel} limit reached (${safeLimit}). Delete an existing ${resourceLabel.toLowerCase()} before creating another.`,
    );
  }
}
