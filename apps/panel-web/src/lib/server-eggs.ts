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

/** True for Java Minecraft eggs (Paper/Fabric/etc). Excludes pure Bedrock. */
export function isMinecraftServer(server: Pick<ServerDetail | ServerSummary, 'egg'>): boolean {
  const egg = server.egg as EggLike & { nest?: { name?: string } };
  if (isBedrockOnlyServer(server)) return false;
  if (Array.isArray(egg.features)) {
    const features = egg.features.map((f) => String(f).toLowerCase());
    if (features.includes('eula') && !features.includes('steam') && !features.includes('fivem')) {
      return true;
    }
  }
  const nest = egg.nest?.name ?? '';
  const images =
    egg.dockerImages && typeof egg.dockerImages === 'object'
      ? Object.values(egg.dockerImages).join(' ')
      : '';
  const blob = `${nest} ${egg.name} ${images}`;
  return /\b(minecraft|paper|spigot|purpur|folia|fabric|forge|neoforge|quilt|sponge|bungee|waterfall|velocity|bukkit)\b/i.test(
    blob,
  );
}

export function isBedrockOnlyServer(server: Pick<ServerDetail | ServerSummary, 'egg'>): boolean {
  const egg = server.egg as EggLike & { nest?: { name?: string } };
  const nest = egg.nest?.name ?? '';
  const images =
    egg.dockerImages && typeof egg.dockerImages === 'object'
      ? Object.values(egg.dockerImages).join(' ')
      : '';
  const blob = `${nest} ${egg.name} ${images}`.toLowerCase();
  const hasBedrock = /\b(bedrock|pocketmine|nukkit|minecraftpe|mcpe)\b/.test(blob);
  const hasJava =
    /\b(java|paper|spigot|purpur|folia|fabric|forge|neoforge|quilt|sponge|bungee|waterfall|velocity|bukkit)\b/.test(
      blob,
    );
  return hasBedrock && !hasJava;
}
