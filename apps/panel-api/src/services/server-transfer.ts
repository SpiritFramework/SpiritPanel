import type { PrismaClient } from '@prisma/client';
import { logActivity } from './activity.js';

/**
 * Destination node reports a successful incoming transfer.
 * The server record should already exist on this node (created by the panel before transfer).
 */
export async function handleTransferSuccess(
  prisma: PrismaClient,
  server: { id: string; uuid: string; name: string; nodeId: string },
  nodeId: string,
) {
  await prisma.server.update({
    where: { id: server.id },
    data: {
      status: 'normal',
      containerState: 'offline',
      installStatus: 'installed',
    },
  });

  await logActivity({
    event: 'server.transfer.success',
    description: `Server "${server.name}" transfer completed successfully`,
    serverId: server.id,
    nodeId,
    properties: { serverUuid: server.uuid },
  });
}

/**
 * Source or destination node reports a failed transfer.
 * Resets panel flags so the server is not left in a stuck transferring state.
 */
export async function handleTransferFailure(
  prisma: PrismaClient,
  server: { id: string; uuid: string; name: string; nodeId: string },
  nodeId: string,
) {
  await prisma.server.update({
    where: { id: server.id },
    data: {
      status: 'normal',
      containerState: 'offline',
    },
  });

  await logActivity({
    event: 'server.transfer.failed',
    description: `Server "${server.name}" transfer failed`,
    serverId: server.id,
    nodeId,
    properties: { serverUuid: server.uuid },
  });
}
