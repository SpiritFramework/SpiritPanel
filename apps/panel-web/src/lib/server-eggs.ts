import type { ServerDetail, ServerSummary } from './api';

type EggLike = ServerSummary['egg'] & { features?: unknown };

export function isFiveMServer(server: Pick<ServerDetail | ServerSummary, 'egg'>): boolean {
  const egg = server.egg as EggLike;
  if (Array.isArray(egg.features) && egg.features.some((f) => String(f).toLowerCase() === 'fivem')) {
    return true;
  }
  if (/fivem|citizenfx|cfx/i.test(egg.name)) return true;
  const images = egg.dockerImages;
  if (images && typeof images === 'object') {
    if (Object.values(images).some((img) => /fivem|citizenfx|cfx/i.test(img))) return true;
  }
  return false;
}
