import { prisma } from '../src/lib/prisma.js';
import { seedDemoStats } from '../src/services/server-stats.js';

/**
 * Refresh synthetic analytics history for local demo servers so node/server
 * Analytics charts have current 1h / 24h / 7d data.
 */
async function main() {
  const servers = await prisma.server.findMany({
    where: {
      OR: [
        { name: { in: ['Demo Minecraft Server', 'Demo FiveM Server'] } },
        { uuid: { in: ['00000000-0000-0000-0000-000000000020', 'f1ve0000-0000-0000-0000-000000000021'] } },
      ],
    },
    select: { id: true, name: true, memory: true, disk: true, nodeId: true },
  });

  if (servers.length === 0) {
    console.error('No demo servers found');
    process.exit(1);
  }

  for (const server of servers) {
    const before = await prisma.serverStatSnapshot.count({ where: { serverId: server.id } });
    if (before > 0) {
      await prisma.serverStatSnapshot.deleteMany({ where: { serverId: server.id } });
      console.log(`Cleared ${before} snapshots for ${server.name}`);
    }

    // seedDemoStats no-ops when rows already exist — clear first above.
    await seedDemoStats(server.id, server.memory, server.disk);
    const after = await prisma.serverStatSnapshot.count({ where: { serverId: server.id } });
    console.log(`Seeded ${after} snapshots for ${server.name} (${server.id})`);
  }

  const nodeIds = [...new Set(servers.map((s) => s.nodeId))];
  console.log(`Done. Open Analytics on node(s): ${nodeIds.join(', ')}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
