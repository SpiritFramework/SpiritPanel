import { Queue, Worker } from 'bullmq';
import { cronMatchesNow } from '../lib/cron-match.js';
import { getConfig } from '../lib/env.js';
import { prisma } from '../lib/prisma.js';
import { executeSchedule } from '../services/schedule-runner.js';

let scheduleQueue: Queue | null = null;
let scheduleWorker: Worker | null = null;
let pollInterval: ReturnType<typeof setInterval> | null = null;

const MIN_RUN_INTERVAL_MS = 55_000;

function redisConnection() {
  const config = getConfig();
  return {
    host: config.redisHost,
    port: config.redisPort,
  };
}

function getScheduleQueue(): Queue {
  if (!scheduleQueue) {
    scheduleQueue = new Queue('schedules', { connection: redisConnection() });
  }
  return scheduleQueue;
}

export function startScheduleWorker() {
  if (scheduleWorker || pollInterval) return;

  const config = getConfig();
  if (config.disableScheduleWorker) {
    console.log('[schedules] Worker disabled (DISABLE_SCHEDULE_WORKER=true)');
    return;
  }

  try {
    scheduleWorker = new Worker(
      'schedules',
      async (job) => {
        const { scheduleId } = job.data as { scheduleId: string };
        await executeSchedule(scheduleId);
      },
      { connection: redisConnection() },
    );

    scheduleWorker.on('error', (err) => {
      console.error('[schedules] Worker error:', err.message);
    });

    pollInterval = setInterval(async () => {
      try {
        const schedules = await prisma.schedule.findMany({ where: { isActive: true } });
        const now = Date.now();
        for (const schedule of schedules) {
          if (!cronMatchesNow(schedule.cron)) continue;
          if (schedule.lastRunAt && now - schedule.lastRunAt.getTime() < MIN_RUN_INTERVAL_MS) {
            continue;
          }
          await getScheduleQueue().add(
            'run',
            { scheduleId: schedule.id },
            { jobId: `${schedule.id}-${Math.floor(now / 60_000)}`, removeOnComplete: true },
          );
        }
      } catch (err) {
        console.error('[schedules] Poll error:', err instanceof Error ? err.message : err);
      }
    }, 60_000);

    console.log('[schedules] Worker started');
  } catch (err) {
    console.warn(
      '[schedules] Failed to start worker — set DISABLE_SCHEDULE_WORKER=true if Redis is unavailable:',
      err instanceof Error ? err.message : err,
    );
  }
}

export async function stopScheduleWorker() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  if (scheduleWorker) {
    await scheduleWorker.close();
    scheduleWorker = null;
  }
  if (scheduleQueue) {
    await scheduleQueue.close();
    scheduleQueue = null;
  }
}

export async function enqueueScheduleRun(scheduleId: string) {
  await getScheduleQueue().add('run', { scheduleId }, { removeOnComplete: true });
}
