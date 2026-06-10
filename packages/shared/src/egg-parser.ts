import type { PterodactylEggExport } from '@spirit/shared-types';

export const PTDL_V2 = 'PTDL_v2';

export interface ParsedEgg {
  name: string;
  author: string;
  description: string;
  features: string[];
  dockerImages: Record<string, string>;
  fileDenylist: string[];
  configFiles: Record<string, unknown> | null;
  configStartup: Record<string, unknown> | null;
  configLogs: Record<string, unknown> | null;
  configStop: string;
  startup: string;
  scriptInstall: string;
  scriptEntry: string;
  scriptContainer: string;
  scriptPrivileged: boolean;
  updateUrl: string | null;
  variables: Array<{
    name: string;
    description: string;
    envVariable: string;
    defaultValue: string;
    userViewable: boolean;
    userEditable: boolean;
    rules: string;
    fieldType: string;
  }>;
}

export function parseEggJson(raw: unknown): ParsedEgg {
  const unwrapped = unwrapEggPayload(raw);
  const data = convertToV2(unwrapped as PterodactylEggExport & Record<string, unknown>);

  if (!data.name || typeof data.name !== 'string') {
    throw new Error('Invalid egg JSON: missing "name" field. Use a PTDL_v2 egg export (egg-*.json).');
  }

  const dockerImages =
    data.docker_images && typeof data.docker_images === 'object' && !Array.isArray(data.docker_images)
      ? data.docker_images
      : {};
  const firstImage = Object.values(dockerImages)[0] ?? 'ghcr.io/pterodactyl/yolks:debian';

  const configStop =
    typeof data.config?.stop === 'string'
      ? data.config.stop
      : data.config?.stop != null
        ? String(data.config.stop)
        : 'stop';

  const variables = (data.variables ?? [])
    .filter((v) => v && typeof v.env_variable === 'string' && v.env_variable.length > 0)
    .map((v) => ({
      name: v.name || v.env_variable,
      description: v.description ?? '',
      envVariable: v.env_variable,
      defaultValue: v.default_value != null ? String(v.default_value) : '',
      userViewable: v.user_viewable ?? true,
      userEditable: v.user_editable ?? true,
      rules: v.rules != null ? String(v.rules) : '',
      fieldType: v.field_type ?? 'text',
    }));

  return {
    name: data.name.trim(),
    author: data.author?.trim() || 'SpiritFramework',
    description: data.description ?? '',
    features: Array.isArray(data.features) ? data.features.filter(Boolean) : [],
    dockerImages,
    fileDenylist: Array.isArray(data.file_denylist) ? data.file_denylist.filter(Boolean) : [],
    configFiles: asJsonObject(data.config?.files),
    configStartup: asJsonObject(data.config?.startup),
    configLogs: asJsonObject(data.config?.logs),
    configStop,
    startup: data.startup ?? '',
    scriptInstall: data.scripts?.installation?.script ?? '',
    scriptEntry: data.scripts?.installation?.entrypoint ?? 'bash',
    scriptContainer: data.scripts?.installation?.container ?? firstImage,
    scriptPrivileged: data.scripts?.installation?.privileged ?? false,
    updateUrl: data.meta?.update_url ?? null,
    variables,
  };
}

function unwrapEggPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid egg JSON: expected a JSON object.');
  }
  const record = raw as Record<string, unknown>;
  if (record.egg && typeof record.egg === 'object') {
    return record.egg;
  }
  return raw;
}

function asJsonObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function convertToV2(parsed: PterodactylEggExport & Record<string, unknown>): PterodactylEggExport {
  if (parsed.meta?.version === PTDL_V2) {
    return parsed;
  }

  const copy = { ...parsed } as PterodactylEggExport & Record<string, unknown>;

  if (!copy.docker_images) {
    const images = copy.images ?? (copy.image ? [copy.image] : ['ghcr.io/pterodactyl/yolks:debian']);
    copy.docker_images = {};
    for (const img of images as string[]) {
      copy.docker_images[img] = img;
    }
  }

  if (copy.variables) {
    copy.variables = copy.variables.map((v) => ({
      ...v,
      field_type: v.field_type ?? 'text',
    }));
  }

  copy.meta = { ...copy.meta, version: PTDL_V2 };
  return copy;
}

export function exportEggJson(egg: ParsedEgg & { uuid?: string }): PterodactylEggExport {
  return {
    meta: { version: PTDL_V2, update_url: egg.updateUrl },
    name: egg.name,
    author: egg.author,
    description: egg.description,
    features: egg.features,
    docker_images: egg.dockerImages,
    file_denylist: egg.fileDenylist,
    startup: egg.startup,
    config: {
      files: egg.configFiles ?? undefined,
      startup: egg.configStartup ?? undefined,
      logs: egg.configLogs ?? undefined,
      stop: egg.configStop,
    },
    scripts: {
      installation: {
        script: egg.scriptInstall,
        container: egg.scriptContainer,
        entrypoint: egg.scriptEntry,
        privileged: egg.scriptPrivileged,
      },
    },
    variables: egg.variables.map((v) => ({
      name: v.name,
      description: v.description,
      env_variable: v.envVariable,
      default_value: v.defaultValue,
      user_viewable: v.userViewable,
      user_editable: v.userEditable,
      rules: v.rules,
      field_type: v.fieldType,
    })),
  };
}

export function substituteStartup(template: string, env: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => env[key] ?? `{{${key}}}`);
}

export function parseSftpUsername(username: string): { user: string; serverShortId: string } | null {
  const match = username.match(/^(.+)\.([a-f0-9]{8})$/i);
  if (!match) return null;
  return { user: match[1], serverShortId: match[2] };
}

export function generateDaemonToken(): { tokenId: string; tokenSecret: string } {
  const bytes = (n: number) =>
    Array.from(crypto.getRandomValues(new Uint8Array(n)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  return { tokenId: bytes(16), tokenSecret: bytes(32) };
}
