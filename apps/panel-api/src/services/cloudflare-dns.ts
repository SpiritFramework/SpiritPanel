import { getCloudflareDnsSettings } from '../lib/panel-settings.js';

export class CloudflareApiError extends Error {
  constructor(
    message: string,
    readonly status = 502,
    readonly errors: unknown[] = [],
  ) {
    super(message);
    this.name = 'CloudflareApiError';
  }
}

type CfEnvelope<T> = {
  success: boolean;
  errors?: Array<{ code?: number; message?: string }>;
  result?: T;
};

export type CloudflareDnsRecord = {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied: boolean;
  ttl: number;
};

function isIpv6(ip: string) {
  return ip.includes(':');
}

async function cfFetch<T>(
  path: string,
  init: RequestInit & { token: string },
): Promise<T> {
  const { token, ...rest } = init;
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(rest.headers ?? {}),
    },
    signal: AbortSignal.timeout(15_000),
  });

  let body: CfEnvelope<T> | null = null;
  try {
    body = (await res.json()) as CfEnvelope<T>;
  } catch {
    throw new CloudflareApiError(`Cloudflare API returned ${res.status}`, res.status >= 400 ? res.status : 502);
  }

  if (!res.ok || !body?.success) {
    const msg =
      body?.errors?.map((e) => e.message).filter(Boolean).join('; ') ||
      `Cloudflare API error (${res.status})`;
    throw new CloudflareApiError(msg, res.status >= 400 && res.status < 600 ? res.status : 502, body?.errors ?? []);
  }

  return body.result as T;
}

export async function createDnsOnlyAddressRecord(input: {
  zoneId: string;
  fqdn: string;
  ip: string;
  apiToken?: string;
}): Promise<CloudflareDnsRecord> {
  const settings = await getCloudflareDnsSettings();
  const token = input.apiToken || settings.apiToken;
  if (!token) throw new CloudflareApiError('Cloudflare API token is not configured', 422);

  const type = isIpv6(input.ip) ? 'AAAA' : 'A';
  return cfFetch<CloudflareDnsRecord>(`/zones/${encodeURIComponent(input.zoneId)}/dns_records`, {
    method: 'POST',
    token,
    body: JSON.stringify({
      type,
      name: input.fqdn,
      content: input.ip,
      ttl: 1,
      proxied: false,
      comment: 'Spirit Panel server subdomain',
    }),
  });
}

export async function updateDnsOnlyAddressRecord(input: {
  zoneId: string;
  recordId: string;
  fqdn: string;
  ip: string;
  apiToken?: string;
}): Promise<CloudflareDnsRecord> {
  const settings = await getCloudflareDnsSettings();
  const token = input.apiToken || settings.apiToken;
  if (!token) throw new CloudflareApiError('Cloudflare API token is not configured', 422);

  const type = isIpv6(input.ip) ? 'AAAA' : 'A';
  return cfFetch<CloudflareDnsRecord>(
    `/zones/${encodeURIComponent(input.zoneId)}/dns_records/${encodeURIComponent(input.recordId)}`,
    {
      method: 'PUT',
      token,
      body: JSON.stringify({
        type,
        name: input.fqdn,
        content: input.ip,
        ttl: 1,
        proxied: false,
        comment: 'Spirit Panel server subdomain',
      }),
    },
  );
}

export async function deleteDnsRecord(input: {
  zoneId: string;
  recordId: string;
  apiToken?: string;
}): Promise<void> {
  const settings = await getCloudflareDnsSettings();
  const token = input.apiToken || settings.apiToken;
  if (!token) return;

  try {
    await cfFetch<{ id: string }>(
      `/zones/${encodeURIComponent(input.zoneId)}/dns_records/${encodeURIComponent(input.recordId)}`,
      { method: 'DELETE', token },
    );
  } catch (err) {
    if (err instanceof CloudflareApiError && (err.status === 404 || /not found/i.test(err.message))) {
      return;
    }
    throw err;
  }
}

/** Minecraft Java-style SRV so clients can join hostname-only on non-default ports. */
export async function createDnsOnlySrvRecord(input: {
  zoneId: string;
  /** Full record name, e.g. `_minecraft._tcp.myserver.example.com` */
  name: string;
  port: number;
  target: string;
  apiToken?: string;
}): Promise<CloudflareDnsRecord> {
  const settings = await getCloudflareDnsSettings();
  const token = input.apiToken || settings.apiToken;
  if (!token) throw new CloudflareApiError('Cloudflare API token is not configured', 422);

  return cfFetch<CloudflareDnsRecord>(`/zones/${encodeURIComponent(input.zoneId)}/dns_records`, {
    method: 'POST',
    token,
    body: JSON.stringify({
      type: 'SRV',
      name: input.name,
      ttl: 1,
      // Cloudflare deprecated service/proto/name inside `data` — put the full
      // name on the top-level `name` field only.
      data: {
        priority: 0,
        weight: 5,
        port: input.port,
        target: input.target,
      },
      comment: 'Spirit Panel Minecraft SRV',
    }),
  });
}

export async function updateDnsOnlySrvRecord(input: {
  zoneId: string;
  recordId: string;
  name: string;
  port: number;
  target: string;
  apiToken?: string;
}): Promise<CloudflareDnsRecord> {
  const settings = await getCloudflareDnsSettings();
  const token = input.apiToken || settings.apiToken;
  if (!token) throw new CloudflareApiError('Cloudflare API token is not configured', 422);

  return cfFetch<CloudflareDnsRecord>(
    `/zones/${encodeURIComponent(input.zoneId)}/dns_records/${encodeURIComponent(input.recordId)}`,
    {
      method: 'PUT',
      token,
      body: JSON.stringify({
        type: 'SRV',
        name: input.name,
        ttl: 1,
        data: {
          priority: 0,
          weight: 5,
          port: input.port,
          target: input.target,
        },
        comment: 'Spirit Panel Minecraft SRV',
      }),
    },
  );
}

/** Lightweight credential check used by admin “Test Cloudflare” action. */
export async function verifyCloudflareCredentials(input?: {
  apiToken?: string;
  zoneId?: string;
}): Promise<{ ok: true; zoneName?: string }> {
  const settings = await getCloudflareDnsSettings();
  const token = input?.apiToken || settings.apiToken;
  const zoneId = input?.zoneId || settings.zoneId;
  if (!token) throw new CloudflareApiError('API token is required', 422);
  if (!zoneId) throw new CloudflareApiError('Zone ID is required', 422);

  const zone = await cfFetch<{ id: string; name: string }>(`/zones/${encodeURIComponent(zoneId)}`, {
    method: 'GET',
    token,
  });
  return { ok: true, zoneName: zone.name };
}
