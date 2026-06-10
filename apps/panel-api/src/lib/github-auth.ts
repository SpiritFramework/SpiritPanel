import { prisma } from './prisma.js';
import { decryptSecret } from './secret-crypto.js';

export type GithubAuthContext = { userId?: string | null };

/** User PAT (if set) takes priority over panel GITHUB_TOKEN env. */
export async function resolveGithubToken(ctx?: GithubAuthContext): Promise<string | null> {
  if (ctx?.userId) {
    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { githubPatEnc: true },
    });
    if (user?.githubPatEnc) {
      try {
        const token = decryptSecret(user.githubPatEnc).trim();
        if (token) return token;
      } catch {
        // corrupted secret — fall through to panel token
      }
    }
  }
  const env = process.env.GITHUB_TOKEN?.trim();
  return env || null;
}

export function buildGithubHeaders(token: string | null): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Spirit-Panel-Marketplace',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function validateGithubPat(token: string): Promise<{ login: string }> {
  const res = await fetch('https://api.github.com/user', {
    headers: buildGithubHeaders(token.trim()),
  });
  if (res.status === 401) {
    throw new Error('Invalid GitHub token — check the PAT is correct and not expired');
  }
  if (res.status === 403) {
    throw new Error('GitHub rejected this token — it may lack required scopes or be rate limited');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub validation failed (${res.status}): ${text || res.statusText}`);
  }
  const data = (await res.json()) as { login?: string };
  if (!data.login) throw new Error('Unexpected response from GitHub');
  return { login: data.login };
}
