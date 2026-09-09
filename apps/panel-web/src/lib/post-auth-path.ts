/** Safe post-login redirect from RequireAuth `location.state.from`. */
export function resolvePostAuthPath(from: unknown, fallback: string): string {
  if (typeof from !== 'string') return fallback;
  // Same-app relative path only — reject protocol-relative / open redirects.
  if (!from.startsWith('/') || from.startsWith('//')) return fallback;
  return from;
}
