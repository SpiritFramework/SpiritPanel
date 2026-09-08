/** GitHub owner/org avatar — works without API metadata when owner name is known. */
export function githubOwnerAvatarUrl(owner: string, size = 80): string {
  const safe = encodeURIComponent(owner.trim());
  return `https://github.com/${safe}.png?size=${size}`;
}

export function resolveGithubAvatarUrl(owner: string, avatarUrl?: string | null, size = 80): string {
  const trimmed = avatarUrl?.trim();
  if (trimmed) {
    if (trimmed.includes('size=')) return trimmed;
    const join = trimmed.includes('?') ? '&' : '?';
    return `${trimmed}${join}size=${size}`;
  }
  return githubOwnerAvatarUrl(owner, size);
}
