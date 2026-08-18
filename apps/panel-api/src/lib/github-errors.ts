/** Normalize GitHub HTTP failures into short client-safe errors with statusCode. */

export function githubHttpError(status: number, bodyText = ''): Error & { status: number; statusCode: number } {
  const lowered = bodyText.toLowerCase();
  const rateLimited =
    status === 429 ||
    (status === 403 && (lowered.includes('rate limit') || lowered.includes('secondary rate limit')));

  let message: string;
  let statusCode = status;

  if (rateLimited) {
    statusCode = 429;
    message =
      'GitHub rate limit reached — add a token under Profile → Security, or ask the host to set GITHUB_TOKEN.';
  } else if (status === 401) {
    statusCode = 401;
    message = 'GitHub rejected the configured token. Check GITHUB_TOKEN / your profile PAT.';
  } else if (status === 404) {
    statusCode = 404;
    message = 'GitHub repository not found (it may be private, renamed, or deleted).';
  } else if (status === 422) {
    statusCode = 400;
    message = 'GitHub rejected that request — try a shorter search term.';
  } else if (status >= 500) {
    statusCode = 502;
    message = 'GitHub is temporarily unavailable. Try again in a moment.';
  } else {
    statusCode = status >= 400 && status < 500 ? status : 502;
    message = `GitHub request failed (${status}).`;
  }

  return Object.assign(new Error(message), { status, statusCode });
}

export function httpStatusFromUnknown(err: unknown, fallback = 400): number {
  const e = err as { statusCode?: number; status?: number };
  return e.statusCode ?? e.status ?? fallback;
}
