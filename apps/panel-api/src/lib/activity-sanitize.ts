/** Avoid storing secrets typed into the console in activity logs. */
export function redactedCommandProperties(command: string): Record<string, unknown> {
  const trimmed = command.trim();
  return {
    commandRedacted: true,
    commandLength: trimmed.length,
  };
}

export function redactedTextProperty(field: string, value: string): Record<string, unknown> {
  return {
    [`${field}Redacted`]: true,
    [`${field}Length`]: value.trim().length,
  };
}
