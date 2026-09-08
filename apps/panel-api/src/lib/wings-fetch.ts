import http from 'node:http';
import https from 'node:https';
import { Readable } from 'node:stream';

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === '127.0.0.1' || host === 'localhost' || host === '::1';
}

function needsInsecureTls(url: string): boolean {
  if (process.env.WINGS_TLS_VERIFY === 'true') return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  if (isLoopbackHost(parsed.hostname)) return true;
  return process.env.WINGS_TLS_INSECURE === 'true';
}

function headersToRecord(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};
  const out: Record<string, string> = {};
  new Headers(headers).forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

async function bodyToBuffer(body: BodyInit | null | undefined): Promise<Buffer | undefined> {
  if (body == null) return undefined;
  if (typeof body === 'string') return Buffer.from(body);
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  if (ArrayBuffer.isView(body)) return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  if (typeof body === 'object' && 'arrayBuffer' in body && typeof body.arrayBuffer === 'function') {
    return Buffer.from(await body.arrayBuffer());
  }
  return undefined;
}

function abortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError');
}

function insecureFetch(url: string, init?: RequestInit): Promise<Response> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;

    void (async () => {
      const bodyBuf = await bodyToBuffer(init?.body ?? undefined);
      const headers = headersToRecord(init?.headers);
      if (bodyBuf && !headers['content-length'] && !headers['Content-Length']) {
        headers['Content-Length'] = String(bodyBuf.length);
      }

      const options: https.RequestOptions = {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: `${parsed.pathname}${parsed.search}`,
        method: init?.method ?? 'GET',
        headers,
        ...(isHttps ? { rejectUnauthorized: false } : {}),
      };

      const req = lib.request(options, (res) => {
        const responseHeaders = new Headers();
        for (const [key, value] of Object.entries(res.headers)) {
          if (value == null) continue;
          if (Array.isArray(value)) value.forEach((v) => responseHeaders.append(key, v));
          else responseHeaders.set(key, value);
        }

        resolve(
          new Response(Readable.toWeb(res) as ReadableStream<Uint8Array>, {
            status: res.statusCode ?? 500,
            statusText: res.statusMessage,
            headers: responseHeaders,
          }),
        );
      });

      req.on('error', (err) => {
        if (init?.signal?.aborted) {
          reject(abortError());
          return;
        }
        reject(err);
      });

      if (init?.signal) {
        if (init.signal.aborted) {
          req.destroy();
          reject(abortError());
          return;
        }
        const onAbort = () => {
          req.destroy();
          reject(abortError());
        };
        init.signal.addEventListener('abort', onAbort, { once: true });
        req.on('close', () => init.signal?.removeEventListener('abort', onAbort));
      }

      if (bodyBuf) req.write(bodyBuf);
      req.end();
    })().catch(reject);
  });
}

/** Fetch helper for panel-api → FeatherWings (handles self-signed HTTPS on localhost). */
export function wingsFetch(url: string, init?: RequestInit): Promise<Response> {
  if (!needsInsecureTls(url)) return fetch(url, init);
  return insecureFetch(url, init);
}
