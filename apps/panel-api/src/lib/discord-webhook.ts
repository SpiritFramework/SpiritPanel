import { isSafeHttpUrl } from './safe-url.js';

/** Discord incoming webhook URL (discord.com or legacy discordapp.com). */
export function isDiscordWebhookUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (!isSafeHttpUrl(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.hostname !== 'discord.com' && parsed.hostname !== 'discordapp.com') return false;
    return /^\/api\/webhooks\/\d+\/[^/]+/.test(parsed.pathname);
  } catch {
    return false;
  }
}
