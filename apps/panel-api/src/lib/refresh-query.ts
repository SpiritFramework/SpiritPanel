/** Parse `?refresh=true` from route query objects. */
export function parseRefreshQuery(query: Record<string, unknown> | undefined): boolean {
  const value = query?.refresh;
  return value === 'true' || value === '1';
}
