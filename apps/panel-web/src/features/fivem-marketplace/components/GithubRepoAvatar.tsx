import { useState } from 'react';
import { Github } from 'lucide-react';
import { sanitizeImageSrc } from '../../../lib/safe-url';
import { resolveGithubAvatarUrl } from '../lib/github-avatar';

const SIZE = {
  sm: { box: 'h-8 w-8', icon: 'h-4 w-4', px: 64 },
  md: { box: 'h-10 w-10', icon: 'h-5 w-5', px: 80 },
  lg: { box: 'h-14 w-14', icon: 'h-7 w-7', px: 112 },
} as const;

export function GithubRepoAvatar({
  owner,
  avatarUrl,
  size = 'md',
  className = '',
}: {
  owner: string;
  avatarUrl?: string | null;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const spec = SIZE[size];
  const src = sanitizeImageSrc(resolveGithubAvatarUrl(owner, avatarUrl, spec.px));

  return (
    <div
      className={`ds-github-repo-avatar ${spec.box} ${className}`.trim()}
      aria-hidden={!failed && src ? undefined : true}
    >
      {!failed && src ? (
        <img
          src={src}
          alt=""
          className="ds-github-repo-avatar__img"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <Github className={`${spec.icon} text-[var(--muted)]`} aria-hidden />
      )}
    </div>
  );
}
