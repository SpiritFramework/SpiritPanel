import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isWeakAdminPassword } from '../src/lib/secret-validation.js';
import { generateUuidShort } from '../src/services/server-configuration.js';
import { seedDemoStats } from '../src/services/server-stats.js';
import { seedMarketplacePlugins } from '../src/services/marketplace-seed.js';
import { PANEL_PRODUCT, PANEL_TAGLINE } from '../src/lib/product-meta.js';

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env') });

const prisma = new PrismaClient();

const DEMO_NODE_UUID = '00000000-0000-0000-0000-000000000010';
const DEMO_SERVER_UUID = '00000000-0000-0000-0000-000000000020';
const DEMO_FIVEM_NEST_UUID = '00000000-0000-0000-0000-000000000002';
/** Distinct leading hex so uuidShort does not collide with the Minecraft demo. */
const DEMO_FIVEM_SERVER_UUID = 'f1ve0000-0000-0000-0000-000000000021';

async function seedAdminUser(isProduction: boolean) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminUsername = process.env.ADMIN_USERNAME?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (isProduction) {
    if (!adminEmail || !adminUsername || !adminPassword) {
      console.error('');
      console.error('Production seed requires ADMIN_EMAIL, ADMIN_USERNAME, and ADMIN_PASSWORD in .env');
      console.error('');
      process.exit(1);
    }
    if (isWeakAdminPassword(adminPassword)) {
      console.error('');
      console.error('Production seed blocked: ADMIN_PASSWORD must be 12+ characters.');
      console.error('');
      process.exit(1);
    }
  }

  const email = adminEmail ?? 'admin@example.com';
  const username = adminUsername ?? 'admin';
  const password = adminPassword ?? 'admin123!';

  const adminHash = await bcrypt.hash(password, 12);

  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      username,
      passwordHash: adminHash,
      firstName: process.env.ADMIN_FIRST_NAME?.trim() || null,
      lastName: process.env.ADMIN_LAST_NAME?.trim() || null,
      role: 'admin',
      rootAdmin: true,
    },
  });
}

async function seedPanelSettings() {
  await prisma.panelSetting.upsert({
    where: { key: 'registration_enabled' },
    update: {},
    create: { key: 'registration_enabled', value: { enabled: false } },
  });

  await prisma.panelSetting.upsert({
    where: { key: 'branding' },
    update: {},
    create: {
      key: 'branding',
      value: {
        panelName: PANEL_PRODUCT,
        tagline: PANEL_TAGLINE,
        logoUrl: '',
        faviconUrl: '',
        accentColor: '#6366f1',
        secondaryColor: '#8b5cf6',
        loginMessage: 'Sign in to manage your game servers',
      },
    },
  });

  await prisma.panelSetting.upsert({
    where: { key: 'general' },
    update: {},
    create: { key: 'general', value: { companyName: '', supportEmail: '', supportUrl: '', footerText: '' } },
  });

  await prisma.panelSetting.upsert({
    where: { key: 'maintenance' },
    update: {},
    create: {
      key: 'maintenance',
      value: {
        enabled: false,
        message: 'The panel is temporarily down for maintenance. Please check back soon.',
        allowAdminLogin: true,
      },
    },
  });

  await prisma.panelSetting.upsert({
    where: { key: 'security' },
    update: {},
    create: { key: 'security', value: { minPasswordLength: 8 } },
  });

  await prisma.panelSetting.upsert({
    where: { key: 'marketplace' },
    update: {},
    create: {
      key: 'marketplace',
      value: { enabled: true, allowGithubInstalls: true },
    },
  });

  // Keep host catalog + GitHub installs on for local marketplace preview.
  await prisma.panelPlugin.upsert({
    where: { id: 'fivem-marketplace' },
    update: {
      enabled: true,
      settings: {
        enabled: true,
        allowGithubInstalls: true,
        allowCatalogInstalls: true,
      },
    },
    create: {
      id: 'fivem-marketplace',
      name: 'FiveM Marketplace',
      description: 'Curated resource catalog and GitHub installs for FiveM servers.',
      version: '1.0.0',
      author: 'SpiritFramework',
      builtIn: true,
      enabled: true,
      settings: {
        enabled: true,
        allowGithubInstalls: true,
        allowCatalogInstalls: true,
      },
    },
  });
}

async function ensureDemoNode(locationId: string) {
  return prisma.node.upsert({
    where: { uuid: DEMO_NODE_UUID },
    update: { name: 'Demo Node' },
    create: {
      uuid: DEMO_NODE_UUID,
      locationId,
      name: 'Demo Node',
      description: 'Local preview node — UI only, no Wings required',
      fqdn: '127.0.0.1',
      scheme: 'http',
      memory: 16384,
      disk: 100000,
      daemonTokenId: 'demoTokenId00001',
      daemonTokenSecret: 'demoTokenSecretLocalDevOnlyNotForProduction',
      daemonListen: 8080,
      daemonSftp: 2022,
    },
  });
}

async function ensureAllocation(nodeId: string, port: number) {
  let allocation = await prisma.allocation.findFirst({
    where: { nodeId, ip: '0.0.0.0', port },
  });
  if (!allocation) {
    allocation = await prisma.allocation.create({
      data: { nodeId, ip: '0.0.0.0', port },
    });
  }
  return allocation;
}

async function seedDemoServer(adminId: string, locationId: string, nestId: string) {
  const egg = await prisma.egg.findFirst({
    where: { nestId, name: 'Vanilla Minecraft' },
    include: { variables: true },
  });
  if (!egg) return null;

  const node = await ensureDemoNode(locationId);
  const allocation = await ensureAllocation(node.id, 25565);

  const existing = await prisma.server.findUnique({ where: { uuid: DEMO_SERVER_UUID } });
  if (existing) return existing;

  const dockerImages = egg.dockerImages as Record<string, string>;
  const image = Object.values(dockerImages)[0] ?? 'ghcr.io/pterodactyl/yolks:java_21';

  return prisma.$transaction(async (tx) => {
    const server = await tx.server.create({
      data: {
        uuid: DEMO_SERVER_UUID,
        uuidShort: generateUuidShort(DEMO_SERVER_UUID),
        ownerId: adminId,
        nodeId: node.id,
        eggId: egg.id,
        allocationId: allocation.id,
        name: 'Demo Minecraft Server',
        description: 'Browse the panel UI — live console needs a FeatherWings node',
        status: 'normal',
        installStatus: 'installed',
        installedAt: new Date(),
        memory: 2048,
        disk: 10240,
        cpu: 100,
        image,
        startup: egg.startup,
        variables: {
          create: egg.variables.map((v) => ({
            eggVariableId: v.id,
            variableValue: v.defaultValue,
          })),
        },
      },
    });

    await tx.allocation.update({
      where: { id: allocation.id },
      data: { assigned: true },
    });

    return server;
  });
}

async function seedDemoFiveMServer(adminId: string, locationId: string) {
  const nest = await prisma.nest.upsert({
    where: { uuid: DEMO_FIVEM_NEST_UUID },
    update: { name: 'FiveM', description: 'Cfx.re / FiveM server eggs' },
    create: {
      uuid: DEMO_FIVEM_NEST_UUID,
      name: 'FiveM',
      description: 'Cfx.re / FiveM server eggs',
    },
  });

  let egg = await prisma.egg.findFirst({
    where: { nestId: nest.id, name: 'FiveM' },
    include: { variables: true },
  });

  if (!egg) {
    egg = await prisma.egg.create({
      data: {
        nestId: nest.id,
        name: 'FiveM',
        description: 'FXServer — local UI preview for the FiveM marketplace',
        features: ['fivem'],
        dockerImages: {
          'FXServer': 'ghcr.io/parkervcp/yolks:fivem',
        },
        startup:
          '$(pwd)/alpine/opt/cfx-server/FXServer +set citizen_dir $(pwd)/alpine/opt/cfx-server/citizen/ +exec server.cfg',
        configStop: '^C',
        configStartup: { done: 'Authenticated with cfx.re' },
        scriptContainer: 'ghcr.io/pterodactyl/installers:debian',
        scriptEntry: 'bash',
        scriptInstall: `#!/bin/bash
# Demo egg — install script not used for local UI preview
echo "FiveM demo egg"
`,
        variables: {
          create: [
            {
              name: 'Max Players',
              envVariable: 'MAX_PLAYERS',
              defaultValue: '48',
              userViewable: true,
              userEditable: true,
            },
            {
              name: 'Server License Key',
              envVariable: 'FIVEM_LICENSE',
              defaultValue: '',
              userViewable: true,
              userEditable: true,
            },
          ],
        },
      },
      include: { variables: true },
    });
  } else if (!Array.isArray(egg.features) || !(egg.features as unknown[]).includes('fivem')) {
    egg = await prisma.egg.update({
      where: { id: egg.id },
      data: { features: ['fivem'] },
      include: { variables: true },
    });
  }

  const node = await ensureDemoNode(locationId);
  const allocation = await ensureAllocation(node.id, 30120);

  const existing = await prisma.server.findUnique({ where: { uuid: DEMO_FIVEM_SERVER_UUID } });
  if (existing) {
    return prisma.server.update({
      where: { id: existing.id },
      data: {
        eggId: egg.id,
        fivemMarketplaceAccess: true,
        name: 'Demo FiveM Server',
        description: 'Open Marketplace to browse curated FiveM resources (UI preview)',
      },
    });
  }

  const dockerImages = egg.dockerImages as Record<string, string>;
  const image = Object.values(dockerImages)[0] ?? 'ghcr.io/parkervcp/yolks:fivem';

  return prisma.$transaction(async (tx) => {
    const server = await tx.server.create({
      data: {
        uuid: DEMO_FIVEM_SERVER_UUID,
        uuidShort: generateUuidShort(DEMO_FIVEM_SERVER_UUID),
        ownerId: adminId,
        nodeId: node.id,
        eggId: egg.id,
        allocationId: allocation.id,
        name: 'Demo FiveM Server',
        description: 'Open Marketplace to browse curated FiveM resources (UI preview)',
        status: 'normal',
        installStatus: 'installed',
        installedAt: new Date(),
        memory: 4096,
        disk: 20480,
        cpu: 200,
        image,
        startup: egg.startup,
        fivemMarketplaceAccess: true,
        variables: {
          create: egg.variables.map((v) => ({
            eggVariableId: v.id,
            variableValue: v.defaultValue,
          })),
        },
      },
    });

    await tx.allocation.update({
      where: { id: allocation.id },
      data: { assigned: true },
    });

    return server;
  });
}

async function seedDevelopmentContent(admin: { id: string; username: string }) {
  const demoPassword = process.env.DEMO_PASSWORD ?? 'demo123!';
  const demoHash = await bcrypt.hash(demoPassword, 12);

  await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      username: 'demo',
      passwordHash: demoHash,
      role: 'user',
    },
  });

  const location = await prisma.location.upsert({
    where: { short: 'uk' },
    update: {},
    create: { short: 'uk', long: 'United Kingdom' },
  });

  const nest = await prisma.nest.upsert({
    where: { uuid: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      uuid: '00000000-0000-0000-0000-000000000001',
      name: 'Minecraft',
      description: 'Minecraft server eggs',
    },
  });

  const existingEgg = await prisma.egg.findFirst({ where: { nestId: nest.id, name: 'Vanilla Minecraft' } });
  if (!existingEgg) {
    await prisma.egg.create({
      data: {
        nestId: nest.id,
        name: 'Vanilla Minecraft',
        description: 'Vanilla Minecraft Java server',
        dockerImages: {
          'Java 21': 'ghcr.io/pterodactyl/yolks:java_21',
          'Java 17': 'ghcr.io/pterodactyl/yolks:java_17',
        },
        startup: 'java -Xms128M -XX:MaxRAMPercentage=95.0 -jar {{SERVER_JARFILE}}',
        configStop: 'stop',
        configStartup: { done: ')! For help, type "help"' },
        scriptContainer: 'ghcr.io/pterodactyl/installers:debian',
        scriptEntry: 'bash',
        scriptInstall: `#!/bin/bash
cd /mnt/server
curl -o server.jar https://launcher.mojang.com/v1/objects/latest/server.jar || curl -o server.jar https://piston-data.mojang.com/v1/objects/latest/server.jar
`,
        variables: {
          create: [
            {
              name: 'Server Jar File',
              envVariable: 'SERVER_JARFILE',
              defaultValue: 'server.jar',
              userViewable: true,
              userEditable: true,
            },
            {
              name: 'Server Version',
              envVariable: 'VANILLA_VERSION',
              defaultValue: 'latest',
              userViewable: true,
              userEditable: true,
            },
          ],
        },
      },
    });
  }

  const demoServer = await seedDemoServer(admin.id, location.id, nest.id);
  const demoFiveMServer = await seedDemoFiveMServer(admin.id, location.id);

  if (demoServer) {
    const existingLogs = await prisma.activityLog.count({ where: { serverId: demoServer.id } });
    if (existingLogs === 0) {
      const now = Date.now();
      await prisma.activityLog.createMany({
        data: [
          {
            event: 'server.settings.updated',
            actorId: admin.id,
            serverId: demoServer.id,
            description: 'Updated server settings (name → "Demo Minecraft Server")',
            ip: '127.0.0.1',
            timestamp: new Date(now - 86400000 * 2),
          },
          {
            event: 'server.power.start',
            actorId: admin.id,
            serverId: demoServer.id,
            description: `${admin.username} sent power action: start`,
            ip: '127.0.0.1',
            timestamp: new Date(now - 3600000 * 5),
          },
        ],
      });
    }

    await seedDemoStats(demoServer.id, demoServer.memory, demoServer.disk);
  }

  if (demoFiveMServer) {
    const existingLogs = await prisma.activityLog.count({ where: { serverId: demoFiveMServer.id } });
    if (existingLogs === 0) {
      await prisma.activityLog.createMany({
        data: [
          {
            event: 'server.settings.updated',
            actorId: admin.id,
            serverId: demoFiveMServer.id,
            description: 'Created Demo FiveM Server for marketplace preview',
            ip: '127.0.0.1',
            timestamp: new Date(Date.now() - 86400000),
          },
        ],
      });
    }
  }

  return { location, nest, demoServer, demoFiveMServer, demoPassword };
}

async function main() {
  const isProduction = process.env.NODE_ENV === 'production';

  const admin = await seedAdminUser(isProduction);
  await seedMarketplacePlugins(prisma);

  console.log('');
  console.log('Spirit-Panel seed complete.');
  console.log(`  Admin: ${admin.email} (${admin.username})`);

  if (isProduction) {
    console.log('  Production: admin user only — no locations, nests, eggs, servers, or settings rows.');
    console.log('  Configure branding in Admin → Settings. Import eggs with pnpm import-eggs.');
    console.log('  FiveM marketplace catalog seeded (Admin → Marketplace).');
  } else {
    await seedPanelSettings();
    const dev = await seedDevelopmentContent(admin);
    console.log('  Admin password: see ADMIN_PASSWORD in apps/panel-api/.env (default admin123!)');
    console.log(`  Location: ${dev.location.short}`);
    console.log(`  Nest: ${dev.nest.name} with Vanilla Minecraft egg`);
    if (dev.demoServer) {
      console.log(`  Demo Minecraft: "${dev.demoServer.name}" → /servers/${dev.demoServer.id}`);
    }
    if (dev.demoFiveMServer) {
      console.log(
        `  Demo FiveM: "${dev.demoFiveMServer.name}" → /servers/${dev.demoFiveMServer.id}/marketplace`,
      );
    }
    console.log(`  Demo user: demo@example.com / ${dev.demoPassword}`);
  }

  console.log('');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
