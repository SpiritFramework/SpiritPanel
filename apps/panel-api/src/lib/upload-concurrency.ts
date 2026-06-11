const activeByUser = new Map<string, number>();

const MAX_CONCURRENT_UPLOADS_PER_USER = 2;

export class UploadConcurrencyError extends Error {
  constructor() {
    super('Too many concurrent uploads. Please wait for existing uploads to finish.');
    this.name = 'UploadConcurrencyError';
  }
}

export function acquireUploadSlot(userId: string): void {
  const current = activeByUser.get(userId) ?? 0;
  if (current >= MAX_CONCURRENT_UPLOADS_PER_USER) {
    throw new UploadConcurrencyError();
  }
  activeByUser.set(userId, current + 1);
}

export function releaseUploadSlot(userId: string): void {
  const current = activeByUser.get(userId) ?? 0;
  if (current <= 1) {
    activeByUser.delete(userId);
  } else {
    activeByUser.set(userId, current - 1);
  }
}

/** Max single file upload size — aligned with nginx client_max_body_size (100M). */
export const MAX_UPLOAD_FILE_BYTES = 100 * 1024 * 1024;
