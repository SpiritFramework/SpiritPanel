-- Allow multiple allocations per server (secondary ports).
-- MySQL requires dropping the FK before the unique index on server_id.
ALTER TABLE `allocations` DROP FOREIGN KEY `allocations_server_id_fkey`;
DROP INDEX `allocations_server_id_key` ON `allocations`;
ALTER TABLE `allocations` ADD CONSTRAINT `allocations_server_id_fkey` FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Max allocations per server (0 = unlimited extras beyond primary)
ALTER TABLE `servers` ADD COLUMN `allocation_limit` INTEGER NOT NULL DEFAULT 1;
