import type { FastifyBaseLogger, FastifyReply } from 'fastify';

export const CLIENT_ERRORS = {
  generic: 'Something went wrong. Please try again.',
  wings: 'The game node could not complete this request. Please try again or contact support.',
  database: 'The database operation failed. Please verify your settings or try again.',
  upload: 'File upload failed. Please try again.',
  marketplace: 'The marketplace request could not be completed. Please try again.',
  schedule: 'The scheduled task could not be run. Please try again.',
  power: 'The power action could not be sent. Please try again.',
  backup: 'The backup operation could not be completed. Please try again.',
  install: 'The install operation could not be completed. Please try again.',
} as const;

export type ClientErrorCategory = keyof typeof CLIENT_ERRORS;

export function logServerError(
  log: FastifyBaseLogger | undefined,
  err: unknown,
  context: string,
  extra?: Record<string, unknown>,
): void {
  log?.error({ err, ...extra }, context);
}

export function clientError(
  category: ClientErrorCategory,
  log?: FastifyBaseLogger,
  err?: unknown,
  context?: string,
): string {
  if (log && err) {
    logServerError(log, err, context ?? category);
  }
  return CLIENT_ERRORS[category];
}

export function sendClientError(
  reply: FastifyReply,
  statusCode: number,
  category: ClientErrorCategory,
  log?: FastifyBaseLogger,
  err?: unknown,
  context?: string,
) {
  return reply.status(statusCode).send({
    error: clientError(category, log, err, context),
  });
}
