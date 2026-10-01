-- Restore the node and server fields expected by the current Prisma schema.
ALTER TABLE `nodes`
  ADD COLUMN IF NOT EXISTS `public_ip` VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `domain_base` VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `cloudflare_zone_id` VARCHAR(255) NULL;

ALTER TABLE `servers`
  ADD COLUMN IF NOT EXISTS `prefer_subdomain` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS `subdomain_access` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS `fivem_marketplace_access` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS `minecraft_plugins_access` BOOLEAN NOT NULL DEFAULT true;
