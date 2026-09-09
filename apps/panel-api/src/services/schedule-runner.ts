import { prisma } from '../lib/prisma.js';
import { assertUnderLimit, ResourceQuotaError } from '../lib/server-quotas.js';
import { assertBackupFitsDiskBudget } from '../lib/server-disk-budget.js';
import { fetchLiveContainerState } from './server-runtime-status.js';
import { wingsForNode } from './wings-client.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function serverIsOnline(server: { uuid: string; node: Parameters<typeof wingsForNode>[0] }): Promise<boolean> {
  const state = await fetchLiveContainerState(server.node, server.uuid);
  return state === 'running' || state === 'starting';
}

async function runBackupTask(
  server: {
    id: string;
    uuid: string;
    disk: number;
    backupLimit: number;
    node: Parameters<typeof wingsForNode>[0];
  },
  payload: string,
): Promise<void> {
  const name = payload.trim() || `Scheduled ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;

  let backup;
  try {
    await assertBackupFitsDiskBudget(server, prisma);

    backup = await prisma.$transaction(async (tx) => {
      const row = await tx.server.findUnique({
        where: { id: server.id },
        select: { backupLimit: true },
      });
      if (!row) throw new ResourceQuotaError('Server not found');

      const count = await tx.backup.count({ where: { serverId: server.id } });
      assertUnderLimit(row.backupLimit, count, 'Backup');

      return tx.backup.create({
        data: { serverId: server.id, name, ignored: '[]' },
      });
    });
  } catch (err) {
    if (err instanceof ResourceQuotaError) {
      throw new Error(err.message);
    }
    throw err;
  }

  try {
    const wings = wingsForNode(server.node);
    const adapter = await wings.resolveBackupAdapter();
    await wings.createBackup(server.uuid, backup.uuid, '', adapter);
    if (adapter !== backup.disk) {
      await prisma.backup.update({ where: { id: backup.id }, data: { disk: adapter } }).catch(() => {});
    }
  } catch (err) {
    await prisma.backup.delete({ where: { id: backup.id } }).catch(() => {});
    throw err;
  }
}

export async function executeSchedule(
  scheduleId: string,
  options?: { manual?: boolean },
): Promise<void> {
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    include: {
      tasks: { orderBy: { sequenceId: 'asc' } },
      server: { include: { node: true } },
    },
  });

  if (!schedule) {
    throw new Error('Schedule not found');
  }

  if (!options?.manual && !schedule.isActive) {
    return;
  }

  // Claim the run slot before work so overlapping polls cannot enqueue a second run.
  if (!options?.manual) {
    const claimed = await prisma.schedule.updateMany({
      where: {
        id: scheduleId,
        isActive: true,
        OR: [
          { lastRunAt: null },
          { lastRunAt: { lt: new Date(Date.now() - 55_000) } },
        ],
      },
      data: { lastRunAt: new Date() },
    });
    if (claimed.count !== 1) {
      return;
    }
  }

  if (schedule.onlyWhenOnline) {
    const online = await serverIsOnline(schedule.server);
    if (!online) {
      console.log(`[schedules] Skipped "${schedule.name}" — server offline (onlyWhenOnline)`);
      return;
    }
  }

  const wings = wingsForNode(schedule.server.node);

  for (const task of schedule.tasks) {
    if (task.timeOffset > 0) {
      await delay(task.timeOffset * 1000);
    }

    try {
      if (task.action === 'power') {
        const action = task.payload.trim() || 'restart';
        if (!['start', 'stop', 'restart', 'kill'].includes(action)) {
          throw new Error('Invalid scheduled power action');
        }
        await wings.power(schedule.server.uuid, action);
      } else if (task.action === 'command') {
        await wings.sendCommand(schedule.server.uuid, task.payload);
      } else if (task.action === 'backup') {
        await runBackupTask(schedule.server, task.payload);
      } else {
        console.warn(`[schedules] Unknown task action "${task.action}" on schedule ${schedule.id}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[schedules] Task failed (${task.action}) on "${schedule.name}": ${message}`);
      if (!task.continueOnFailure) break;
    }
  }

  await prisma.schedule.update({
    where: { id: schedule.id },
    data: { lastRunAt: new Date() },
  });
}
