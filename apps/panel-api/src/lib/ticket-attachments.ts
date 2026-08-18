import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

const TICKETS_DIR = resolve(process.cwd(), 'data', 'tickets');

const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export const TICKET_IMAGE_MIMES = new Set(Object.keys(MIME_EXT));
export const MAX_TICKET_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_TICKET_IMAGES_PER_MESSAGE = 5;

export const TICKET_ATTACHMENT_PREFIX = '/api/client/tickets/attachments';

export function ticketAttachmentUrl(attachmentId: string): string {
  return `${TICKET_ATTACHMENT_PREFIX}/${attachmentId}`;
}

function ticketDir(ticketId: string): string {
  return join(TICKETS_DIR, ticketId);
}

export function attachmentStorageName(attachmentId: string, mimeType: string): string {
  const ext = MIME_EXT[mimeType] ?? 'bin';
  return `${attachmentId}.${ext}`;
}

export function resolveTicketAttachmentPath(ticketId: string, storageName: string): string | null {
  if (!/^[a-z0-9]+\.[a-z0-9]+$/i.test(storageName)) return null;
  return join(ticketDir(ticketId), storageName);
}

export async function ensureTicketDir(ticketId: string) {
  await mkdir(ticketDir(ticketId), { recursive: true });
}

export async function saveTicketImage(
  ticketId: string,
  mimeType: string,
  buffer: Buffer,
  originalFilename: string,
): Promise<{ id: string; storageName: string; filename: string; mimeType: string; size: number }> {
  if (!TICKET_IMAGE_MIMES.has(mimeType)) {
    throw Object.assign(new Error('Only image files are allowed (PNG, JPEG, WebP, GIF)'), { statusCode: 422 });
  }
  if (buffer.length > MAX_TICKET_IMAGE_BYTES) {
    throw Object.assign(new Error('Image too large (max 5 MB)'), { statusCode: 413 });
  }

  const id = randomBytes(12).toString('hex');
  const storageName = attachmentStorageName(id, mimeType);
  const safeName = originalFilename.replace(/[^\w.\-() ]+/g, '_').slice(0, 120) || storageName;

  await ensureTicketDir(ticketId);
  await writeFile(join(ticketDir(ticketId), storageName), buffer);

  return { id, storageName, filename: safeName, mimeType, size: buffer.length };
}

export async function ticketAttachmentExists(ticketId: string, storageName: string): Promise<boolean> {
  const path = resolveTicketAttachmentPath(ticketId, storageName);
  if (!path) return false;
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function deleteTicketAttachments(ticketId: string) {
  try {
    await rm(ticketDir(ticketId), { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
