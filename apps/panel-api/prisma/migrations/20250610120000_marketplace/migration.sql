-- CreateTable
CREATE TABLE `marketplace_plugins` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `category` ENUM('library', 'script', 'map', 'vehicle', 'other') NOT NULL DEFAULT 'script',
    `tags` JSON NOT NULL,
    `github_owner` VARCHAR(191) NOT NULL,
    `github_repo` VARCHAR(191) NOT NULL,
    `github_ref` VARCHAR(191) NOT NULL DEFAULT 'latest-release',
    `github_asset` VARCHAR(191) NULL,
    `install_path` VARCHAR(191) NOT NULL,
    `cfg_resource` VARCHAR(191) NOT NULL,
    `cfg_action` VARCHAR(191) NOT NULL DEFAULT 'ensure',
    `cfg_file` VARCHAR(191) NOT NULL DEFAULT 'server.cfg',
    `dependencies` JSON NOT NULL,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `icon_url` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `marketplace_plugins_slug_key`(`slug`),
    INDEX `marketplace_plugins_enabled_sort_order_idx`(`enabled`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `marketplace_installs` (
    `id` VARCHAR(191) NOT NULL,
    `server_id` VARCHAR(191) NOT NULL,
    `plugin_id` VARCHAR(191) NOT NULL,
    `installed_ref` VARCHAR(191) NOT NULL,
    `install_path` VARCHAR(191) NOT NULL,
    `cfg_line` VARCHAR(191) NOT NULL,
    `cfg_file` VARCHAR(191) NOT NULL DEFAULT 'server.cfg',
    `installed_by_id` VARCHAR(191) NOT NULL,
    `installed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX `marketplace_installs_server_id_idx`(`server_id`),
    UNIQUE INDEX `marketplace_installs_server_id_plugin_id_key`(`server_id`, `plugin_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `marketplace_installs` ADD CONSTRAINT `marketplace_installs_server_id_fkey` FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `marketplace_installs` ADD CONSTRAINT `marketplace_installs_plugin_id_fkey` FOREIGN KEY (`plugin_id`) REFERENCES `marketplace_plugins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `marketplace_installs` ADD CONSTRAINT `marketplace_installs_installed_by_id_fkey` FOREIGN KEY (`installed_by_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
