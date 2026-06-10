import type { Server, Egg, Allocation, Node, ServerVariable, EggVariable } from '@prisma/client';
import { substituteStartup } from '@spirit/shared';

type ServerWithRelations = Server & {
  egg: Egg;
  node: Node;
  defaultAllocation: Allocation;
  extraAllocations: Allocation[];
  variables: (ServerVariable & { eggVariable: EggVariable })[];
};

export function buildServerEnvironment(server: ServerWithRelations): Record<string, string> {
  const env: Record<string, string> = {};

  // Egg-defined variables first so the standard Pterodactyl variables below
  // always win and can never be shadowed by a malformed egg.
  for (const v of server.variables) {
    env[v.eggVariable.envVariable] = v.variableValue;
  }

  // Standard variables injected by Pterodactyl for every server. Eggs and
  // start scripts rely on these being present.
  env.STARTUP = server.startup;
  env.SERVER_MEMORY = String(server.memory);
  env.SERVER_IP = server.defaultAllocation.ip;
  env.SERVER_PORT = String(server.defaultAllocation.port);
  env.P_SERVER_UUID = server.uuid;
  env.P_SERVER_ALLOCATION_LIMIT = String(server.allocationLimit ?? 0);

  return env;
}

const SIGNAL_ALIASES: Record<string, string> = {
  C: 'SIGINT',
  '\\': 'SIGQUIT',
  Z: 'SIGTSTP',
};

/**
 * Pterodactyl eggs encode the stop instruction as a single string. A leading
 * caret (e.g. `^C`) or a bare `SIG*` name denotes a signal; anything else is a
 * console command. Wings expects `{ type, value }`.
 */
export function buildStopConfiguration(configStop: string | null | undefined): {
  type: 'command' | 'signal' | 'stop';
  value: string;
} {
  const stop = (configStop ?? '').trim();
  if (!stop) return { type: 'stop', value: 'stop' };

  if (stop.startsWith('^')) {
    const letter = stop.slice(1).toUpperCase();
    return { type: 'signal', value: SIGNAL_ALIASES[letter] ?? `SIG${letter}` };
  }
  if (/^SIG[A-Z]+$/i.test(stop)) {
    return { type: 'signal', value: stop.toUpperCase() };
  }
  return { type: 'command', value: stop };
}

/** Normalise the egg `config.startup` block to the Wings process format. */
export function buildStartupConfiguration(configStartup: Record<string, unknown> | null): {
  done: string[];
  user_interaction: string[];
  strip_ansi: boolean;
} {
  const cfg = configStartup ?? {};
  const done = cfg.done;
  const doneArray = Array.isArray(done)
    ? done.filter((d): d is string => typeof d === 'string')
    : typeof done === 'string' && done.length > 0
      ? [done]
      : [];

  const interaction = cfg.userInteraction ?? cfg.user_interaction;
  const userInteraction = Array.isArray(interaction)
    ? interaction.filter((u): u is string => typeof u === 'string')
    : [];

  const stripAnsiRaw = cfg.strip_ansi ?? cfg.stripAnsi;
  const stripAnsi = typeof stripAnsiRaw === 'boolean' ? stripAnsiRaw : false;

  return { done: doneArray, user_interaction: userInteraction, strip_ansi: stripAnsi };
}

interface WingsConfigReplacement {
  match: string;
  if_value?: string;
  replace_with: unknown;
}

interface WingsConfigFile {
  file: string;
  parser?: unknown;
  replace: WingsConfigReplacement[];
  [key: string]: unknown;
}

/**
 * Convert the egg `config.files` map into the array of file parsers Wings
 * applies on (re)install and boot. Mirrors Pterodactyl's
 * EggConfigurationService::convertConfigurationFiles, including conditional
 * (`if_value`) replacements.
 */
export function buildConfigFiles(configFiles: Record<string, unknown> | null): WingsConfigFile[] {
  if (!configFiles) return [];

  const result: WingsConfigFile[] = [];
  for (const [file, raw] of Object.entries(configFiles)) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const data = raw as Record<string, unknown>;
    const entry: WingsConfigFile = { file, replace: [] };

    for (const [key, value] of Object.entries(data)) {
      if (key !== 'find') {
        entry[key] = value;
        continue;
      }
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;

      for (const [match, replaceWith] of Object.entries(value as Record<string, unknown>)) {
        if (replaceWith && typeof replaceWith === 'object' && !Array.isArray(replaceWith)) {
          // Conditional replacement: { match: { if_value: replace_with } }
          for (const [ifValue, rw] of Object.entries(replaceWith as Record<string, unknown>)) {
            entry.replace.push({ match, if_value: ifValue, replace_with: rw });
          }
        } else {
          entry.replace.push({ match, replace_with: replaceWith });
        }
      }
    }

    result.push(entry);
  }

  return result;
}

export function buildServerConfiguration(server: ServerWithRelations) {
  const environment = buildServerEnvironment(server);
  const dockerImages = server.egg.dockerImages as Record<string, string>;
  const image = server.image || Object.values(dockerImages)[0] || 'ghcr.io/pterodactyl/yolks:debian';
  const features = (server.egg.features as string[]) ?? [];
  const fileDenylist = (server.egg.fileDenylist as string[]) ?? [];

  const mappings: Record<string, number[]> = {};
  const secondary = server.extraAllocations.filter((a) => a.id !== server.defaultAllocation.id);
  const allAllocations = [server.defaultAllocation, ...secondary];
  for (const alloc of allAllocations) {
    if (!mappings[alloc.ip]) mappings[alloc.ip] = [];
    mappings[alloc.ip].push(alloc.port);
  }

  const invocation = substituteStartup(server.startup, environment);

  return {
    settings: {
      uuid: server.uuid,
      meta: {
        name: server.name,
        description: server.description,
      },
      suspended: server.suspended,
      environment,
      invocation,
      skip_egg_scripts: server.skipScripts,
      build: {
        memory_limit: server.memory,
        swap: server.swap,
        io_weight: server.io,
        cpu_limit: server.cpu,
        threads: server.threads,
        disk_space: server.disk,
        oom_disabled: server.oomDisabled,
      },
      container: {
        image,
        oom_disabled: server.oomDisabled,
        requires_rebuild: false,
      },
      allocations: {
        force_outgoing_ip: server.egg.forceOutgoingIp,
        default: {
          ip: server.defaultAllocation.ip,
          port: server.defaultAllocation.port,
        },
        mappings,
      },
      mounts: [],
      egg: {
        id: 0,
        uuid: server.egg.uuid,
        features,
        file_denylist: fileDenylist,
      },
    },
    process_configuration: {
      startup: buildStartupConfiguration(server.egg.configStartup as Record<string, unknown> | null),
      stop: buildStopConfiguration(server.egg.configStop),
      configs: buildConfigFiles(server.egg.configFiles as Record<string, unknown> | null),
    },
    container: {
      image,
      oom_disabled: server.oomDisabled,
      requires_rebuild: false,
    },
  };
}

export function buildInstallScript(server: ServerWithRelations) {
  return {
    container_image: server.egg.scriptContainer,
    entrypoint: server.egg.scriptEntry,
    script: server.egg.scriptInstall,
  };
}

export function buildServerListItem(server: ServerWithRelations) {
  return {
    uuid: server.uuid,
    settings: buildServerConfiguration(server).settings,
  };
}

export function generateUuidShort(uuid: string): string {
  return uuid.replace(/-/g, '').slice(0, 8);
}
