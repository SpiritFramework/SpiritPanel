import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { getServerTheme } from '../lib/server-theme';
import { sanitizeImageSrc } from '../lib/safe-url';

interface ServerEggIconProps {
  eggName: string;
  logoUrl?: string | null;
  className?: string;
  iconClassName?: string;
}

export function ServerEggIcon({
  eggName,
  logoUrl,
  className = 'h-5 w-5',
  iconClassName,
}: ServerEggIconProps) {
  const theme = getServerTheme(eggName);
  const FallbackIcon: LucideIcon = theme.icon;
  const [failed, setFailed] = useState(false);

  const trimmed = sanitizeImageSrc(logoUrl);
  if (trimmed && !failed) {
    return (
      <img
        src={trimmed}
        alt=""
        className={`${className} object-contain`}
        onError={() => setFailed(true)}
      />
    );
  }

  return <FallbackIcon className={iconClassName ?? `${className} text-white/90`} />;
}
