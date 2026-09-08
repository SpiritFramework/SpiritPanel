import { ApiError, dispatchSessionExpired, sanitizeClientError, shouldTreat401AsSessionExpired } from './api-errors';
import { sanitizeLinkHref } from './safe-url';

const API = '/api';

/** Uploadable branding assets. `appicon` is the square PWA/install icon. */
export type BrandingAssetKind = 'logo' | 'favicon' | 'appicon';

export { ApiError } from './api-errors';

// Exponential backoff configuration for 429 (rate limit) responses
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000; // 1 second
const MAX_DELAY_MS = 15000; // 15 seconds

// Request deduplication for GET requests to prevent duplicate API calls
const pendingRequests = new Map<string, Promise<unknown>>();

/** Shared cooldown after any 429 so parallel callers don't retry-storm the API. */
let globalRateLimitUntil = 0;

function parseRetryAfterMs(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return null;
}

async function waitForGlobalRateLimit(): Promise<void> {
  const waitMs = globalRateLimitUntil - Date.now();
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

function noteRateLimit(delayMs: number): void {
  globalRateLimitUntil = Math.max(globalRateLimitUntil, Date.now() + delayMs);
}

function getRequestCacheKey(path: string, options: RequestInit): string | null {
  // Only cache GET requests (no method specified defaults to GET)
  const method = options.method?.toUpperCase() ?? 'GET';
  if (method !== 'GET') return null;
  
  // Don't cache if there's custom behavior requested
  return `${method}:${path}`;
}

function calculateBackoffDelay(attempt: number): number {
  // Exponential backoff: base * 2^attempt + jitter
  const exponentialDelay = BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * 0.1 * exponentialDelay; // 0-10% jitter
  return Math.min(exponentialDelay + jitter, MAX_DELAY_MS);
}

export interface User {
  id: string;
  uuid: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  rootAdmin: boolean;
  enabled?: boolean;
  suspended?: boolean;
  avatarUrl?: string | null;
  createdAt: string;
  discordLinked?: boolean;
  discordId?: string | null;
  discordUsername?: string | null;
}

export interface AdminUserSummary extends User {
  suspended: boolean;
  serverCount: number;
  subuserCount: number;
  apiKeyCount: number;
}

export interface AdminUserDetail extends AdminUserSummary {
  activityCount: number;
  servers: Array<{
    id: string;
    name: string;
    status: string;
    suspended: boolean;
    installStatus?: string;
    containerState?: string | null;
    node: string;
    egg: string;
    eggLogoUrl?: string | null;
    address: string;
    createdAt: string;
  }>;
  subuserAccess: Array<{
    id: string;
    serverId: string;
    serverName: string;
    owner: string;
    egg: string;
    eggLogoUrl?: string | null;
  }>;
  recentActivity: Array<{
    id: string;
    event: string;
    description: string | null;
    timestamp: string;
    server: { id: string; name: string } | null;
  }>;
}

export interface CreateAdminUserInput {
  email: string;
  username: string;
  password: string;
  role?: 'admin' | 'staff' | 'user';
  firstName?: string;
  lastName?: string;
}

export interface UpdateAdminUserInput {
  email?: string;
  username?: string;
  password?: string;
  role?: 'admin' | 'staff' | 'user';
  suspended?: boolean;
  firstName?: string | null;
  lastName?: string | null;
}

export interface UpdateProfileInput {
  email?: string;
  username?: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  currentPassword?: string;
  newPassword?: string;
}

export interface ApiKeySummary {
  id: string;
  identifier: string;
  memo: string;
  keyType: number;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreatedApiKey extends ApiKeySummary {
  token: string;
}

function requestHeaders(options: RequestInit = {}): HeadersInit {
  const headers: Record<string, string> = {};
  if (options.body != null && options.body !== '') {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

async function parseErrorBody(res: Response): Promise<string | undefined> {
  const text = await res.text();
  if (!text.trim()) return undefined;
  try {
    const err = JSON.parse(text) as { error?: string; message?: string };
    return err.error ?? err.message ?? text.trim();
  } catch {
    return text.trim();
  }
}

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = header.match(/filename\*=UTF-8''([^;\s]+)/i);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      // fall through
    }
  }
  const quoted = header.match(/filename="([^"]+)"/i);
  if (quoted?.[1]) return quoted[1];
  const plain = header.match(/filename=([^;\s]+)/i);
  return plain?.[1]?.replace(/"/g, '') ?? null;
}

async function failRequest(res: Response, path?: string): Promise<never> {
  const raw = await parseErrorBody(res);
  const message = sanitizeClientError(res.status, raw);
  if (res.status === 401 && (!path || shouldTreat401AsSessionExpired(path))) {
    dispatchSessionExpired();
  }
  throw new ApiError(message, res.status);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const cacheKey = getRequestCacheKey(path, options);
  
  // Return cached pending request for GET requests to prevent duplicate calls
  if (cacheKey && pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey) as Promise<T>;
  }

  const executeRequest = async (): Promise<T> => {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      await waitForGlobalRateLimit();

      let res: Response;
      try {
        res = await fetch(`${API}${path}`, {
          ...options,
          credentials: 'include',
          headers: { ...requestHeaders(options), ...options.headers },
        });
      } catch {
        throw new ApiError(sanitizeClientError(503), 503);
      }

      // Handle 429 (rate limit) with exponential backoff — skip for bootstrap auth calls
      const isBootstrapAuth = path === '/auth/me' || path === '/auth/branding';
      if (res.status === 429 && attempt < MAX_RETRIES && !isBootstrapAuth) {
        const retryAfterMs = parseRetryAfterMs(res.headers.get('Retry-After'));
        const delay = retryAfterMs ?? calculateBackoffDelay(attempt);
        noteRateLimit(delay);
        if (import.meta.env.DEV) {
          console.warn(
            `Rate limited (429). Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (!res.ok) {
        await failRequest(res, path);
      }

      if (res.status === 204 || res.status === 202) return {} as T;
      const text = await res.text();
      if (!text.trim()) return {} as T;
      return JSON.parse(text) as T;
    }

    // Should not reach here, but fail if we do
    throw new ApiError(sanitizeClientError(429), 429);
  };

  const promise = executeRequest();

  // Store the promise for deduplication
  if (cacheKey) {
    pendingRequests.set(cacheKey, promise);
    promise
      .catch(() => {
        // Remove from cache on error so it can be retried
        pendingRequests.delete(cacheKey);
      })
      .finally(() => {
        // Remove from cache after completion
        pendingRequests.delete(cacheKey);
      });
  }

  return promise;
}

async function requestText(path: string, options: RequestInit = {}): Promise<string> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    credentials: 'include',
    headers: { ...requestHeaders(options), ...options.headers },
  });
  if (!res.ok) {
    await failRequest(res, path);
  }
  return res.text();
}

export interface LoginResult {
  user?: User;
  twoFactorRequired?: boolean;
  challenge?: string;
}

export interface TwoFactorStatus {
  enabled: boolean;
  recoveryRemaining: number;
}

export interface TwoFactorSetup {
  secret: string;
  otpauth: string;
  qr: string;
}

export interface SshKeySummary {
  id: string;
  name: string;
  publicKey: string;
  fingerprint: string;
  createdAt: string;
}

export const api = {
  login: (identifier: string, password: string, turnstileToken?: string) =>
    request<LoginResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password, turnstileToken }),
    }),

  loginTwoFactor: (challenge: string, code: string) =>
    request<{ user: User }>('/auth/login/2fa', {
      method: 'POST',
      body: JSON.stringify({ challenge, code }),
    }),

  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),

  twoFactorStatus: () => request<TwoFactorStatus>('/auth/me/2fa'),

  twoFactorSetup: () => request<TwoFactorSetup>('/auth/me/2fa/setup', { method: 'POST' }),

  twoFactorEnable: (code: string) =>
    request<{ success: boolean; recoveryCodes: string[] }>('/auth/me/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  twoFactorDisable: (password: string) =>
    request<{ success: boolean }>('/auth/me/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  regenerateRecoveryCodes: (password: string) =>
    request<{ recoveryCodes: string[] }>('/auth/me/2fa/recovery-codes', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  sshKeys: () => request<SshKeySummary[]>('/auth/me/ssh-keys'),
  githubPatStatus: () => request<{ configured: boolean }>('/auth/me/github-pat'),
  discordStatus: () =>
    request<{
      enabled: boolean;
      linked: boolean;
      username: string | null;
      discordId: string | null;
      linkedAt: string | null;
      twoFactorEnabled: boolean;
    }>('/auth/me/discord'),
  prepareDiscordLink: (password: string, code?: string) =>
    request<{ linkToken: string; expiresInSeconds: number }>('/auth/me/discord/prepare-link', {
      method: 'POST',
      body: JSON.stringify({ password, code }),
    }),
  unlinkDiscord: () => request<{ linked: boolean }>('/auth/me/discord', { method: 'DELETE' }),
  saveGithubPat: (token: string) =>
    request<{ configured: boolean; login: string }>('/auth/me/github-pat', {
      method: 'PUT',
      body: JSON.stringify({ token }),
    }),
  removeGithubPat: () =>
    request<{ configured: boolean }>('/auth/me/github-pat', { method: 'DELETE' }),

  addSshKey: (name: string, publicKey: string) =>
    request<SshKeySummary>('/auth/me/ssh-keys', {
      method: 'POST',
      body: JSON.stringify({ name, publicKey }),
    }),

  deleteSshKey: (id: string) =>
    request<{ success: boolean }>(`/auth/me/ssh-keys/${id}`, { method: 'DELETE' }),

  register: (data: {
    email: string;
    username: string;
    password: string;
    firstName?: string;
    lastName?: string;
    turnstileToken?: string;
  }) =>
    request<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  forgotPassword: (email: string, turnstileToken?: string) =>
    request<{ success: boolean; mailEnabled: boolean }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email, turnstileToken }),
    }),

  resetPassword: (token: string, password: string) =>
    request<{ success: boolean }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),

  me: () => request<User>('/auth/me'),

  updateProfile: (data: UpdateProfileInput) =>
    request<User>('/auth/me', { method: 'PATCH', body: JSON.stringify(data) }),

  accountApiKeys: () => request<ApiKeySummary[]>('/client/account/api-keys'),

  createAccountApiKey: (memo: string) =>
    request<CreatedApiKey>('/client/account/api-keys', {
      method: 'POST',
      body: JSON.stringify({ memo }),
    }),

  deleteAccountApiKey: (id: string) =>
    request<{ deleted: boolean }>(`/client/account/api-keys/${id}`, { method: 'DELETE' }),

  admin: {
    dashboard: () => request<Record<string, unknown>>('/admin/dashboard'),
    users: (params?: { search?: string; role?: string; suspended?: string }) => {
      const qs = new URLSearchParams();
      if (params?.search) qs.set('search', params.search);
      if (params?.role) qs.set('role', params.role);
      if (params?.suspended) qs.set('suspended', params.suspended);
      const q = qs.toString();
      return request<AdminUserSummary[]>(`/admin/users${q ? `?${q}` : ''}`);
    },
    user: (id: string) => request<AdminUserDetail>(`/admin/users/${id}`),
    userActivity: (id: string, options?: { limit?: number; cursor?: string | null }) => {
      const params = new URLSearchParams();
      params.set('limit', String(options?.limit ?? 20));
      if (options?.cursor) params.set('cursor', options.cursor);
      return request<ActivityPageResponse>(`/admin/users/${id}/activity?${params}`);
    },
    createUser: (data: CreateAdminUserInput) =>
      request<User>('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
    updateUser: (id: string, data: UpdateAdminUserInput) =>
      request<User>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteUser: (id: string) => request(`/admin/users/${id}`, { method: 'DELETE' }),
    nodes: (params?: { search?: string; locationId?: string; maintenance?: string }) => {
      const q = new URLSearchParams();
      if (params?.search) q.set('search', params.search);
      if (params?.locationId) q.set('locationId', params.locationId);
      if (params?.maintenance) q.set('maintenance', params.maintenance);
      const qs = q.toString();
      return request<AdminNodeSummary[]>(`/admin/nodes${qs ? `?${qs}` : ''}`);
    },
    node: (id: string) => request<AdminNodeDetail>(`/admin/nodes/${id}`),
    createNode: (data: Record<string, unknown>) =>
      request<AdminNodeSummary>('/admin/nodes', { method: 'POST', body: JSON.stringify(data) }),
    updateNode: (id: string, data: UpdateAdminNodeInput) =>
      request<AdminNodeSummary>(`/admin/nodes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    rotateNodeToken: (id: string) => request(`/admin/nodes/${id}/rotate-token`, { method: 'POST' }),
    nodeDiagnostics: (id: string) => request<NodeDiagnostics>(`/admin/nodes/${id}/diagnostics`),
    featherWingsRelease: () => request<FeatherWingsReleaseInfo>('/admin/featherwings/release'),
    nodeStats: (id: string, range = '24h') =>
      request<NodeStatsResponse>(`/admin/nodes/${id}/stats?range=${encodeURIComponent(range)}`),
    nodeConfig: (id: string) =>
      fetch(`${API}/admin/nodes/${id}/config`, { headers: requestHeaders() }).then((r) => r.text()),
    nodeSystem: (id: string) => request(`/admin/nodes/${id}/system`),
    deleteNode: (id: string) => request(`/admin/nodes/${id}`, { method: 'DELETE' }),
    locations: (params?: { search?: string }) => {
      const q = new URLSearchParams();
      if (params?.search) q.set('search', params.search);
      const qs = q.toString();
      return request<AdminLocationSummary[]>(`/admin/locations${qs ? `?${qs}` : ''}`);
    },
    location: (id: string) => request<AdminLocationDetail>(`/admin/locations/${id}`),
    createLocation: (data: { short: string; long: string; flagUrl?: string | null }) =>
      request('/admin/locations', { method: 'POST', body: JSON.stringify(data) }),
    updateLocation: (id: string, data: UpdateAdminLocationInput) =>
      request<AdminLocationSummary>(`/admin/locations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteLocation: (id: string) => request(`/admin/locations/${id}`, { method: 'DELETE' }),
    allocations: (nodeId: string) => request<AdminAllocation[]>(`/admin/nodes/${nodeId}/allocations`),
    createAllocations: (nodeId: string, data: CreateAllocationInput) =>
      request<CreateAllocationResult>(`/admin/nodes/${nodeId}/allocations`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateAllocation: (id: string, data: { alias?: string | null; notes?: string | null }) =>
      request<AdminAllocation>(`/admin/allocations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteAllocation: (id: string) => request<{ deleted: boolean }>(`/admin/allocations/${id}`, { method: 'DELETE' }),
    bulkDeleteAllocations: (nodeId: string, data: BulkDeleteAllocationsInput) =>
      request<BulkDeleteAllocationsResult>(`/admin/nodes/${nodeId}/allocations/bulk-delete`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    serverAllocations: (serverId: string) =>
      request<ServerAllocationsResponse>(`/admin/servers/${serverId}/allocations`),
    assignServerAllocation: (serverId: string, allocationId: string) =>
      request<ServerAllocationsResponse>(`/admin/servers/${serverId}/allocations/${allocationId}`, {
        method: 'POST',
      }),
    setPrimaryServerAllocation: (serverId: string, allocationId: string) =>
      request<ServerAllocationsResponse>(`/admin/servers/${serverId}/allocations/${allocationId}/primary`, {
        method: 'POST',
      }),
    unassignServerAllocation: (serverId: string, allocationId: string) =>
      request<ServerAllocationsResponse>(`/admin/servers/${serverId}/allocations/${allocationId}`, {
        method: 'DELETE',
      }),
    serverDomain: (serverId: string) => request<ServerDomainResponse>(`/admin/servers/${serverId}/domain`),
    createServerDomain: (serverId: string, data: { slug: string; preferSubdomain?: boolean }) =>
      request<ServerDomainResponse>(`/admin/servers/${serverId}/domain`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateServerDomainPreference: (serverId: string, preferSubdomain: boolean) =>
      request<ServerDomainResponse>(`/admin/servers/${serverId}/domain`, {
        method: 'PATCH',
        body: JSON.stringify({ preferSubdomain }),
      }),
    deleteServerDomain: (serverId: string) =>
      request<ServerDomainResponse>(`/admin/servers/${serverId}/domain`, { method: 'DELETE' }),
    listDomains: () =>
      request<
        Array<
          ServerDomainInfo & {
            server: {
              id: string;
              name: string;
              owner: { id: string; username: string; email: string };
              node: { id: string; name: string; domainBase: string | null };
            };
          }
        >
      >('/admin/domains'),
    nests: (params?: { search?: string }) => {
      const q = new URLSearchParams();
      if (params?.search) q.set('search', params.search);
      const qs = q.toString();
      return request<AdminNestSummary[]>(`/admin/nests${qs ? `?${qs}` : ''}`);
    },
    nest: (id: string) => request<AdminNestDetail>(`/admin/nests/${id}`),
    createNest: (data: CreateAdminNestInput) =>
      request<AdminNestSummary>('/admin/nests', { method: 'POST', body: JSON.stringify(data) }),
    updateNest: (id: string, data: UpdateAdminNestInput) =>
      request<AdminNestSummary>(`/admin/nests/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteNest: (id: string) => request(`/admin/nests/${id}`, { method: 'DELETE' }),
    eggs: (params?: { nestId?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.nestId) q.set('nestId', params.nestId);
      if (params?.search) q.set('search', params.search);
      const qs = q.toString();
      return request<AdminEggSummary[]>(`/admin/eggs${qs ? `?${qs}` : ''}`);
    },
    egg: (id: string) => request<AdminEggDetail>(`/admin/eggs/${id}`),
    importEgg: (nestId: string, json: unknown) =>
      request<AdminEggSummary>('/admin/eggs/import', { method: 'POST', body: JSON.stringify({ nestId, json }) }),
    reimportEgg: (id: string, json: unknown) =>
      request<AdminEggDetail>(`/admin/eggs/${id}/import`, { method: 'PUT', body: JSON.stringify({ json }) }),
    updateEgg: (id: string, data: UpdateAdminEggInput) =>
      request<AdminEggSummary>(`/admin/eggs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    updateEggVariables: (id: string, variables: EggVariableInput[]) =>
      request<AdminEggVariable[]>(`/admin/eggs/${id}/variables`, {
        method: 'PUT',
        body: JSON.stringify({ variables }),
      }),
    deleteEgg: (id: string) => request(`/admin/eggs/${id}`, { method: 'DELETE' }),
    servers: (params?: {
      search?: string;
      nodeId?: string;
      suspended?: string;
      status?: string;
      refresh?: boolean;
    }) => {
      const q = new URLSearchParams();
      if (params?.search) q.set('search', params.search);
      if (params?.nodeId) q.set('nodeId', params.nodeId);
      if (params?.suspended) q.set('suspended', params.suspended);
      if (params?.status) q.set('status', params.status);
      if (params?.refresh) q.set('refresh', 'true');
      const qs = q.toString();
      return request<AdminServerSummary[]>(`/admin/servers${qs ? `?${qs}` : ''}`);
    },
    server: (id: string) => request<AdminServerDetail>(`/admin/servers/${id}`),
    createServer: (data: Record<string, unknown>) =>
      request<AdminServerSummary>('/admin/servers', { method: 'POST', body: JSON.stringify(data) }),
    updateServer: (id: string, data: UpdateAdminServerInput) =>
      request<AdminServerDetail>(`/admin/servers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    websocket: (id: string) =>
      request<{ token: string; socket: string }>(`/admin/servers/${id}/websocket`),
    command: (id: string, command: string) =>
      request(`/admin/servers/${id}/command`, { method: 'POST', body: JSON.stringify({ command }) }),
    installLogs: (id: string) =>
      request<{ response: string[] }>(`/admin/servers/${id}/install-logs`),
    serverPower: (id: string, action: string) =>
      request(`/admin/servers/${id}/power`, { method: 'POST', body: JSON.stringify({ action }) }),
    clearServerPowerState: (id: string) =>
      request<{ success: boolean; containerState: string }>(`/admin/servers/${id}/clear-power-state`, {
        method: 'POST',
      }),
    reinstallServer: (id: string, wipeFiles = false) =>
      request(`/admin/servers/${id}/reinstall`, {
        method: 'POST',
        body: JSON.stringify({ wipeFiles }),
      }),
    deleteServer: (id: string) => request(`/admin/servers/${id}`, { method: 'DELETE' }),
    activity: (
      scope: 'panel' | 'auth' | 'admin' = 'panel',
      options?: { limit?: number; cursor?: string | null },
    ) => {
      const params = new URLSearchParams({ scope });
      params.set('limit', String(options?.limit ?? 15));
      if (options?.cursor) params.set('cursor', options.cursor);
      return request<ActivityPageResponse>(`/admin/activity?${params}`);
    },
    clearActivity: (scope: 'panel' | 'auth' | 'admin' = 'panel') =>
      request<{ deleted: number; scope: string }>(`/admin/activity?scope=${scope}`, {
        method: 'DELETE',
      }),
    clearServerActivity: (id: string) =>
      request<{ deleted: number }>(`/admin/servers/${id}/activity`, { method: 'DELETE' }),
    settings: () => request<Record<string, unknown>>('/admin/settings'),
    updateSettings: (data: Record<string, unknown>) =>
      request('/admin/settings', { method: 'PUT', body: JSON.stringify(data) }),
    plugins: () => request<{ plugins: AdminPanelPlugin[] }>('/admin/plugins'),
    plugin: (id: string) => request<{ plugin: AdminPanelPlugin }>(`/admin/plugins/${id}`),
    updatePlugin: (id: string, data: { enabled?: boolean; settings?: Record<string, unknown> }) =>
      request<{ plugin: AdminPanelPlugin }>(`/admin/plugins/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    fivemCatalog: (params?: { q?: string; category?: string; includeDisabled?: boolean }) => {
      const qs = new URLSearchParams();
      if (params?.q) qs.set('q', params.q);
      if (params?.category) qs.set('category', params.category);
      if (params?.includeDisabled) qs.set('includeDisabled', 'true');
      const q = qs.toString();
      return request<{ plugins: MarketplaceCatalogPlugin[] }>(
        `/admin/plugins/fivem-marketplace/catalog${q ? `?${q}` : ''}`,
      );
    },
    createFivemCatalogEntry: (data: FivemCatalogEntryInput) =>
      request<{ plugin: MarketplaceCatalogPlugin }>('/admin/plugins/fivem-marketplace/catalog', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateFivemCatalogEntry: (pluginId: string, data: Partial<FivemCatalogEntryInput>) =>
      request<{ plugin: MarketplaceCatalogPlugin }>(`/admin/plugins/fivem-marketplace/catalog/${pluginId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    deleteFivemCatalogEntry: (pluginId: string) =>
      request<{ success: boolean }>(`/admin/plugins/fivem-marketplace/catalog/${pluginId}`, {
        method: 'DELETE',
      }),
    testSmtp: (to: string, smtp?: Record<string, unknown>) =>
      request<{ success: boolean }>('/admin/settings/smtp/test', {
        method: 'POST',
        body: JSON.stringify({ to, smtp }),
      }),
    testCloudflareDns: (data?: { apiToken?: string; zoneId?: string }) =>
      request<{ ok: true; zoneName?: string }>('/admin/settings/cloudflare/test', {
        method: 'POST',
        body: JSON.stringify(data ?? {}),
      }),
    previewEmailTemplate: (
      templateId: import('./email-templates').EmailTemplateId,
      template: import('./email-templates').EmailTemplate,
    ) =>
      request<{ html: string }>('/admin/settings/email-templates/preview', {
        method: 'POST',
        body: JSON.stringify({ templateId, template }),
      }),
    refreshServerStates: () =>
      request<{
        cacheEntriesCleared: number;
        serversPolled: number;
        serversUpdated: number;
        pollFailures: number;
      }>('/admin/system/refresh-server-states', { method: 'POST' }),
    uploadBrandingAsset: (kind: BrandingAssetKind, data: string, mimeType: string) =>
      request<{ url: string; branding: Record<string, unknown> }>('/admin/settings/branding-asset', {
        method: 'POST',
        body: JSON.stringify({ kind, data, mimeType }),
      }),
    setBrandingAssetUrl: (kind: BrandingAssetKind, url: string) =>
      request<{ branding: Record<string, unknown> }>('/admin/settings/branding-asset-url', {
        method: 'POST',
        body: JSON.stringify({ kind, url }),
      }),
    deleteBrandingAsset: (kind: BrandingAssetKind) =>
      request<{ branding: Record<string, unknown> }>(`/admin/settings/branding-asset/${kind}`, {
        method: 'DELETE',
      }),
    apiKeys: () => request<ApiKeySummary[]>('/admin/api-keys'),
    createApiKey: (memo: string) =>
      request<CreatedApiKey>('/admin/api-keys', {
        method: 'POST',
        body: JSON.stringify({ memo }),
      }),
    deleteApiKey: (id: string) =>
      request<{ deleted: boolean }>(`/admin/api-keys/${id}`, { method: 'DELETE' }),
    userApiKeys: (userId: string) => request<ApiKeySummary[]>(`/admin/users/${userId}/api-keys`),
    createUserApiKey: (
      userId: string,
      data: { memo?: string; keyType?: 'account' | 'application' },
    ) =>
      request<CreatedApiKey>(`/admin/users/${userId}/api-keys`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    deleteUserApiKey: (userId: string, keyId: string) =>
      request<{ deleted: boolean }>(`/admin/users/${userId}/api-keys/${keyId}`, {
        method: 'DELETE',
      }),
    databaseHosts: (nodeId: string) => request<DatabaseHostSummary[]>(`/admin/nodes/${nodeId}/database-hosts`),
    createDatabaseHost: (nodeId: string, data: CreateDatabaseHostInput) =>
      request<DatabaseHostSummary>(`/admin/nodes/${nodeId}/database-hosts`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    testDatabaseHostConnection: (
      nodeId: string,
      data: { host: string; port?: number; username: string; password: string },
    ) =>
      request<{ ok: boolean }>(`/admin/nodes/${nodeId}/database-hosts/test-connection`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateDatabaseHost: (nodeId: string, hostId: string, data: UpdateDatabaseHostInput) =>
      request<DatabaseHostSummary>(`/admin/nodes/${nodeId}/database-hosts/${hostId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    deleteDatabaseHost: (nodeId: string, hostId: string) =>
      request<{ deleted: boolean }>(`/admin/nodes/${nodeId}/database-hosts/${hostId}`, {
        method: 'DELETE',
      }),
    databases: () => request<AdminDatabaseSummary[]>('/admin/databases'),

    tickets: (params?: {
      status?: TicketStatus;
      priority?: TicketPriority;
      search?: string;
      assigneeId?: string;
    }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.priority) qs.set('priority', params.priority);
      if (params?.search) qs.set('search', params.search);
      if (params?.assigneeId) qs.set('assigneeId', params.assigneeId);
      const q = qs.toString();
      return request<{ items: TicketSummary[] }>(`/admin/tickets${q ? `?${q}` : ''}`);
    },
    ticket: (id: string) => request<TicketDetail>(`/admin/tickets/${id}`),
    updateTicket: (id: string, data: UpdateTicketInput) =>
      request<TicketDetail>(`/admin/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    replyTicket: async (id: string, input: { body: string; images?: File[] }) => {
      if (input.images?.length) {
        const form = new FormData();
        form.append('body', input.body);
        for (const img of input.images) form.append('images', img, img.name);
        const res = await fetch(`${API}/admin/tickets/${id}/messages`, {
          method: 'POST',
          credentials: 'include',
          body: form,
        });
        if (!res.ok) await failRequest(res, `/admin/tickets/${id}/messages`);
        return res.json() as Promise<TicketDetail>;
      }
      return request<TicketDetail>(`/admin/tickets/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: input.body }),
      });
    },
    deleteTicket: (id: string) =>
      request<{ deleted: boolean }>(`/admin/tickets/${id}`, { method: 'DELETE' }),
  },

  client: {
    servers: (refresh = false) =>
      request<ServerSummary[]>(`/client/servers${refresh ? '?refresh=true' : ''}`),
    server: (id: string) => request<ServerDetail>(`/client/servers/${id}`),
    power: (id: string, action: string) =>
      request(`/client/servers/${id}/power`, { method: 'POST', body: JSON.stringify({ action }) }),
    clearPowerState: (id: string) =>
      request<{ success: boolean; containerState: string }>(`/client/servers/${id}/clear-power-state`, {
        method: 'POST',
      }),
    reinstall: (id: string, wipeFiles: boolean) =>
      request(`/client/servers/${id}/reinstall`, {
        method: 'POST',
        body: JSON.stringify({ wipeFiles }),
      }),
    ping: (id: string) =>
      request<{
        host: string;
        port: number;
        probeUrl: string;
        method: 'browser';
      }>(`/client/servers/${id}/ping`),
    playerCount: (id: string) => request<ServerPlayerCountResponse>(`/client/servers/${id}/players`),
    websocket: (id: string) => request<{ token: string; socket: string }>(`/client/servers/${id}/websocket`),
    files: (id: string, directory = '/') =>
      request(`/client/servers/${id}/files?directory=${encodeURIComponent(directory)}`),
    fileContents: (id: string, file: string) =>
      requestText(`/client/servers/${id}/files/contents?file=${encodeURIComponent(file)}`),
    writeFile: (id: string, file: string, content: string) =>
      request(`/client/servers/${id}/files/write`, {
        method: 'POST',
        body: JSON.stringify({ file, content }),
      }),
    command: (id: string, command: string) =>
      request(`/client/servers/${id}/command`, { method: 'POST', body: JSON.stringify({ command }) }),
    logs: (id: string, size = 100) =>
      request<{ response: string[] }>(`/client/servers/${id}/logs?size=${size}`),
    installLogs: (id: string) =>
      request<{ response: string[] }>(`/client/servers/${id}/install-logs`),
    subusers: (id: string) => request<Record<string, unknown>[]>(`/client/servers/${id}/subusers`),
    addSubuser: (id: string, email: string, permissions: string[]) =>
      request(`/client/servers/${id}/subusers`, {
        method: 'POST',
        body: JSON.stringify({ email, permissions }),
      }),
    removeSubuser: (id: string, subuserId: string) =>
      request(`/client/servers/${id}/subusers/${subuserId}`, { method: 'DELETE' }),
    updateVariables: (id: string, variables: Array<{ id: string; value: string }>) =>
      request(`/client/servers/${id}/variables`, {
        method: 'PATCH',
        body: JSON.stringify({ variables }),
      }),
    updateStartup: (
      id: string,
      data: {
        startup?: string;
        image?: string;
        variables?: Array<{ id: string; value: string }>;
      },
    ) =>
      request(`/client/servers/${id}/startup`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    updateServer: (id: string, data: { name?: string; description?: string }) =>
      request<ServerDetail>(`/client/servers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    activity: (id: string, options?: { limit?: number; cursor?: string | null }) => {
      const params = new URLSearchParams();
      params.set('limit', String(options?.limit ?? 15));
      if (options?.cursor) params.set('cursor', options.cursor);
      return request<ActivityPageResponse>(`/client/servers/${id}/activity?${params}`);
    },
    clearActivity: (id: string) =>
      request<{ deleted: number }>(`/client/servers/${id}/activity`, { method: 'DELETE' }),
    stats: (id: string, range = '24h') =>
      request<ServerStatsResponse>(`/client/servers/${id}/stats?range=${range}`),
    statsSnapshot: (
      id: string,
      payload: {
        cpu?: number;
        memoryBytes?: number;
        diskBytes?: number;
        networkRxBytes?: number;
        networkTxBytes?: number;
        state?: string;
      },
    ) =>
      request<void>(`/client/servers/${id}/stats/snapshot`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    networkAllocations: (id: string) =>
      request<ServerAllocationsResponse>(`/client/servers/${id}/network/allocations`),
    connection: (id: string) => request<ServerConnectionInfo>(`/client/servers/${id}/connection`),
    serverDomain: (id: string) => request<ServerDomainResponse>(`/client/servers/${id}/network/domain`),
    createServerDomain: (id: string, data: { slug: string; preferSubdomain?: boolean }) =>
      request<ServerDomainResponse>(`/client/servers/${id}/network/domain`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateServerDomainPreference: (id: string, preferSubdomain: boolean) =>
      request<ServerDomainResponse>(`/client/servers/${id}/network/domain`, {
        method: 'PATCH',
        body: JSON.stringify({ preferSubdomain }),
      }),
    deleteServerDomain: (id: string) =>
      request<ServerDomainResponse>(`/client/servers/${id}/network/domain`, { method: 'DELETE' }),
    createNetworkAllocation: (id: string) =>
      request<ServerAllocationsResponse>(`/client/servers/${id}/network/allocations`, { method: 'POST' }),
    setPrimaryNetworkAllocation: (id: string, allocationId: string) =>
      request<ServerAllocationsResponse>(
        `/client/servers/${id}/network/allocations/${allocationId}/primary`,
        { method: 'POST' },
      ),
    deleteNetworkAllocation: (id: string, allocationId: string) =>
      request<ServerAllocationsResponse>(`/client/servers/${id}/network/allocations/${allocationId}`, {
        method: 'DELETE',
      }),
    databases: async (serverId: string) => {
      const res = await request<{
        databases: ServerDatabaseSummary[];
        limit: number;
        used: number;
        canCreate: boolean;
        manager?: DatabaseManagerMeta;
      }>(`/client/servers/${serverId}/databases`);
      return {
        items: res.databases,
        limit: res.limit,
        used: res.used,
        canCreate: res.canCreate,
        manager: res.manager ?? {
          enabled: false,
          allowSqlConsole: false,
          allowDataEdits: false,
          canEdit: false,
        },
      } satisfies ServerResourceQuotaResponse<ServerDatabaseSummary> & { manager: DatabaseManagerMeta };
    },
    createDatabase: (serverId: string, data: { name: string; remote?: string }) =>
      request<ServerDatabaseSummary>(`/client/servers/${serverId}/databases`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    deleteDatabase: (id: string) => request<{ deleted: boolean }>(`/client/databases/${id}`, { method: 'DELETE' }),
    databaseManager: (serverId: string, databaseId: string) =>
      request<DatabaseManagerSchemaResponse>(
        `/client/servers/${serverId}/databases/${databaseId}/manager`,
      ),
    databaseManagerTable: (
      serverId: string,
      databaseId: string,
      table: string,
      params?: { page?: number; pageSize?: number },
    ) => {
      const q = new URLSearchParams();
      if (params?.page) q.set('page', String(params.page));
      if (params?.pageSize) q.set('pageSize', String(params.pageSize));
      const qs = q.toString();
      return request<DatabaseManagerTableResponse>(
        `/client/servers/${serverId}/databases/${databaseId}/manager/tables/${encodeURIComponent(table)}${qs ? `?${qs}` : ''}`,
      );
    },
    databaseManagerQuery: (serverId: string, databaseId: string, sql: string) =>
      request<DatabaseManagerQueryResponse>(
        `/client/servers/${serverId}/databases/${databaseId}/manager/query`,
        { method: 'POST', body: JSON.stringify({ sql }) },
      ),
    databaseManagerScript: (serverId: string, databaseId: string, sql: string, fileName?: string) =>
      request<DatabaseManagerScriptResponse>(
        `/client/servers/${serverId}/databases/${databaseId}/manager/script`,
        { method: 'POST', body: JSON.stringify({ sql, fileName }) },
      ),
    databaseManagerInsertRow: (
      serverId: string,
      databaseId: string,
      table: string,
      values: Record<string, string | number | boolean | null>,
    ) =>
      request<{ affectedRows: number; insertId: string | null }>(
        `/client/servers/${serverId}/databases/${databaseId}/manager/tables/${encodeURIComponent(table)}/rows`,
        { method: 'POST', body: JSON.stringify({ values }) },
      ),
    databaseManagerUpdateRow: (
      serverId: string,
      databaseId: string,
      table: string,
      primaryKey: Record<string, string | number | boolean | null>,
      values: Record<string, string | number | boolean | null>,
    ) =>
      request<{ affectedRows: number }>(
        `/client/servers/${serverId}/databases/${databaseId}/manager/tables/${encodeURIComponent(table)}/rows`,
        { method: 'PATCH', body: JSON.stringify({ primaryKey, values }) },
      ),
    databaseManagerDeleteRow: (
      serverId: string,
      databaseId: string,
      table: string,
      primaryKey: Record<string, string | number | boolean | null>,
    ) =>
      request<{ affectedRows: number }>(
        `/client/servers/${serverId}/databases/${databaseId}/manager/tables/${encodeURIComponent(table)}/rows`,
        { method: 'DELETE', body: JSON.stringify({ primaryKey }) },
      ),
    deleteFiles: (serverId: string, root: string, files: string[]) =>
      request(`/client/servers/${serverId}/files/delete`, {
        method: 'POST',
        body: JSON.stringify({ root, files }),
      }),
    createDirectory: (serverId: string, root: string, name: string) =>
      request(`/client/servers/${serverId}/files/create-directory`, {
        method: 'POST',
        body: JSON.stringify({ root, name }),
      }),
    renameFiles: (serverId: string, root: string, files: Array<{ from: string; to: string }>) =>
      request(`/client/servers/${serverId}/files/rename`, {
        method: 'PUT',
        body: JSON.stringify({ root, files }),
      }),
    moveFiles: (serverId: string, files: Array<{ source: string; destination: string }>) =>
      request<{ success: boolean; moved: number }>(`/client/servers/${serverId}/files/move`, {
        method: 'POST',
        body: JSON.stringify({ files }),
      }),
    copyFile: (serverId: string, location: string) =>
      request(`/client/servers/${serverId}/files/copy`, {
        method: 'POST',
        body: JSON.stringify({ location }),
      }),
    compressFiles: (serverId: string, root: string, files: string[]) =>
      request<{ success: boolean; file?: { name: string } }>(`/client/servers/${serverId}/files/compress`, {
        method: 'POST',
        body: JSON.stringify({ root, files }),
      }),
    decompressFile: (serverId: string, root: string, file: string) =>
      request(`/client/servers/${serverId}/files/decompress`, {
        method: 'POST',
        body: JSON.stringify({ root, file }),
      }),
    chmodFiles: (serverId: string, root: string, files: Array<{ file: string; mode: string }>) =>
      request(`/client/servers/${serverId}/files/chmod`, {
        method: 'POST',
        body: JSON.stringify({ root, files }),
      }),
    downloadFileUrl: (serverId: string, file: string) =>
      `${API}/client/servers/${serverId}/files/download?file=${encodeURIComponent(file)}`,
    downloadFile: async (serverId: string, file: string) => {
      const downloadPath = `/client/servers/${serverId}/files/download?file=${encodeURIComponent(file)}`;
      const res = await fetch(`${API}${downloadPath}`, { credentials: 'include' });
      if (!res.ok) await failRequest(res, downloadPath);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    },
    uploadFiles: async (serverId: string, directory: string, files: File[]) => {
      const form = new FormData();
      for (const f of files) form.append('files', f, f.name);
      const uploadPath = `/client/servers/${serverId}/files/upload?directory=${encodeURIComponent(directory)}`;
      const res = await fetch(`${API}${uploadPath}`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      if (!res.ok) await failRequest(res, uploadPath);
      return res.json() as Promise<{ success: boolean; uploaded: number }>;
    },
    updateSubuser: (serverId: string, subuserId: string, permissions: string[]) =>
      request(`/client/servers/${serverId}/subusers/${subuserId}`, {
        method: 'PATCH',
        body: JSON.stringify({ permissions }),
      }),
    backups: async (serverId: string) => {
      const res = await request<{
        backups: ServerBackupSummary[];
        limit: number;
        used: number;
        canCreate: boolean;
        disk?: ServerBackupDiskBudget;
      }>(`/client/servers/${serverId}/backups`);
      return {
        items: res.backups,
        limit: res.limit,
        used: res.used,
        canCreate: res.canCreate,
        disk: res.disk,
      } satisfies ServerResourceQuotaResponse<ServerBackupSummary>;
    },
    createBackup: (serverId: string, name: string, ignored?: string) =>
      request<ServerBackupSummary>(`/client/servers/${serverId}/backups`, {
        method: 'POST',
        body: JSON.stringify({ name, ignored }),
      }),
    deleteBackup: (id: string) => request<{ deleted: boolean }>(`/client/backups/${id}`, { method: 'DELETE' }),
    restoreBackup: (id: string) =>
      request<{ success: boolean }>(`/client/backups/${id}/restore`, { method: 'POST' }),
    lockBackup: (id: string, locked: boolean) =>
      request<ServerBackupSummary>(`/client/backups/${id}/lock`, {
        method: 'PATCH',
        body: JSON.stringify({ locked }),
      }),
    downloadBackup: async (id: string) => {
      const downloadPath = `/client/backups/${id}/download`;
      const res = await fetch(`${API}${downloadPath}`, { credentials: 'include' });
      if (!res.ok) await failRequest(res, downloadPath);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filenameFromContentDisposition(res.headers.get('content-disposition')) ?? 'backup.tar.gz';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    },
    schedules: (serverId: string) => request<ServerScheduleSummary[]>(`/client/servers/${serverId}/schedules`),
    createSchedule: (
      serverId: string,
      data: {
        name: string;
        cron: string;
        onlyWhenOnline?: boolean;
        tasks: Array<{ action: string; payload: string; sequenceId: number }>;
      },
    ) =>
      request<ServerScheduleSummary>(`/client/servers/${serverId}/schedules`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateSchedule: (
      id: string,
      data: {
        name?: string;
        cron?: string;
        isActive?: boolean;
        onlyWhenOnline?: boolean;
        tasks?: Array<{ action: string; payload: string; sequenceId: number }>;
      },
    ) =>
      request<ServerScheduleSummary>(`/client/schedules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    executeSchedule: (id: string) =>
      request<{ executed: boolean }>(`/client/schedules/${id}/execute`, { method: 'POST' }),
    deleteSchedule: (id: string) => request<{ deleted: boolean }>(`/client/schedules/${id}`, { method: 'DELETE' }),
    panelPlugins: () =>
      request<{ plugins: ClientPanelPlugin[] }>('/client/plugins'),
    marketplace: (serverId: string) =>
      request<MarketplacePageResponse>(`/client/servers/${serverId}/marketplace`),
    marketplaceLayout: (serverId: string) =>
      request<{ layout: FivemServerLayout }>(`/client/servers/${serverId}/marketplace/layout`),
    marketplaceUninstall: (serverId: string, pluginId: string) =>
      request(`/client/servers/${serverId}/marketplace/uninstall`, {
        method: 'POST',
        body: JSON.stringify({ pluginId }),
      }),
    marketplaceUpdate: (serverId: string, pluginId: string) =>
      request(`/client/servers/${serverId}/marketplace/update`, {
        method: 'POST',
        body: JSON.stringify({ pluginId }),
      }),
    marketplaceInstall: (serverId: string, pluginId: string) =>
      request(`/client/servers/${serverId}/marketplace/install`, {
        method: 'POST',
        body: JSON.stringify({ pluginId }),
      }),
    marketplaceCatalog: (serverId: string, params?: { q?: string; category?: string }) => {
      const qs = new URLSearchParams();
      if (params?.q) qs.set('q', params.q);
      if (params?.category) qs.set('category', params.category);
      const q = qs.toString();
      return request<{ plugins: MarketplaceCatalogPlugin[] }>(
        `/client/servers/${serverId}/marketplace/catalog${q ? `?${q}` : ''}`,
      );
    },
    marketplaceCatalogDetail: (serverId: string, pluginId: string) =>
      request<MarketplaceCatalogDetailResponse>(
        `/client/servers/${serverId}/marketplace/catalog/${encodeURIComponent(pluginId)}`,
      ),
    marketplaceGithubResolve: (serverId: string, url: string) =>
      request<GithubRepoResolved>(
        `/client/servers/${serverId}/marketplace/github/resolve?${new URLSearchParams({ url })}`,
      ),
    marketplaceGithubSearch: (serverId: string, q: string, page = 1, sort: GithubSearchSortId = 'best') => {
      const params = new URLSearchParams({ q, page: String(page), sort });
      return request<GithubSearchPage>(
        `/client/servers/${serverId}/marketplace/github/search?${params.toString()}`,
      );
    },
    marketplaceGithubFeatured: (serverId: string) =>
      request<{ featured: GithubFeaturedScript[] }>(
        `/client/servers/${serverId}/marketplace/github/featured`,
      ),
    marketplaceGithubInstall: (
      serverId: string,
      body: {
        githubOwner: string;
        githubRepo: string;
        githubRef: string;
        githubAsset?: string | null;
        displayName?: string;
        installPath: string;
        cfgResource: string;
        cfgAction: 'ensure' | 'start';
        cfgFile: string;
        patchCfg: boolean;
        useAutoPaths?: boolean;
      },
    ) =>
      request(`/client/servers/${serverId}/marketplace/github/install`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    marketplaceGithubUninstall: (serverId: string, installId: string) =>
      request(`/client/servers/${serverId}/marketplace/github/uninstall`, {
        method: 'POST',
        body: JSON.stringify({ installId }),
      }),
    marketplaceGithubUpdate: (serverId: string, installId: string) =>
      request(`/client/servers/${serverId}/marketplace/github/update`, {
        method: 'POST',
        body: JSON.stringify({ installId }),
      }),

    plugins: (serverId: string) =>
      request<MinecraftPluginsPageResponse>(`/client/servers/${serverId}/plugins`),
    pluginsSearch: (
      serverId: string,
      params?: { q?: string; offset?: number; limit?: number; index?: string; category?: string },
    ) => {
      const qs = new URLSearchParams();
      if (params?.q) qs.set('q', params.q);
      if (params?.offset != null) qs.set('offset', String(params.offset));
      if (params?.limit != null) qs.set('limit', String(params.limit));
      if (params?.index) qs.set('index', params.index);
      if (params?.category) qs.set('category', params.category);
      const q = qs.toString();
      return request<MinecraftPluginsSearchResponse>(
        `/client/servers/${serverId}/plugins/search${q ? `?${q}` : ''}`,
      );
    },
    pluginsProject: (serverId: string, slug: string) =>
      request<MinecraftPluginProjectResponse>(
        `/client/servers/${serverId}/plugins/project/${encodeURIComponent(slug)}`,
      ),
    pluginsInstall: (
      serverId: string,
      body: { projectId: string; versionId?: string | null; installDependencies?: boolean },
    ) =>
      request<{ installed: MinecraftPluginInstallEntry }>(`/client/servers/${serverId}/plugins/install`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    pluginsUninstall: (serverId: string, installId: string, installPath?: string) =>
      request(`/client/servers/${serverId}/plugins/uninstall`, {
        method: 'POST',
        body: JSON.stringify({ installId, ...(installPath ? { installPath } : {}) }),
      }),
    pluginsUpdate: (serverId: string, installId: string) =>
      request<{ installed: MinecraftPluginInstallEntry }>(`/client/servers/${serverId}/plugins/update`, {
        method: 'POST',
        body: JSON.stringify({ installId }),
      }),

    ticketMeta: () => request<TicketMetaResponse>('/client/tickets/meta'),
    tickets: (params?: { status?: 'open' | 'closed' | 'all' }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      const q = qs.toString();
      return request<{ items: TicketSummary[] }>(`/client/tickets${q ? `?${q}` : ''}`);
    },
    ticket: (id: string) => request<TicketDetail>(`/client/tickets/${id}`),
    createTicket: (data: CreateTicketInput) =>
      request<TicketDetail>('/client/tickets', { method: 'POST', body: JSON.stringify(data) }),
    replyTicket: async (id: string, input: { body: string; images?: File[] }) => {
      if (input.images?.length) {
        const form = new FormData();
        form.append('body', input.body);
        for (const img of input.images) form.append('images', img, img.name);
        const res = await fetch(`${API}/client/tickets/${id}/messages`, {
          method: 'POST',
          credentials: 'include',
          body: form,
        });
        if (!res.ok) await failRequest(res, `/client/tickets/${id}/messages`);
        return res.json() as Promise<TicketDetail>;
      }
      return request<TicketDetail>(`/client/tickets/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: input.body }),
      });
    },
    closeTicket: (id: string) =>
      request<TicketDetail>(`/client/tickets/${id}/close`, { method: 'POST' }),
  },

  branding: () => request<import('./panel-settings').PanelBranding>('/auth/branding'),
};

export interface AdminLocationSummary {
  id: string;
  uuid: string;
  short: string;
  long: string;
  flagUrl: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { nodes: number };
}

export interface AdminLocationDetail {
  id: string;
  uuid: string;
  short: string;
  long: string;
  flagUrl: string | null;
  createdAt: string;
  updatedAt: string;
  nodeCount: number;
  serverCount: number;
  nodes: Array<{
    id: string;
    name: string;
    fqdn: string;
    maintenanceMode: boolean;
    serverCount: number;
    allocationCount: number;
  }>;
}

export interface UpdateAdminLocationInput {
  short?: string;
  long?: string;
  flagUrl?: string | null;
}

export interface AdminNestSummary {
  id: string;
  uuid: string;
  name: string;
  description: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  _count: { eggs: number };
}

export interface AdminNestDetail {
  id: string;
  uuid: string;
  name: string;
  description: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  eggCount: number;
  serverCount: number;
  eggs: Array<{
    id: string;
    name: string;
    author: string;
    description: string;
    enabled: boolean;
    variableCount: number;
    serverCount: number;
  }>;
}

export interface CreateAdminNestInput {
  name: string;
  description?: string;
}

export interface UpdateAdminNestInput {
  name?: string;
  description?: string;
  author?: string;
}

export interface AdminEggSummary {
  id: string;
  uuid: string;
  nestId: string;
  name: string;
  author: string;
  description: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  nest: { id: string; name: string };
  _count: { variables: number; servers: number };
}

export interface AdminEggDetail {
  id: string;
  uuid: string;
  nestId: string;
  nest: { id: string; name: string };
  name: string;
  author: string;
  description: string;
  features: string[];
  dockerImages: Record<string, string>;
  startup: string;
  configStop: string;
  scriptInstall: string;
  scriptEntry: string;
  scriptContainer: string;
  scriptPrivileged: boolean;
  updateUrl: string | null;
  logoUrl: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  serverCount: number;
  variables: AdminEggVariable[];
}

export interface UpdateAdminEggInput {
  name?: string;
  description?: string;
  enabled?: boolean;
  logoUrl?: string;
}

export interface AdminEggVariable {
  id: string;
  name: string;
  description: string;
  envVariable: string;
  defaultValue: string;
  userViewable: boolean;
  userEditable: boolean;
  rules: string;
  fieldType: string;
}

export type EggVariableInput = Omit<AdminEggVariable, 'id'> & { id?: string };

export interface NodeCapacityStats {
  allocatedMemory: number;
  allocatedDisk: number;
  effectiveMemoryLimit: number;
  effectiveDiskLimit: number;
  memoryFree: number;
  diskFree: number;
  memoryUsedPercent: number;
  diskUsedPercent: number;
}

export interface NodeLiveUsageSummary {
  liveMemoryBytes: number;
  liveDiskBytes: number;
  liveCpuPercent: number;
  liveServerCount: number;
  serverCount: number;
  runningCount: number;
}

export interface NodeStatsSeriesPoint {
  recordedAt: string;
  cpu: number;
  memoryBytes: number;
  diskBytes: number;
  runningCount: number;
}

export interface NodeStatsResponse {
  range: string;
  capacity: NodeCapacityStats;
  summary: {
    serverCount: number;
    runningCount: number;
    suspendedCount: number;
    totalCpuLimit: number;
    liveCpuPercent: number;
    liveMemoryBytes: number;
    liveDiskBytes: number;
    assignedAllocations: number;
    allocationCount: number;
    liveServerCount: number;
  };
  series: NodeStatsSeriesPoint[];
  servers: Array<{
    id: string;
    name: string;
    memory: number;
    disk: number;
    cpu: number;
    status: string;
    suspended: boolean;
    installStatus: string | null;
    containerState: string | null;
    liveSource: 'wings' | 'snapshot' | null;
    live: {
      recordedAt: string;
      cpu: number;
      memoryBytes: number;
      diskBytes: number;
      networkRxBytes: number;
      networkTxBytes: number;
      state: string;
    } | null;
  }>;
}

export interface AdminNodeSummary {
  id: string;
  uuid: string;
  name: string;
  description: string;
  fqdn: string;
  scheme: string;
  behindProxy?: boolean;
  maintenanceMode: boolean;
  memory: number;
  disk: number;
  daemonListen: number;
  daemonSftp: number;
  publicIp?: string | null;
  domainBase?: string | null;
  cloudflareZoneId?: string | null;
  createdAt: string;
  online?: boolean;
  wingsVersion?: string | null;
  error?: string | null;
  location: { id: string; short: string; long: string; flagUrl: string | null };
  _count: { servers: number; allocations: number };
  capacity?: NodeCapacityStats;
}

export interface FeatherWingsReleaseInfo {
  latestVersion: string;
  tagName: string;
  releaseUrl: string;
  publishedAt: string | null;
  htmlUrl: string;
}

export interface NodeDiagnostics {
  node: {
    id: string;
    name: string;
    fqdn: string;
    scheme: string;
    behindProxy: boolean;
    daemonListen: number;
    daemonSftp: number;
  };
  panel: { url: string; apiUrl: string };
  wings: { online: boolean; wingsVersion: string | null; error: string | null };
  remote: { expected: string; hint: string };
  console: { hint: string };
  sftp: { host: string; port: number; usernameFormat: string };
}

export interface ServerConnectionInfo {
  game: {
    address: string;
    hostname: string;
    port: number;
    ipAddress?: string;
    subdomainAddress?: string | null;
    preferSubdomain?: boolean;
  };
  domain?: {
    feature: ServerDomainFeature;
    current: ServerDomainInfo | null;
  } | null;
  sftp: { host: string; port: number; username: string; uri: string };
  node: { name: string; fqdn: string; scheme: string; behindProxy: boolean };
  panel: { url: string };
  console: { hint: string };
}

export interface ServerDomainFeature {
  enabled: boolean;
  baseDomain: string;
  canManage: boolean;
  reason: string | null;
  reservedSlugs: string[];
  /** True when this egg can use Minecraft Java SRV (hostname-only join). */
  hostnameOnlySupported?: boolean;
}

export interface ServerDomainInfo {
  id: string;
  slug: string;
  fqdn: string;
  targetIp: string;
  status: string;
  message: string | null;
  preferSubdomain: boolean;
  hostnameOnly?: boolean;
  srvPort?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServerDomainResponse {
  feature: ServerDomainFeature;
  domain: ServerDomainInfo | null;
  preferSubdomain: boolean;
  ipAddress: string;
  subdomainAddress: string | null;
  preferredAddress: string;
  port: number;
}

export interface ServerPlayerCountResponse {
  online: number;
  max: number | null;
  source: 'fivem' | 'gamedig' | 'none';
  queryType: string | null;
  supported: boolean;
  offline: boolean;
  error: string | null;
}

export interface AdminNodeDetail extends Omit<AdminNodeSummary, '_count'> {
  behindProxy: boolean;
  memoryOverallocate: number;
  diskOverallocate: number;
  uploadSize: number;
  daemonTokenId: string;
  daemonBase: string;
  serverCount: number;
  allocationCount: number;
  assignedAllocations: number;
  online: boolean;
  system: Record<string, unknown> | null;
  capacity: NodeCapacityStats;
  liveUsage: NodeLiveUsageSummary | null;
  servers: Array<{
    id: string;
    name: string;
    status: string;
    suspended: boolean;
    installStatus?: string;
    containerState?: string | null;
    memory?: number;
    disk?: number;
    owner: { username: string };
    defaultAllocation: { ip: string; port: number };
  }>;
  allocations: AdminNodeAllocation[];
  recentActivity: ActivityLogEntry[];
}

export interface AdminNodeAllocation {
  id: string;
  ip: string;
  port: number;
  alias: string | null;
  notes: string | null;
  assigned: boolean;
  isPrimary: boolean;
  server: { id: string; name: string } | null;
}

export interface AdminAllocation {
  id: string;
  nodeId: string;
  ip: string;
  port: number;
  alias: string | null;
  notes: string | null;
  assigned: boolean;
  serverId: string | null;
  createdAt: string;
}

export interface CreateAllocationInput {
  ip?: string;
  ports: Array<number | string>;
  alias?: string;
  notes?: string;
}

export interface CreateAllocationResult {
  created: number;
  skipped: number;
  ip: string;
  ports: number[];
}

export interface BulkDeleteAllocationsInput {
  ip?: string;
  ids?: string[];
}

export interface BulkDeleteAllocationsResult {
  deleted: number;
  skippedAssigned: number;
}

export interface UpdateAdminNodeInput {
  name?: string;
  description?: string;
  locationId?: string;
  fqdn?: string;
  scheme?: 'http' | 'https';
  behindProxy?: boolean;
  maintenanceMode?: boolean;
  memory?: number;
  memoryOverallocate?: number;
  disk?: number;
  diskOverallocate?: number;
  daemonListen?: number;
  daemonSftp?: number;
  daemonBase?: string;
  uploadSize?: number;
  publicIp?: string | null;
  domainBase?: string | null;
  cloudflareZoneId?: string | null;
}

export interface AdminServerSummary {
  id: string;
  uuid: string;
  uuidShort: string;
  name: string;
  description: string | null;
  status: string;
  suspended: boolean;
  installStatus?: string;
  containerState?: string | null;
  memory: number;
  disk: number;
  cpu: number;
  createdAt: string;
  owner: { id: string; username: string; email: string; avatarUrl?: string | null };
  node: { id: string; name: string; fqdn?: string; location: { short: string; flagUrl?: string | null } };
  egg: { id: string; name: string; logoUrl?: string | null };
  defaultAllocation: { ip: string; port: number };
  nodeReachable?: boolean;
}

export interface AdminServerDetail extends Omit<AdminServerSummary, 'node' | 'egg'> {
  swap: number;
  io: number;
  installStatus: string;
  containerState?: string | null;
  allocationLimit?: number;
  backupLimit?: number;
  databaseLimit?: number;
  startup: string;
  subuserCount: number;
  egg: { id: string; name: string; logoUrl?: string | null; nest: { name: string } };
  node: { id: string; name: string; fqdn: string; location: { short: string; flagUrl?: string | null } };
  recentActivity: ActivityLogEntry[];
  nodeOnline?: boolean;
  nodeReachabilityError?: string | null;
}

export interface UpdateAdminServerInput {
  ownerId?: string;
  name?: string;
  description?: string;
  memory?: number;
  swap?: number;
  disk?: number;
  io?: number;
  cpu?: number;
  suspended?: boolean;
  allocationLimit?: number;
  backupLimit?: number;
  databaseLimit?: number;
}

export interface ServerAllocationEntry {
  id: string;
  ip: string;
  port: number;
  alias: string | null;
  notes: string | null;
  assigned: boolean;
  isDefault: boolean;
  displayHost: string;
  address: string;
  bindAddress: string;
}

export interface ServerAllocationsResponse {
  allocations: ServerAllocationEntry[];
  limit: number;
  used: number;
  canCreate: boolean;
}

export interface ServerSummary {
  id: string;
  uuid: string;
  uuidShort?: string;
  name: string;
  description?: string;
  status: string;
  containerState?: string;
  suspended: boolean;
  installStatus?: string;
  ownerId?: string;
  memory?: number;
  disk?: number;
  cpu?: number;
  image?: string;
  egg: { name: string; logoUrl?: string | null; dockerImages?: Record<string, string>; features?: string[] };
  node: { name: string; fqdn?: string; location?: { short: string; flagUrl?: string | null } };
  defaultAllocation: { ip: string; port: number; alias?: string | null };
  nodeReachable?: boolean;
}

export interface ServerResourceQuotaResponse<T> {
  items: T[];
  limit: number;
  used: number;
  canCreate: boolean;
  disk?: ServerBackupDiskBudget;
}

export interface ServerBackupDiskBudget {
  limitBytes: number | null;
  fileBytes: number;
  backupBytes: number;
  usedBytes: number;
  freeBytes: number | null;
  estimatedBackupBytes: number;
  canFitEstimatedBackup: boolean;
}

export interface ServerDatabaseSummary {
  id: string;
  serverId: string;
  name: string;
  database: string;
  username: string;
  remote: string;
  host: string;
  port: number;
  hostName: string;
  password?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseManagerMeta {
  enabled: boolean;
  allowSqlConsole: boolean;
  allowDataEdits: boolean;
  /** True when panel allows writes and this user has database.update. */
  canEdit: boolean;
}

export interface DatabaseManagerTableSummary {
  name: string;
  type: string;
  engine: string | null;
  approxRows: number | null;
  dataLength: number | null;
  indexLength: number | null;
}

export interface DatabaseManagerSchemaResponse {
  capabilities: { allowSqlConsole: boolean; allowDataEdits: boolean; canEdit?: boolean };
  tables: DatabaseManagerTableSummary[];
}

export interface DatabaseManagerTableResponse {
  table: string;
  columns: Array<{
    field: string;
    type: string;
    null: string;
    key: string;
    default: unknown;
    extra: string;
    comment: string;
  }>;
  primaryKey?: string[];
  page: number;
  pageSize: number;
  total: number;
  rows: Record<string, unknown>[];
}

export type DatabaseManagerQueryResponse =
  | {
      kind: 'rows';
      verb: string;
      columns: string[];
      rows: Record<string, unknown>[];
      rowCount: number;
      truncated: boolean;
    }
  | {
      kind: 'result';
      verb: string;
      affectedRows: number;
      insertId: string | null;
      warningStatus: number;
    };

export type DatabaseManagerScriptResponse = {
  kind: 'script';
  statements: number;
  affectedRows: number;
  results: Array<{ index: number; verb: string; affectedRows: number }>;
  truncatedResults: boolean;
};

export interface DatabaseHostSummary {
  id: string;
  nodeId: string;
  name: string;
  host: string;
  port: number;
  username: string;
  maxDatabases: number;
  databaseCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDatabaseHostInput {
  name: string;
  host: string;
  port?: number;
  username: string;
  password: string;
  maxDatabases?: number;
}

export interface UpdateDatabaseHostInput {
  name?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  maxDatabases?: number;
}

export interface AdminDatabaseSummary {
  id: string;
  name: string;
  database: string;
  username: string;
  remote: string;
  host: string;
  port: number;
  hostName: string;
  server: { id: string; name: string; uuid: string; owner: { username: string } };
  createdAt: string;
}

export interface ActivityLogEntry {
  id: string;
  event: string;
  description: string | null;
  ip: string | null;
  timestamp: string;
  actor: { username: string; email: string; role?: string } | null;
  server?: { id: string; name: string; uuid?: string } | null;
  properties?: Record<string, unknown> | null;
}

export interface ActivityPageResponse {
  items: ActivityLogEntry[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export type TicketStatus = 'open' | 'awaiting_reply' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface TicketUserSummary {
  id: string;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

export interface TicketSummary {
  id: string;
  number: number;
  subject: string;
  category: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  user: TicketUserSummary;
  server: { id: string; name: string } | null;
  assignee: TicketUserSummary | null;
  lastMessageAt: string | null;
  lastMessageStaff: boolean;
}

export interface TicketAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface TicketMessage {
  id: string;
  body: string;
  isStaff: boolean;
  createdAt: string;
  author: TicketUserSummary;
  attachments: TicketAttachment[];
}

export interface TicketDetail extends TicketSummary {
  messages: TicketMessage[];
}

export interface TicketMetaResponse {
  categories: Array<{ id: string; label: string }>;
  allowServerTickets: boolean;
  requireServer: boolean;
  maxOpenPerUser: number;
}

export interface CreateTicketInput {
  subject: string;
  category: string;
  serverId?: string | null;
  message: string;
  priority?: TicketPriority;
}

export interface UpdateTicketInput {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeId?: string | null;
}

export interface ServerDetail extends ServerSummary {
  memory: number;
  disk: number;
  cpu: number;
  startup: string;
  installStatus: string;
  backupLimit?: number;
  databaseLimit?: number;
  variables: Array<{
    id: string;
    variableValue: string;
    eggVariable: {
      name: string;
      envVariable: string;
      description: string;
      userViewable: boolean;
      userEditable: boolean;
      fieldType: string;
    };
  }>;
  access?: ServerAccessFlags;
  marketplaceEnabled?: boolean;
  minecraftPluginsEnabled?: boolean;
}

export interface ServerAccessFlags {
  isOwner: boolean;
  isAdminSupport?: boolean;
  permissions: string[];
  canConsole: boolean;
  canStart: boolean;
  canStop: boolean;
  canRestart: boolean;
  canReadFiles: boolean;
  canWriteFiles: boolean;
  canCreateFiles: boolean;
  canDeleteFiles: boolean;
  canReadStartup: boolean;
  canUpdateStartup: boolean;
  canReadDatabases: boolean;
  canCreateDatabases: boolean;
  canUpdateDatabases: boolean;
  canDeleteDatabases: boolean;
  canViewDatabasePassword: boolean;
  canManageSubusers: boolean;
  canUpdateSettings: boolean;
  canReinstall: boolean;
  canReadBackups: boolean;
  canCreateBackups: boolean;
  canDeleteBackups: boolean;
  canReadSchedules: boolean;
  canManageSchedules: boolean;
  canReadAllocations: boolean;
  canCreateAllocations: boolean;
  canUpdateAllocations: boolean;
  canDeleteAllocations: boolean;
  canInstallMarketplace: boolean;
}

export type MarketplaceCategory = 'library' | 'script' | 'map' | 'vehicle' | 'other';

export interface MarketplacePluginSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: MarketplaceCategory;
  tags: string[];
  githubOwner: string;
  githubRepo: string;
  githubRef: string;
  installPath: string;
  cfgResource: string;
  dependencies: string[];
  featured: boolean;
  enabled: boolean;
  sortOrder: number;
  iconUrl: string | null;
  githubUrl: string;
}

export interface MarketplaceCatalogEntry extends MarketplacePluginSummary {
  installed: boolean;
  installedRef: string | null;
}

export interface MarketplaceCatalogInstallEntry {
  id: string;
  source: 'catalog';
  pluginId: string;
  slug: string;
  name: string;
  category: MarketplaceCategory;
  installedRef: string;
  installPath: string;
  installedAt: string;
  plugin: MarketplacePluginSummary;
}

export interface MarketplaceGithubInstallEntry {
  id: string;
  source: 'github';
  githubOwner: string;
  githubRepo: string;
  githubRef: string;
  githubAsset: string | null;
  displayName: string;
  name: string;
  installPath: string;
  cfgResource: string;
  cfgAction: string;
  cfgFile: string;
  patchCfg: boolean;
  installedRef: string;
  cfgLine: string;
  installedAt: string;
  githubUrl: string;
}

export type MarketplaceInstallEntry = MarketplaceCatalogInstallEntry | MarketplaceGithubInstallEntry;

export interface FivemServerLayout {
  layout: 'txadmin' | 'flat' | 'unknown';
  /** Detected resources directory (parent folder for installs). */
  resourcesPath: string;
  resourcesBase: string;
  cfgFile: string;
  profileName: string | null;
  profilePath: string | null;
  confidence: 'high' | 'medium' | 'low';
}

export interface GithubRepoResolved {
  owner: string;
  repo: string;
  ownerAvatarUrl?: string | null;
  name: string;
  description: string;
  defaultBranch: string;
  stars: number;
  forks: number;
  openIssues?: number;
  watchers?: number;
  language: string | null;
  topics: string[];
  license?: string | null;
  homepage?: string | null;
  createdAt?: string;
  updatedAt: string;
  pushedAt: string | null;
  readme?: string | null;
  githubUrl: string;
  isPrivate: boolean;
  releases: Array<{ tag: string; name: string; prerelease: boolean }>;
  latestReleaseTag: string | null;
  featuredBlurb?: string | null;
  featuredCategory?: string | null;
  layout?: FivemServerLayout;
  existingInstall?: {
    id: string;
    installPath: string;
    installedRef: string;
    displayName: string;
  } | null;
  suggested: {
    installPath: string;
    cfgResource: string;
    cfgAction: 'ensure';
    cfgFile: string;
    githubRef: string;
    patchCfg: boolean;
  };
}

export interface GithubSearchPage {
  results: GithubSearchResult[];
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
  sort?: GithubSearchSortId;
}

export type GithubSearchSortId = 'best' | 'stars' | 'forks' | 'updated' | 'pushed';

export interface GithubSearchResult {
  owner: string;
  repo: string;
  ownerAvatarUrl?: string | null;
  name: string;
  description: string;
  stars: number;
  forks: number;
  language: string | null;
  updatedAt: string;
  pushedAt: string | null;
  topics: string[];
  githubUrl: string;
}

export type GithubSearchCategoryId =
  | 'all'
  | 'libraries'
  | 'frameworks'
  | 'inventory'
  | 'voice'
  | 'housing'
  | 'jobs'
  | 'ui';

export interface GithubFeaturedScript extends GithubSearchResult {
  category: string;
  blurb: string;
}

export interface MarketplacePageResponse {
  isFiveM: boolean;
  layout?: FivemServerLayout;
  stats?: {
    installedCount: number;
    catalogCount: number;
    catalogInstalledCount: number;
    githubInstalledCount: number;
  };
  features?: {
    catalog: boolean;
    github: boolean;
  };
  featuredCatalog?: MarketplaceCatalogPlugin[];
  allowGithubInstalls: boolean;
  allowCatalogInstalls?: boolean;
  catalog?: MarketplaceCatalogPlugin[];
  installed: MarketplaceInstallEntry[];
}

export interface MarketplaceCatalogPlugin {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  githubOwner: string;
  githubRepo: string;
  githubRef: string;
  installPath: string;
  cfgResource: string;
  cfgAction?: 'ensure' | 'start';
  cfgFile?: string;
  dependencies: string[];
  featured: boolean;
  enabled: boolean;
  sortOrder: number;
  iconUrl: string | null;
  githubUrl: string;
  installed?: boolean;
}

export interface MarketplaceCatalogDetailResponse {
  plugin: MarketplaceCatalogPlugin;
  github: GithubRepoResolved | null;
}

export interface FivemCatalogEntryInput {
  slug: string;
  name: string;
  description: string;
  category: 'library' | 'script' | 'map' | 'vehicle' | 'other';
  tags?: string[];
  githubOwner: string;
  githubRepo: string;
  githubRef?: string;
  githubAsset?: string | null;
  installPath: string;
  cfgResource: string;
  cfgAction?: 'ensure' | 'start';
  cfgFile?: string;
  dependencies?: string[];
  featured?: boolean;
  enabled?: boolean;
  sortOrder?: number;
  iconUrl?: string | null;
}

export interface AdminPanelPlugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string | null;
  builtIn: boolean;
  enabled: boolean;
  settings: Record<string, unknown>;
  manifest: {
    id: string;
    name: string;
    description: string;
    version: string;
    builtIn: boolean;
    adminPath?: string;
    serverNav?: {
      routeSegment: string;
      label: string;
      description?: string;
      icon: string;
    };
  };
  stats?: { catalogCount?: number };
}

export interface ClientPanelPlugin {
  id: string;
  name: string;
  description: string;
  version: string;
  serverNav: {
    routeSegment: string;
    label: string;
    description?: string;
    icon: string;
    accessKey: string;
    eggFeatures?: string[];
  } | null;
}

export interface MinecraftPluginInstallEntry {
  id: string;
  source: 'modrinth' | 'disk';
  projectId: string | null;
  projectSlug: string | null;
  versionId: string | null;
  versionNumber: string;
  displayName: string;
  name: string;
  filename: string;
  installPath: string;
  installDir: string;
  projectType: string;
  iconUrl: string | null;
  loaders: string[];
  installedAt: string | null;
  modrinthUrl: string | null;
  onDisk?: boolean;
  recognized?: boolean;
  updateAvailable?: { latestVersionId: string; latestVersionNumber: string } | null;
}

export interface MinecraftPluginsPageResponse {
  isMinecraft: boolean;
  allowModrinthInstalls: boolean;
  platformLabel: string;
  kind: string;
  loaders: string[];
  projectTypes: string[];
  gameVersion: string | null;
  diskFilenames?: string[];
  diskPaths?: string[];
  installedProjectIds?: string[];
  installed: MinecraftPluginInstallEntry[];
}

export interface MinecraftPluginSearchHit {
  projectId: string;
  slug: string;
  title: string;
  description: string;
  author: string;
  iconUrl: string | null;
  downloads: number;
  follows: number;
  categories: string[];
  displayCategories: string[];
  projectType: string;
  versions: string[];
  dateModified: string;
  clientSide: string;
  serverSide: string;
}

export interface MinecraftPluginsSearchResponse {
  hits: MinecraftPluginSearchHit[];
  offset: number;
  limit: number;
  totalHits: number;
  gameVersion: string | null;
  platformLabel: string;
  kind?: string;
  loaders: string[];
  category?: string | null;
}

export interface MinecraftPluginProjectResponse {
  project: {
    id: string;
    slug: string;
    title: string;
    description: string;
    body: string;
    iconUrl: string | null;
    downloads: number;
    followers: number;
    categories: string[];
    loaders: string[];
    gameVersions: string[];
    projectType: string;
    serverSide: string;
    clientSide: string;
    sourceUrl: string | null;
    issuesUrl: string | null;
    discordUrl: string | null;
    gallery?: Array<{ url: string; featured: boolean; title: string | null }>;
  };
  versions: Array<{
    id: string;
    name: string;
    versionNumber: string;
    versionType: string;
    loaders: string[];
    gameVersions: string[];
    datePublished: string;
    downloads: number;
    primaryFilename: string | null;
    onDisk?: boolean;
  }>;
  gameVersion: string | null;
  platformLabel: string;
  loaders: string[];
  diskFilenames?: string[];
  diskPaths?: string[];
  installed: MinecraftPluginInstallEntry | null;
}

export interface AdminMarketplacePlugin extends MarketplacePluginSummary {
  installCount: number;
  githubAsset: string | null;
  cfgAction: 'ensure' | 'start';
  cfgFile: string;
}

export interface MarketplacePluginInput {
  slug: string;
  name: string;
  description: string;
  category: MarketplaceCategory;
  tags: string[];
  githubOwner: string;
  githubRepo: string;
  githubRef: string;
  githubAsset?: string | null;
  installPath: string;
  cfgResource: string;
  cfgAction: 'ensure' | 'start';
  cfgFile: string;
  dependencies: string[];
  featured: boolean;
  enabled: boolean;
  sortOrder: number;
  iconUrl?: string | null;
}

export interface ServerBackupSummary {
  id: string;
  uuid: string;
  name: string;
  ignored?: string;
  checksum?: string | null;
  isSuccessful: boolean;
  isLocked: boolean;
  bytes: string | number;
  disk?: 'wings' | 'pbs';
  completedAt: string | null;
  createdAt: string;
}

export interface ServerScheduleSummary {
  id: string;
  name: string;
  cron: string;
  isActive: boolean;
  onlyWhenOnline: boolean;
  lastRunAt: string | null;
  createdAt: string;
  tasks: Array<{ id: string; action: string; payload: string; sequenceId: number }>;
}

export interface StatPoint {
  recordedAt: string;
  cpu: number;
  memoryBytes: number;
  diskBytes: number;
  networkRxBytes: number;
  networkTxBytes: number;
  state: string;
}

export interface ServerStatsResponse {
  limits: { memory: number; disk: number; cpu: number };
  range: string;
  live: StatPoint | null;
  series: StatPoint[];
  /** Completed backup archive bytes counted toward disk with file usage. */
  diskBackupBytes?: number;
}
