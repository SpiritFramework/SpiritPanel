import { prisma } from '../lib/prisma.js';
import { getCloudflareDnsSettings, type CloudflareDnsSettings } from '../lib/panel-settings.js';
import {
  CloudflareApiError,
  createDnsOnlyAddressRecord,
  createDnsOnlySrvRecord,
  deleteDnsRecord,
  updateDnsOnlyAddressRecord,
  updateDnsOnlySrvRecord,
} from './cloudflare-dns.js';
import { resolveMinecraftJavaSrv } from './minecraft-srv.js';

const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

function minecraftSrvRecordName(fqdn: string, service: string, proto: string) {
  return `${service}.${proto}.${fqdn}`;
}

export type ServerDomainView = {
  id: string;
  slug: string;
  fqdn: string;
  targetIp: string;
  status: string;
  message: string | null;
  preferSubdomain: boolean;
  hostnameOnly: boolean;
  srvPort: number | null;
  createdAt: string;
  updatedAt: string;
};

export type DomainFeatureInfo = {
  enabled: boolean;
  baseDomain: string;
  canManage: boolean;
  reason: string | null;
  reservedSlugs: string[];
  hostnameOnlySupported: boolean;
};

function httpError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode });
}

function normalizeSlug(raw: string) {
  return raw.trim().toLowerCase();
}

function normalizeBaseDomain(raw: string) {
  return raw.trim().toLowerCase().replace(/^\.+/, '').replace(/\.+$/, '');
}

export function validateSubdomainSlug(slug: string, reserved: string[]) {
  const normalized = normalizeSlug(slug);
  if (!normalized) throw httpError('Subdomain is required', 422);
  if (normalized.length > 63) throw httpError('Subdomain is too long (max 63 characters)', 422);
  if (!SLUG_RE.test(normalized)) {
    throw httpError(
      'Subdomain may only use letters, numbers, and hyphens, and cannot start or end with a hyphen',
      422,
    );
  }
  if (reserved.includes(normalized)) {
    throw httpError('That subdomain is reserved', 422);
  }
  return normalized;
}

export function resolveTargetIp(input: {
  publicIp?: string | null;
  allocationIp: string;
}): string {
  const fromNode = input.publicIp?.trim();
  if (fromNode) return fromNode;
  const bind = input.allocationIp.trim();
  if (bind && bind !== '0.0.0.0' && bind !== '::' && bind !== '::0') return bind;
  throw httpError(
    'This node has no public IP configured. Ask an admin to set the node public IP for DNS records.',
    422,
  );
}

export async function resolveEffectiveDomainConfig(node: {
  domainBase?: string | null;
  cloudflareZoneId?: string | null;
  publicIp?: string | null;
}): Promise<{
  settings: CloudflareDnsSettings;
  baseDomain: string;
  zoneId: string;
  enabled: boolean;
}> {
  const settings = await getCloudflareDnsSettings();
  const baseDomain = normalizeBaseDomain(node.domainBase || settings.baseDomain);
  const zoneId = (node.cloudflareZoneId?.trim() || settings.zoneId).trim();
  const enabled = Boolean(
    settings.enabled && settings.apiToken && baseDomain && zoneId,
  );
  return { settings, baseDomain, zoneId, enabled };
}

async function loadServerForDomain(serverId: string) {
  return prisma.server.findUnique({
    where: { id: serverId },
    include: {
      node: true,
      defaultAllocation: true,
      domain: true,
      egg: { include: { nest: { select: { name: true } } } },
    },
  });
}

async function deleteDomainDnsRecords(domain: {
  zoneId: string;
  cfRecordId: string | null;
  cfSrvRecordId: string | null;
}) {
  if (domain.cfSrvRecordId) {
    await deleteDnsRecord({
      zoneId: domain.zoneId,
      recordId: domain.cfSrvRecordId,
    }).catch(() => undefined);
  }
  if (domain.cfRecordId) {
    await deleteDnsRecord({
      zoneId: domain.zoneId,
      recordId: domain.cfRecordId,
    }).catch(() => undefined);
  }
}

export function serializeDomain(
  domain: {
    id: string;
    slug: string;
    fqdn: string;
    targetIp: string;
    status: string;
    message: string | null;
    cfSrvRecordId?: string | null;
    srvPort?: number | null;
    createdAt: Date;
    updatedAt: Date;
  } | null,
  preferSubdomain: boolean,
): ServerDomainView | null {
  if (!domain) return null;
  const hostnameOnly = Boolean(domain.cfSrvRecordId);
  return {
    id: domain.id,
    slug: domain.slug,
    fqdn: domain.fqdn,
    targetIp: domain.targetIp,
    status: domain.status,
    message: domain.message,
    preferSubdomain,
    hostnameOnly,
    srvPort: domain.srvPort ?? null,
    createdAt: domain.createdAt.toISOString(),
    updatedAt: domain.updatedAt.toISOString(),
  };
}

export async function getDomainFeatureForServer(serverId: string): Promise<{
  feature: DomainFeatureInfo;
  domain: ServerDomainView | null;
  preferSubdomain: boolean;
  ipAddress: string;
  subdomainAddress: string | null;
  preferredAddress: string;
  port: number;
}> {
  const server = await loadServerForDomain(serverId);
  if (!server) throw httpError('Server not found', 404);

  const { settings, baseDomain, zoneId, enabled } = await resolveEffectiveDomainConfig(server.node);
  const hostnameOnlySupported = Boolean(resolveMinecraftJavaSrv(server.egg));
  let reason: string | null = null;
  if (!settings.enabled) reason = 'Subdomains are disabled by an administrator.';
  else if (!settings.apiToken) reason = 'Cloudflare is not fully configured.';
  else if (!baseDomain || !zoneId) reason = 'Domain base or Cloudflare zone is missing.';
  else {
    try {
      resolveTargetIp({
        publicIp: server.node.publicIp,
        allocationIp: server.defaultAllocation.ip,
      });
    } catch (err) {
      reason = err instanceof Error ? err.message : 'Public IP is not configured on this node.';
    }
  }

  const domain = serializeDomain(server.domain, server.preferSubdomain);
  const port = server.defaultAllocation.port;
  const ipHost =
    server.defaultAllocation.ip === '0.0.0.0' || server.defaultAllocation.ip === '::'
      ? server.node.publicIp?.trim() || server.node.fqdn
      : server.defaultAllocation.ip;
  const ipAddress = `${ipHost}:${port}`;
  const subdomainAddress = domain
    ? domain.hostnameOnly
      ? domain.fqdn
      : `${domain.fqdn}:${port}`
    : null;
  const preferredAddress =
    server.preferSubdomain && subdomainAddress ? subdomainAddress : ipAddress;

  const planAllowed = server.subdomainAccess;
  const featureReason = !enabled
    ? reason ?? 'Subdomains are disabled.'
    : reason
      ? reason
      : planAllowed
        ? null
        : 'Subdomain management is not included with this server plan.';

  return {
    feature: {
      enabled,
      baseDomain,
      canManage: enabled && !reason && planAllowed,
      reason: featureReason,
      reservedSlugs: settings.reservedSlugs,
      hostnameOnlySupported,
    },
    domain,
    preferSubdomain: server.preferSubdomain,
    ipAddress,
    subdomainAddress,
    preferredAddress,
    port,
  };
}

async function syncPrimaryAlias(serverId: string) {
  const server = await prisma.server.findUnique({
    where: { id: serverId },
    include: { domain: true },
  });
  if (!server) return;
  const alias =
    server.preferSubdomain && server.domain?.status === 'active' ? server.domain.fqdn : null;
  await prisma.allocation.update({
    where: { id: server.allocationId },
    data: { alias },
  });
}

async function resetServerDomainPreferences(serverId: string) {
  await prisma.server
    .update({
      where: { id: serverId },
      data: { preferSubdomain: false },
    })
    .catch(() => undefined);
  await syncPrimaryAlias(serverId);
}

export async function createOrReplaceServerDomain(input: {
  serverId: string;
  slug: string;
  preferSubdomain?: boolean;
  /** Admin routes may manage domains even when the plan gate is off. */
  bypassPlanGate?: boolean;
}) {
  const server = await loadServerForDomain(input.serverId);
  if (!server) throw httpError('Server not found', 404);

  const { settings, baseDomain, zoneId, enabled } = await resolveEffectiveDomainConfig(server.node);
  if (!enabled) throw httpError('Subdomains are not available on this node', 422);
  if (!server.subdomainAccess && !input.bypassPlanGate) {
    throw httpError('Subdomain management is not included with this server plan.', 403);
  }

  const slug = validateSubdomainSlug(input.slug, settings.reservedSlugs);
  const fqdn = `${slug}.${baseDomain}`;
  const targetIp = resolveTargetIp({
    publicIp: server.node.publicIp,
    allocationIp: server.defaultAllocation.ip,
  });
  const port = server.defaultAllocation.port;
  const srvSpec = resolveMinecraftJavaSrv(server.egg);

  const conflict = await prisma.serverDomain.findFirst({
    where: {
      fqdn,
      NOT: { serverId: server.id },
    },
  });
  if (conflict) throw httpError('That subdomain is already in use', 409);

  // Replace existing subdomain for this server (still max 1).
  if (server.domain) {
    await deleteDomainDnsRecords(server.domain);
    await prisma.serverDomain.delete({ where: { id: server.domain.id } });
  }

  let addressRecord;
  try {
    addressRecord = await createDnsOnlyAddressRecord({ zoneId, fqdn, ip: targetIp });
  } catch (err) {
    if (err instanceof CloudflareApiError) {
      throw httpError(err.message, err.status >= 400 && err.status < 500 ? err.status : 502);
    }
    throw err;
  }

  let srvRecordId: string | null = null;
  let srvPort: number | null = null;
  if (srvSpec) {
    try {
      const srv = await createDnsOnlySrvRecord({
        zoneId,
        name: minecraftSrvRecordName(fqdn, srvSpec.service, srvSpec.proto),
        port,
        target: fqdn,
      });
      srvRecordId = srv.id;
      srvPort = port;
    } catch (err) {
      // Roll back the A/AAAA so we don't leave an orphan hostname without SRV intent.
      await deleteDnsRecord({ zoneId, recordId: addressRecord.id }).catch(() => undefined);
      if (err instanceof CloudflareApiError) {
        throw httpError(err.message, err.status >= 400 && err.status < 500 ? err.status : 502);
      }
      throw err;
    }
  }

  const preferSubdomain = input.preferSubdomain ?? true;
  const domain = await prisma.serverDomain.create({
    data: {
      serverId: server.id,
      slug,
      fqdn,
      zoneId,
      cfRecordId: addressRecord.id,
      cfSrvRecordId: srvRecordId,
      targetIp,
      srvPort,
      status: 'active',
      message: srvRecordId
        ? 'Minecraft SRV active — players can join with the hostname only.'
        : null,
    },
  });

  await prisma.server.update({
    where: { id: server.id },
    data: { preferSubdomain },
  });
  await syncPrimaryAlias(server.id);

  return serializeDomain(domain, preferSubdomain);
}

export async function setPreferSubdomain(serverId: string, preferSubdomain: boolean) {
  const server = await loadServerForDomain(serverId);
  if (!server) throw httpError('Server not found', 404);
  if (preferSubdomain && !server.domain) {
    throw httpError('Create a subdomain before preferring it for connections', 422);
  }
  if (preferSubdomain && !server.subdomainAccess) {
    throw httpError('Subdomain management is not included with this server plan.', 403);
  }

  await prisma.server.update({
    where: { id: serverId },
    data: { preferSubdomain },
  });
  await syncPrimaryAlias(serverId);
  return getDomainFeatureForServer(serverId);
}

export async function deleteServerDomain(serverId: string) {
  const server = await loadServerForDomain(serverId);
  if (!server) throw httpError('Server not found', 404);
  if (!server.domain) return { deleted: true as const };

  await deleteDomainDnsRecords(server.domain);

  await prisma.serverDomain.delete({ where: { id: server.domain.id } });
  await resetServerDomainPreferences(serverId);
  return { deleted: true as const };
}

/** Best-effort cleanup when a server is hard-deleted. */
export async function cleanupServerDomainBestEffort(serverId: string) {
  const domain = await prisma.serverDomain.findUnique({ where: { serverId } });
  if (!domain) return;
  await deleteDomainDnsRecords(domain);
  await prisma.serverDomain.delete({ where: { id: domain.id } }).catch(() => undefined);
  await resetServerDomainPreferences(serverId);
}

export async function retargetServerDomainIfNeeded(serverId: string) {
  const server = await loadServerForDomain(serverId);
  if (!server?.domain?.cfRecordId) return;

  let targetIp: string;
  try {
    targetIp = resolveTargetIp({
      publicIp: server.node.publicIp,
      allocationIp: server.defaultAllocation.ip,
    });
  } catch {
    return;
  }

  const port = server.defaultAllocation.port;
  const srvSpec = resolveMinecraftJavaSrv(server.egg);
  const ipChanged = targetIp !== server.domain.targetIp;
  const srvPortChanged = Boolean(server.domain.cfSrvRecordId) && server.domain.srvPort !== port;
  const needsSrvCreate = Boolean(srvSpec) && !server.domain.cfSrvRecordId;
  if (!ipChanged && !srvPortChanged && !needsSrvCreate) return;

  try {
    if (ipChanged) {
      await updateDnsOnlyAddressRecord({
        zoneId: server.domain.zoneId,
        recordId: server.domain.cfRecordId,
        fqdn: server.domain.fqdn,
        ip: targetIp,
      });
    }

    let cfSrvRecordId = server.domain.cfSrvRecordId;
    let srvPort = server.domain.srvPort;

    if (srvSpec && cfSrvRecordId && (srvPortChanged || ipChanged)) {
      await updateDnsOnlySrvRecord({
        zoneId: server.domain.zoneId,
        recordId: cfSrvRecordId,
        name: minecraftSrvRecordName(server.domain.fqdn, srvSpec.service, srvSpec.proto),
        port,
        target: server.domain.fqdn,
      });
      srvPort = port;
    } else if (needsSrvCreate && srvSpec) {
      const srv = await createDnsOnlySrvRecord({
        zoneId: server.domain.zoneId,
        name: minecraftSrvRecordName(server.domain.fqdn, srvSpec.service, srvSpec.proto),
        port,
        target: server.domain.fqdn,
      });
      cfSrvRecordId = srv.id;
      srvPort = port;
    }

    await prisma.serverDomain.update({
      where: { id: server.domain.id },
      data: {
        targetIp,
        cfSrvRecordId,
        srvPort,
        status: 'active',
        message: cfSrvRecordId
          ? 'Minecraft SRV active — players can join with the hostname only.'
          : null,
      },
    });
  } catch (err) {
    await prisma.serverDomain.update({
      where: { id: server.domain.id },
      data: {
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to update DNS record',
      },
    });
  }
}

export async function listAllServerDomains() {
  const rows = await prisma.serverDomain.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      server: {
        select: {
          id: true,
          name: true,
          preferSubdomain: true,
          owner: { select: { id: true, username: true, email: true } },
          node: { select: { id: true, name: true, domainBase: true } },
        },
      },
    },
  });
  return rows.map((row) => ({
    ...serializeDomain(row, row.server.preferSubdomain),
    server: {
      id: row.server.id,
      name: row.server.name,
      owner: row.server.owner,
      node: row.server.node,
    },
  }));
}
