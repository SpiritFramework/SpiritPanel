-- Server subdomain / Cloudflare DNS records (was in schema but never migrated).
CREATE TABLE IF NOT EXISTS `server_domains` (
    `id` VARCHAR(191) NOT NULL,
    `server_id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `fqdn` VARCHAR(191) NOT NULL,
    `zone_id` VARCHAR(191) NOT NULL,
    `cf_record_id` VARCHAR(191) NULL,
    `cf_srv_record_id` VARCHAR(191) NULL,
    `target_ip` VARCHAR(191) NOT NULL,
    `srv_port` INT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `server_domains_server_id_key`(`server_id`),
    UNIQUE INDEX `server_domains_fqdn_key`(`fqdn`),
    INDEX `server_domains_fqdn_idx`(`fqdn`),
    PRIMARY KEY (`id`),
    CONSTRAINT `server_domains_server_id_fkey` FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
