import type { FastifyRequest } from 'fastify';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import {
  MAX_TICKET_IMAGES_PER_MESSAGE,
  saveTicketImage,
  resolveTicketAttachmentPath,
  ticketAttachmentExists,
} from '../lib/ticket-attachments.js';
import { isPanelAdmin } from '../lib/client-server.js';
import { ticketDetailInclude } from '../services/tickets.js';

const jsonMessageSchema = z.object({
  body: z.string().trim().max(10000).optional().default(''),
});

interface MultipartPart {
  type: 'file' | 'field';
  fieldname: string;
  filename?: string;
  mimetype?: string;
  file?: import('node:stream').Readable & { truncated?: boolean };
  value?: string;
  toBuffer: () => Promise<Buffer>;
}

export interface ParsedTicketMessage {
  body: string;
  images: Array<{ buffer: Buffer; mimeType: string; filename: string }>;
}

export async function parseTicketMessageRequest(request: FastifyRequest): Promise<ParsedTicketMessage> {
  const contentType = request.headers['content-type'] ?? '';

  if (contentType.includes('multipart/form-data')) {
    let body = '';
    const images: ParsedTicketMessage['images'] = [];

    const parts = (request as unknown as { parts: () => AsyncIterable<MultipartPart> }).parts();
    for await (const part of parts) {
      if (part.type === 'field' && part.fieldname === 'body') {
        body = (part.value ?? '').trim();
        continue;
      }
      if (part.type !== 'file' || part.fieldname !== 'images') continue;
      if (part.file?.truncated) {
        throw Object.assign(new Error('Image too large (max 5 MB)'), { statusCode: 413 });
      }
      const buffer = await part.toBuffer();
      images.push({
        buffer,
        mimeType: part.mimetype ?? 'application/octet-stream',
        filename: part.filename ?? 'image',
      });
    }

    if (images.length > MAX_TICKET_IMAGES_PER_MESSAGE) {
      throw Object.assign(new Error(`You can attach at most ${MAX_TICKET_IMAGES_PER_MESSAGE} images per message`), {
        statusCode: 422,
      });
    }

    return { body, images };
  }

  const parsed = jsonMessageSchema.parse(request.body);
  return { body: parsed.body.trim(), images: [] };
}

export function assertMessageHasContent(body: string, imageCount: number) {
  if (!body && imageCount === 0) {
    throw Object.assign(new Error('Message must include text or at least one image'), { statusCode: 422 });
  }
}

export async function createTicketMessage(
  ticketId: string,
  authorId: string,
  isStaff: boolean,
  payload: ParsedTicketMessage,
) {
  assertMessageHasContent(payload.body, payload.images.length);

  const savedImages: Array<{
    id: string;
    storageName: string;
    filename: string;
    mimeType: string;
    size: number;
  }> = [];

  for (const image of payload.images) {
    savedImages.push(await saveTicketImage(ticketId, image.mimeType, image.buffer, image.filename));
  }

  return prisma.$transaction(async (tx) => {
    const message = await tx.ticketMessage.create({
      data: {
        ticketId,
        authorId,
        body: payload.body,
        isStaff,
        attachments: {
          create: savedImages.map((img) => ({
            id: img.id,
            filename: img.filename,
            mimeType: img.mimeType,
            size: img.size,
            storageName: img.storageName,
          })),
        },
      },
    });

    return message;
  });
}

export async function loadTicketAttachmentForUser(attachmentId: string, userId: string, userRole: { role: string; rootAdmin: boolean }) {
  const attachment = await prisma.ticketAttachment.findUnique({
    where: { id: attachmentId },
    include: {
      message: {
        include: {
          ticket: { select: { id: true, userId: true } },
        },
      },
    },
  });

  if (!attachment) return null;

  const ticket = attachment.message.ticket;
  const isOwner = ticket.userId === userId;
  const isAdmin = isPanelAdmin(userRole);
  if (!isOwner && !isAdmin) return null;

  const path = resolveTicketAttachmentPath(ticket.id, attachment.storageName);
  if (!path || !(await ticketAttachmentExists(ticket.id, attachment.storageName))) return null;

  const data = await readFile(path);
  return { data, mimeType: attachment.mimeType, filename: attachment.filename };
}

export async function reloadTicketDetail(ticketId: string) {
  return prisma.supportTicket.findUniqueOrThrow({
    where: { id: ticketId },
    include: ticketDetailInclude,
  });
}
