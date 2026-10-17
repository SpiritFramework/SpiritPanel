import { prisma } from '../src/lib/prisma.js';
import { seedDemoStats } from '../src/services/server-stats.js';

async function main() {
  const server = await prisma.server.findFirst({
    where: { OR: [{ name: 'Demo Minecraft Server' }, { uuid: '00000000-0000-0000-0000-000000000020' }] },
  });
  if (!server) {
    console.error('Demo server not found');
    process.exit(1);
  }

  const before = await prisma.serverStatSnapshot.count({ where: { serverId: server.id } });
  if (before > 0) {
    await prisma.serverStatSnapshot.deleteMany({ where: { serverId: server.id } });
    console.log(`Cleared ${before} existing snapshots`);
  }

  await seedDemoStats(server.id, server.memory, server.disk);
  const after = await prisma.serverStatSnapshot.count({ where: { serverId: server.id } });
  console.log(`Seeded ${after} analytics snapshots for ${server.name} (${server.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
