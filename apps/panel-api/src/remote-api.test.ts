import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseContainerStatusBody } from './lib/container-state.js';
import { normalizeWingsLogLines } from './lib/wings-logs.js';
import { parseEggJson, parseSftpUsername, generateDaemonToken } from '@spirit/shared';
import { buildServerConfiguration, generateUuidShort } from './services/server-configuration.js';

describe('egg parser', () => {
  it('parses PTDL_v2 egg', () => {
    const egg = parseEggJson({
      meta: { version: 'PTDL_v2' },
      name: 'Test Egg',
      startup: 'java -jar server.jar',
      docker_images: { Java: 'ghcr.io/pterodactyl/yolks:java_17' },
      config: { stop: 'stop' },
    });
    assert.equal(egg.name, 'Test Egg');
    assert.equal(egg.configStop, 'stop');
  });

  it('converts v1 image format', () => {
    const egg = parseEggJson({
      name: 'Legacy',
      image: 'ghcr.io/pterodactyl/yolks:debian',
      startup: 'echo hi',
      config: { stop: 'stop' },
    });
    assert.ok(Object.keys(egg.dockerImages).length > 0);
  });
});

describe('sftp username parser', () => {
  it('parses username.serverid format', () => {
    const result = parseSftpUsername('demo.a1b2c3d4');
    assert.deepEqual(result, { user: 'demo', serverShortId: 'a1b2c3d4' });
  });

  it('rejects invalid format', () => {
    assert.equal(parseSftpUsername('invalid'), null);
  });
});

describe('daemon token', () => {
  it('generates id and secret', () => {
    const t = generateDaemonToken();
    assert.ok(t.tokenId.length > 0);
    assert.ok(t.tokenSecret.length > 0);
  });
});

describe('container status parsing', () => {
  it('accepts nested new_state from FeatherWings', () => {
    assert.equal(parseContainerStatusBody({ data: { new_state: 'running' } }), 'running');
  });

  it('accepts top-level state fallback from FeatherPanel spec', () => {
    assert.equal(parseContainerStatusBody({ state: 'starting' }), 'starting');
  });

  it('rejects invalid states', () => {
    assert.equal(parseContainerStatusBody({ state: 'unknown' }), null);
    assert.equal(parseContainerStatusBody({}), null);
  });
});

describe('wings log normalization', () => {
  it('splits install log strings into lines', () => {
    assert.deepEqual(normalizeWingsLogLines({ data: 'line one\nline two\n' }), ['line one', 'line two']);
  });

  it('passes through console log arrays', () => {
    assert.deepEqual(normalizeWingsLogLines({ data: ['a', 'b'] }), ['a', 'b']);
  });
});

describe('server configuration builder', () => {
  it('builds pterodactyl-compatible structure', () => {
    const uuid = '12345678-1234-1234-1234-123456789abc';
    const config = buildServerConfiguration({
      id: '1',
      uuid,
      uuidShort: generateUuidShort(uuid),
      externalId: null,
      ownerId: 'u1',
      nodeId: 'n1',
      eggId: 'e1',
      allocationId: 'a1',
      name: 'Test Server',
      description: '',
      status: 'normal',
      containerState: 'offline',
      suspended: false,
      oomDisabled: true,
      skipScripts: false,
      installStatus: 'installed',
      installedAt: new Date(),
      memory: 2048,
      swap: 0,
      disk: 10240,
      io: 500,
      cpu: 100,
      threads: null,
      startup: 'java -Xmx{{SERVER_MEMORY}}M -jar server.jar',
      image: 'ghcr.io/pterodactyl/yolks:java_21',
      allocationLimit: 1,
      backupLimit: 0,
      databaseLimit: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      egg: {
        id: 'e1',
        uuid: 'egg-uuid',
        nestId: 'nest1',
        author: 'test',
        name: 'Vanilla',
        description: '',
        features: [],
        dockerImages: { Java: 'ghcr.io/pterodactyl/yolks:java_21' },
        fileDenylist: [],
        configFiles: null,
        configStartup: { done: 'Done' },
        configLogs: null,
        configStop: 'stop',
        startup: '',
        scriptInstall: '',
        scriptEntry: 'bash',
        scriptContainer: 'ghcr.io/pterodactyl/installers:debian',
        scriptPrivileged: false,
        forceOutgoingIp: false,
        updateUrl: null,
        logoUrl: null,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      node: {
        id: 'n1',
        uuid: 'node-uuid',
        locationId: 'loc1',
        name: 'Node 1',
        description: '',
        fqdn: 'node.example.com',
        scheme: 'https',
        behindProxy: false,
        maintenanceMode: false,
        memory: 0,
        memoryOverallocate: 0,
        disk: 0,
        diskOverallocate: 0,
        uploadSize: 100,
        daemonTokenId: 'tid',
        daemonTokenSecret: 'tsec',
        daemonListen: 8080,
        daemonSftp: 2022,
        daemonBase: '/var/lib/pterodactyl/volumes',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      defaultAllocation: {
        id: 'a1',
        nodeId: 'n1',
        ip: '0.0.0.0',
        port: 25565,
        alias: null,
        notes: null,
        assigned: true,
        serverId: '1',
        createdAt: new Date(),
      },
      extraAllocations: [],
      variables: [
        {
          id: 'sv1',
          serverId: '1',
          eggVariableId: 'ev1',
          variableValue: 'server.jar',
          eggVariable: {
            id: 'ev1',
            eggId: 'e1',
            name: 'Jar',
            description: '',
            envVariable: 'SERVER_JARFILE',
            defaultValue: 'server.jar',
            userViewable: true,
            userEditable: true,
            rules: '',
            fieldType: 'text',
          },
        },
      ],
    });

    assert.equal(config.settings.uuid, uuid);
    assert.equal(config.settings.meta.name, 'Test Server');
    assert.equal(config.settings.build.memory_limit, 2048);
    assert.equal(config.settings.allocations.default.port, 25565);
    assert.equal(config.process_configuration.stop.value, 'stop');
  });
});
