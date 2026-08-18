/**
 * Minecraft Java clients look up `_minecraft._tcp.<hostname>` SRV records
 * so players can connect with just the hostname on non-default ports.
 * Bedrock Edition clients do not use that Java SRV flow.
 */
export function resolveMinecraftJavaSrv(
  egg: { name?: string | null; nest?: { name?: string | null } | null } | null | undefined,
): { service: '_minecraft'; proto: '_tcp' } | null {
  if (!egg) return null;
  const blob = `${egg.nest?.name ?? ''} ${egg.name ?? ''}`.toLowerCase();
  if (!blob.includes('minecraft')) return null;

  const looksBedrock =
    /\b(bedrock|pocket|mcpe|pe edition|geyser only)\b/.test(blob) &&
    !/\b(java|paper|spigot|purpur|fabric|forge|quilt|velocity|bungee|waterfall|folia|sponge)\b/.test(
      blob,
    );
  if (looksBedrock) return null;

  return { service: '_minecraft', proto: '_tcp' };
}
