/** Structured logging for FeatherWings sync / request failures. */
export function logWingsFailure(
  context: string,
  err: unknown,
  meta?: Record<string, unknown>,
): void {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[wings] ${context}: ${message}`, meta ?? {});
}

/** Fire-and-forget Wings sync — logs failures instead of swallowing them. */
export function wingsSyncFireAndForget(
  context: string,
  promise: Promise<unknown>,
  meta?: Record<string, unknown>,
): void {
  void promise.catch((err) => logWingsFailure(context, err, meta));
}
