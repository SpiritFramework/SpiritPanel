export interface FiveMEggLike {
  name: string;
  features?: unknown;
  dockerImages?: unknown;
}

/** True when the egg is a FiveM / Cfx.re server (marketplace-enabled). */
export function isFiveMEgg(egg: FiveMEggLike): boolean {
  if (Array.isArray(egg.features) && egg.features.some((f) => String(f).toLowerCase() === 'fivem')) {
    return true;
  }
  if (/fivem|citizenfx|cfx/i.test(egg.name)) return true;
  const images = egg.dockerImages ?? (egg as { dockerImage?: unknown }).dockerImage;
  if (images && typeof images === 'object') {
    const values = Object.values(images as Record<string, string>);
    if (values.some((img) => /fivem|citizenfx|cfx/i.test(img))) return true;
  }
  return false;
}
