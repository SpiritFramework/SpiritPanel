-- CreateTable
CREATE TABLE `server_stat_snapshots` (
    `id` VARCHAR(191) NOT NULL,
    `server_id` VARCHAR(191) NOT NULL,
    `cpu` DOUBLE NOT NULL DEFAULT 0,
    `memory_bytes` BIGINT NOT NULL DEFAULT 0,
    `disk_bytes` BIGINT NOT NULL DEFAULT 0,
    `network_rx_bytes` BIGINT NOT NULL DEFAULT 0,
    `network_tx_bytes` BIGINT NOT NULL DEFAULT 0,
    `state` VARCHAR(191) NOT NULL DEFAULT 'offline',
    `recorded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `server_stat_snapshots_server_id_recorded_at_idx`(`server_id`, `recorded_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `server_stat_snapshots` ADD CONSTRAINT `server_stat_snapshots_server_id_fkey` FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
