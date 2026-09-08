export function LocationFlag({
  url,
  size = 'sm',
  className,
  alt = 'Location flag',
}: {
  url: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  alt?: string;
}) {
  const src = url?.trim();
  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      className={`ds-location-flag ds-location-flag--${size}${className ? ` ${className}` : ''}`}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
    />
  );
}

export function formatLocationLabel(location: { short: string; long: string }): string {
  return `${location.short} — ${location.long}`;
}
