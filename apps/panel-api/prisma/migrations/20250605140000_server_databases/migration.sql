-- CreateTable
CREATE TABLE `database_hosts` (
    `id` VARCHAR(191) NOT NULL,
    `node_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `host` VARCHAR(191) NOT NULL,
    `port` INTEGER NOT NULL DEFAULT 3306,
    `username` VARCHAR(191) NOT NULL,
    `password` TEXT NOT NULL,
    `max_databases` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `server_databases` (
    `id` VARCHAR(191) NOT NULL,
    `server_id` VARCHAR(191) NOT NULL,
    `database_host_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `database` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password` TEXT NOT NULL,
    `remote` VARCHAR(191) NOT NULL DEFAULT '%',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `server_databases_server_id_idx`(`server_id`),
    UNIQUE INDEX `server_databases_database_host_id_database_key`(`database_host_id`, `database`),
    UNIQUE INDEX `server_databases_database_host_id_username_key`(`database_host_id`, `username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `database_hosts` ADD CONSTRAINT `database_hosts_node_id_fkey` FOREIGN KEY (`node_id`) REFERENCES `nodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `server_databases` ADD CONSTRAINT `server_databases_server_id_fkey` FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `server_databases` ADD CONSTRAINT `server_databases_database_host_id_fkey` FOREIGN KEY (`database_host_id`) REFERENCES `database_hosts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
