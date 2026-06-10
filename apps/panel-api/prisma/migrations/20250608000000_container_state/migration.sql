-- Persist runtime container state pushed by FeatherWings (FeatherPanel-compatible)
ALTER TABLE `servers` ADD COLUMN `container_state` VARCHAR(32) NOT NULL DEFAULT 'offline';
