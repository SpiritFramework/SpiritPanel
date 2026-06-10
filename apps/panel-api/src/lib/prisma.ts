import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export type { User, Server, Node, Egg, Nest, Allocation } from '@prisma/client';
