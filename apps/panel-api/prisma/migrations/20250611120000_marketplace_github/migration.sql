-- CreateTable
CREATE TABLE `marketplace_github_installs` (
    `id` VARCHAR(191) NOT NULL,
    `server_id` VARCHAR(191) NOT NULL,
    `github_owner` VARCHAR(191) NOT NULL,
    `github_repo` VARCHAR(191) NOT NULL,
    `github_ref` VARCHAR(191) NOT NULL DEFAULT 'latest-release',
    `github_asset` VARCHAR(191) NULL,
    `display_name` VARCHAR(191) NOT NULL,
    `install_path` VARCHAR(191) NOT NULL,
    `cfg_resource` VARCHAR(191) NOT NULL,
    `cfg_action` VARCHAR(191) NOT NULL DEFAULT 'ensure',
    `cfg_file` VARCHAR(191) NOT NULL DEFAULT '/server.cfg',
    `patch_cfg` BOOLEAN NOT NULL DEFAULT true,
    `installed_ref` VARCHAR(191) NOT NULL,
    `cfg_line` VARCHAR(191) NOT NULL,
    `installed_by_id` VARCHAR(191) NOT NULL,
    `installed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `marketplace_github_installs_server_id_install_path_key`(`server_id`, `install_path`),
    INDEX `marketplace_github_installs_server_id_idx`(`server_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `marketplace_github_installs` ADD CONSTRAINT `marketplace_github_installs_server_id_fkey` FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `marketplace_github_installs` ADD CONSTRAINT `marketplace_github_installs_installed_by_id_fkey` FOREIGN KEY (`installed_by_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
