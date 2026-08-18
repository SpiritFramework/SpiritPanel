import { Readable, Transform } from 'node:stream';
import { randomUUID } from 'node:crypto';
import type { Node } from '@prisma/client';

export interface FeatherWingsFileEntry {
  name: string;
  directory: boolean;
  file?: boolean;
}

/**
 * Error thrown by the Wings client. `status` is set for HTTP error responses;
 * when it is undefined the failure was a connection-level problem (timeout,
 * DNS, refused, reset) and is safe to retry for idempotent requests.
 */
export class WingsError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly timeout = false,
  ) {
    super(message);
    this.name = 'WingsError';
  }

  /** Connection-level failures with no HTTP response can be safely retried. */
  get isConnectionError(): boolean {
    return this.status === undefined;
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class WingsClient {
  constructor(private node: Node) {}

  private baseUrl(): string {
    const scheme = this.node.scheme || 'https';
    return `${scheme}://${this.node.fqdn}:${this.node.daemonListen}`;
  }

  /** FeatherWings compares the bearer value to `token` in config.yml (not token_id.token). */
  private authHeader(): string {
    return `Bearer ${this.node.daemonTokenSecret}`;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: this.authHeader(),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  async request<T>(method: string, path: string, body?: unknown, timeoutMs = 10_000): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl()}${path}`, {
        method,
        headers: this.headers(),
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new WingsError(
          `FeatherWings ${method} ${path} failed (${res.status}): ${text || res.statusText}`,
          res.status,
        );
      }
      if (res.status === 204 || res.status === 202) return {} as T;
      const text = await res.text();
      if (!text.trim()) return {} as T;
      return JSON.parse(text) as T;
    } catch (e) {
      throw this.toWingsError(e, method, path, timeoutMs);
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Retry idempotent (GET-style) requests when the node is briefly unreachable. */
  private async requestRetrying<T>(
    method: string,
    path: string,
    body?: unknown,
    timeoutMs = 10_000,
    attempts = 3,
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await this.request<T>(method, path, body, timeoutMs);
      } catch (e) {
        lastError = e;
        const retryable = e instanceof WingsError && e.isConnectionError;
        if (!retryable || attempt === attempts) throw e;
        await delay(250 * attempt);
      }
    }
    throw lastError;
  }

  private toWingsError(e: unknown, method: string, path: string, timeoutMs: number): WingsError {
    if (e instanceof WingsError) return e;
    if (e instanceof Error && e.name === 'AbortError') {
      return new WingsError(
        `FeatherWings ${method} ${path} timed out after ${Math.round(timeoutMs / 1000)}s`,
        undefined,
        true,
      );
    }
    const reason = e instanceof Error ? e.message : String(e);
    return new WingsError(`FeatherWings ${method} ${path} could not reach the node: ${reason}`);
  }

  /** FeatherWings file reads return raw text, not JSON. */
  private async requestText(path: string, timeoutMs = 30_000): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl()}${path}`, {
        method: 'GET',
        headers: {
          Authorization: this.authHeader(),
          Accept: 'text/plain, application/octet-stream, */*',
        },
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new WingsError(
          `FeatherWings GET ${path} failed (${res.status}): ${text || res.statusText}`,
          res.status,
        );
      }
      return res.text();
    } catch (e) {
      throw this.toWingsError(e, 'GET', path, timeoutMs);
    } finally {
      clearTimeout(timeout);
    }
  }

  getSystem() {
    return this.requestRetrying<{ architecture: string; version: string }>('GET', '/api/system');
  }

  listServers() {
    return this.requestRetrying<{ data: unknown[] }>('GET', '/api/servers');
  }

  createServer(uuid: string, startOnCompletion = false) {
    return this.request('POST', '/api/servers', { uuid, start_on_completion: startOnCompletion });
  }

  deleteServer(uuid: string) {
    return this.request('DELETE', `/api/servers/${uuid}`);
  }

  syncServer(uuid: string) {
    return this.request('POST', `/api/servers/${uuid}/sync`);
  }

  power(uuid: string, action: string, waitSeconds = 30) {
    return this.request('POST', `/api/servers/${uuid}/power`, { action, wait_seconds: waitSeconds });
  }

  sendCommand(uuid: string, command: string) {
    return this.request('POST', `/api/servers/${uuid}/commands`, { commands: [command] });
  }

  install(uuid: string) {
    return this.request('POST', `/api/servers/${uuid}/install`);
  }

  /** FeatherWings accepts no body — wipe files separately before calling this. */
  reinstall(uuid: string) {
    return this.request('POST', `/api/servers/${uuid}/reinstall`);
  }

  /** Delete every entry in the server root via list-directory + delete. */
  async wipeAllServerFiles(uuid: string): Promise<number> {
    const entries = await this.listDirectoryEntries(uuid, '/');
    if (entries.length === 0) return 0;
    const names = entries.map((entry) => entry.name);
    await this.deleteFiles(uuid, '/', names, 120_000);
    return names.length;
  }

  listFiles(uuid: string, directory = '/') {
    return this.listDirectoryEntries(uuid, directory);
  }

  private async listDirectoryEntries(uuid: string, directory: string): Promise<FeatherWingsFileEntry[]> {
    try {
      const raw = await this.requestRetrying<FeatherWingsFileEntry[] | { data?: FeatherWingsFileEntry[] }>(
        'GET',
        `/api/servers/${uuid}/files/list-directory?directory=${encodeURIComponent(directory)}`,
      );
      return Array.isArray(raw) ? raw : (raw.data ?? []);
    } catch (e) {
      if (e instanceof Error && e.message.includes('(404)')) return [];
      throw e;
    }
  }

  /** Poll FeatherWings until the server reports offline/stopped, or the deadline passes. */
  async waitForOffline(uuid: string, deadlineMs = 90_000): Promise<boolean> {
    const deadline = Date.now() + deadlineMs;
    let lastError: unknown;
    while (Date.now() < deadline) {
      try {
        const resources = await this.getResources(uuid);
        const state = (resources.state ?? '').toLowerCase();
        if (!state || state === 'offline' || state === 'stopped') return true;
        lastError = undefined;
      } catch (err) {
        lastError = err;
        // 404 = server unknown to Wings → treat as offline. Connection/5xx ≠ offline.
        if (err instanceof WingsError && err.status === 404) return true;
        if (err instanceof Error && /\(404\)/.test(err.message)) return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    if (lastError) {
      throw lastError instanceof Error
        ? lastError
        : new WingsError('Timed out waiting for FeatherWings to report offline');
    }
    return false;
  }

  getFileContents(uuid: string, file: string): Promise<string> {
    return this.requestText(
      `/api/servers/${uuid}/files/contents?file=${encodeURIComponent(file)}`,
    );
  }

  async writeFile(uuid: string, file: string, content: string): Promise<void> {
    const path = `/api/servers/${uuid}/files/write?file=${encodeURIComponent(file)}`;
    const body = new TextEncoder().encode(content);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    try {
      const res = await fetch(`${this.baseUrl()}${path}`, {
        method: 'POST',
        headers: {
          Authorization: this.authHeader(),
          'Content-Length': String(body.byteLength),
        },
        body,
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`FeatherWings POST ${path} failed (${res.status}): ${text || res.statusText}`);
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        throw new Error(`FeatherWings POST ${path} timed out after 60s`);
      }
      throw e;
    } finally {
      clearTimeout(timeout);
    }
  }

  deleteFiles(uuid: string, root: string, files: string[], timeoutMs = 60_000) {
    return this.request('POST', `/api/servers/${uuid}/files/delete`, { root, files }, timeoutMs);
  }

  createDirectory(uuid: string, root: string, name: string) {
    return this.request('POST', `/api/servers/${uuid}/files/create-directory`, { root, name });
  }

  renameFiles(uuid: string, root: string, files: Array<{ from: string; to: string }>) {
    return this.request('PUT', `/api/servers/${uuid}/files/rename`, { root, files });
  }

  /** Duplicate a single file/directory in place (Wings appends " copy"). */
  copyFile(uuid: string, location: string) {
    return this.request('POST', `/api/servers/${uuid}/files/copy`, { location });
  }

  /** Compress files within `root` into a new archive; returns the created entry. */
  compressFiles(uuid: string, root: string, files: string[]) {
    return this.request<FeatherWingsFileEntry & { name: string }>(
      'POST',
      `/api/servers/${uuid}/files/compress`,
      { root, files },
      120_000,
    );
  }

  /** Extract an archive located at `root`/`file`. */
  decompressFile(uuid: string, root: string, file: string) {
    return this.request('POST', `/api/servers/${uuid}/files/decompress`, { root, file }, 300_000);
  }

  chmodFiles(uuid: string, root: string, files: Array<{ file: string; mode: string }>) {
    return this.request('POST', `/api/servers/${uuid}/files/chmod`, { root, files });
  }

  /** Stream a file's raw bytes for download (avoids text decoding of binaries). */
  async downloadFile(uuid: string, file: string, timeoutMs = 120_000): Promise<Response> {
    const path = `/api/servers/${uuid}/files/contents?file=${encodeURIComponent(file)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl()}${path}`, {
        method: 'GET',
        headers: {
          Authorization: this.authHeader(),
          Accept: 'application/octet-stream, */*',
        },
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`FeatherWings GET ${path} failed (${res.status}): ${text || res.statusText}`);
      }
      return res;
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Write arbitrary bytes (used for uploads). */
  async uploadFile(uuid: string, file: string, data: Buffer, timeoutMs = 120_000): Promise<void> {
    const path = `/api/servers/${uuid}/files/write?file=${encodeURIComponent(file)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const view = new Uint8Array(data);
    try {
      const res = await fetch(`${this.baseUrl()}${path}`, {
        method: 'POST',
        headers: {
          Authorization: this.authHeader(),
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(data.byteLength),
        },
        body: view,
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new WingsError(
          `FeatherWings POST ${path} failed (${res.status}): ${text || res.statusText}`,
          res.status,
        );
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        throw new WingsError(`FeatherWings upload to ${path} timed out`, undefined, true);
      }
      throw e instanceof WingsError ? e : this.toWingsError(e, 'POST', path, timeoutMs);
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Stream upload when byte length is known (FeatherWings requires Content-Length). */
  async uploadFileStream(
    uuid: string,
    file: string,
    source: Readable,
    maxBytes: number,
    byteLength?: number,
    timeoutMs = 120_000,
  ): Promise<void> {
    if (byteLength === undefined) {
      const chunks: Buffer[] = [];
      let bytes = 0;
      for await (const chunk of source) {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytes += buf.length;
        if (bytes > maxBytes) {
          throw Object.assign(new Error('File too large'), { statusCode: 413 });
        }
        chunks.push(buf);
      }
      await this.uploadFile(uuid, file, Buffer.concat(chunks), timeoutMs);
      return;
    }

    if (byteLength > maxBytes) {
      throw Object.assign(new Error('File too large'), { statusCode: 413 });
    }

    const path = `/api/servers/${uuid}/files/write?file=${encodeURIComponent(file)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let bytes = 0;

    const limited = new Transform({
      transform(chunk: Buffer, _enc, cb) {
        bytes += chunk.length;
        if (bytes > maxBytes) {
          cb(Object.assign(new Error('File too large'), { statusCode: 413 }));
          return;
        }
        cb(null, chunk);
      },
    });

    const body = source.pipe(limited);

    try {
      const res = await fetch(`${this.baseUrl()}${path}`, {
        method: 'POST',
        headers: {
          Authorization: this.authHeader(),
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(byteLength),
        },
        body: Readable.toWeb(body) as ReadableStream,
        signal: controller.signal,
        duplex: 'half',
      } as RequestInit);
      if (!res.ok) {
        const text = await res.text();
        throw new WingsError(
          `FeatherWings POST ${path} failed (${res.status}): ${text || res.statusText}`,
          res.status,
        );
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        throw new WingsError(`FeatherWings upload to ${path} timed out`, undefined, true);
      }
      throw e instanceof WingsError ? e : this.toWingsError(e, 'POST', path, timeoutMs);
    } finally {
      clearTimeout(timeout);
      source.destroy();
      limited.destroy();
    }
  }

  getLogs(uuid: string, size = 100) {
    return this.requestRetrying<{ data?: string[] }>('GET', `/api/servers/${uuid}/logs?size=${size}`);
  }

  getInstallLogs(uuid: string) {
    return this.requestRetrying<{ data?: string }>('GET', `/api/servers/${uuid}/install-logs`);
  }

  /** Start a backup on the daemon. `backupUuid` is the panel-generated Backup.uuid. */
  createBackup(uuid: string, backupUuid: string, ignore = '', adapter = 'wings') {
    return this.request('POST', `/api/servers/${uuid}/backup`, {
      adapter,
      uuid: backupUuid,
      ignore,
    });
  }

  deleteBackup(uuid: string, backupUuid: string) {
    return this.request('DELETE', `/api/servers/${uuid}/backup/${backupUuid}`);
  }

  restoreBackup(uuid: string, backupUuid: string, options: { adapter?: string; truncate?: boolean; downloadUrl?: string } = {}) {
    return this.request(
      'POST',
      `/api/servers/${uuid}/backup/${backupUuid}/restore`,
      {
        adapter: options.adapter ?? 'wings',
        truncate_directory: options.truncate ?? true,
        download_url: options.downloadUrl,
      },
      120_000,
    );
  }

  /** Build a signed, browser-usable URL to download a backup straight from the daemon. */
  backupDownloadUrl(uuid: string, backupUuid: string, signToken: (claims: Record<string, unknown>, expiresIn: string, secret: string) => string): string {
    const token = signToken(
      {
        server_uuid: uuid,
        backup_uuid: backupUuid,
        // One-time key — must be unique per download or Wings rejects repeats for ~60m.
        unique_id: randomUUID(),
        scope: 'backup-download',
      },
      '5m',
      this.node.daemonTokenSecret,
    );
    return `${this.baseUrl()}/download/backup?token=${encodeURIComponent(token)}`;
  }

  /** FeatherWings exposes live state on GET /api/servers/{uuid} (not /resources). */
  getResources(uuid: string) {
    return this.requestRetrying<{
      state?: string;
      is_suspended?: boolean;
      utilization?: {
        state?: string;
        memory_bytes?: number;
        memory_limit_bytes?: number;
        cpu_absolute?: number;
        disk_bytes?: number;
        network?: { rx_bytes?: number; tx_bytes?: number };
        uptime?: number;
      };
      // Legacy flat Pterodactyl-style payloads (fallback path).
      memory_bytes?: number;
      memory_limit_bytes?: number;
      cpu_absolute?: number;
      disk_bytes?: number;
      network?: { rx_bytes?: number; tx_bytes?: number };
      uptime?: number;
    }>('GET', `/api/servers/${uuid}`);
  }

  /** @deprecated FeatherWings has no /resources route; kept for older daemons. */
  getResourcesLegacy(uuid: string) {
    return this.requestRetrying<{
      state?: string;
      memory_bytes?: number;
      memory_limit_bytes?: number;
      cpu_absolute?: number;
      disk_bytes?: number;
      network?: { rx_bytes?: number; tx_bytes?: number };
      uptime?: number;
    }>('GET', `/api/servers/${uuid}/resources`);
  }
}

export function wingsForNode(node: Node): WingsClient {
  return new WingsClient(node);
}
