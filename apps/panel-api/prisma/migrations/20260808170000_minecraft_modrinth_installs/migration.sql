-- CreateTable
CREATE TABLE `minecraft_modrinth_installs` (
    `id` VARCHAR(191) NOT NULL,
    `server_id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `project_slug` VARCHAR(191) NOT NULL,
    `version_id` VARCHAR(191) NOT NULL,
    `version_number` VARCHAR(191) NOT NULL,
    `display_name` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `install_path` VARCHAR(191) NOT NULL,
    `install_dir` VARCHAR(191) NOT NULL,
    `project_type` VARCHAR(191) NOT NULL DEFAULT 'mod',
    `icon_url` VARCHAR(191) NULL,
    `loaders` JSON NOT NULL,
    `installed_by_id` VARCHAR(191) NOT NULL,
    `installed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `minecraft_modrinth_installs_server_id_idx`(`server_id`),
    UNIQUE INDEX `minecraft_modrinth_installs_server_id_project_id_key`(`server_id`, `project_id`),
    UNIQUE INDEX `minecraft_modrinth_installs_server_id_install_path_key`(`server_id`, `install_path`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `minecraft_modrinth_installs` ADD CONSTRAINT `minecraft_modrinth_installs_server_id_fkey` FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `minecraft_modrinth_installs` ADD CONSTRAINT `minecraft_modrinth_installs_installed_by_id_fkey` FOREIGN KEY (`installed_by_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
