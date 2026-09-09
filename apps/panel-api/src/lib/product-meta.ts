import { createRequire } from 'node:module';

/** Product name — the panel software. */
export const PANEL_PRODUCT = 'Spirit-Panel';

/** Author / framework. */
export const PANEL_AUTHOR = 'SpiritFramework';

/** Author community link (Discord invite). */
export const PANEL_AUTHOR_DISCORD = 'https://discord.gg/tyR6FF8u2a';

/** Public GitHub repository. */
export const PANEL_GITHUB = 'https://github.com/SpiritFramework/SpiritPanel';

/** Production docs on GitHub. */
export const PANEL_DOCS = 'https://github.com/SpiritFramework/SpiritPanel/tree/main/docs';

/** Default host-facing sidebar tagline (editable in Admin → Settings). */
export const PANEL_TAGLINE = 'Game server panel';

/** Software attribution copy — not the host company name. */
export const AUTHOR_CREDIT = `Built by ${PANEL_AUTHOR}`;

const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as { version?: string };

/** Panel release version (`MAJOR.MINOR.FEATURE.PATCH`). */
export const PANEL_VERSION = pkg.version ?? '1.3.2.3';
