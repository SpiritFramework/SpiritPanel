import { prisma } from './prisma.js';

export async function verifyDatabaseConnection(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}

export async function closeDatabase(): Promise<void> {
  await prisma.$disconnect();
}
