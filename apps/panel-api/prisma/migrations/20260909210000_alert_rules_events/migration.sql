-- Alert rules + in-app events (Discord delivery later)

CREATE TABLE `alert_rules` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `server_id` VARCHAR(191) NULL,
    `node_id` VARCHAR(191) NULL,
    `metric` ENUM('cpu', 'memory', 'disk', 'node_offline') NOT NULL,
    `threshold_pct` INTEGER NOT NULL DEFAULT 90,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `cooldown_sec` INTEGER NOT NULL DEFAULT 900,
    `last_fired_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `alert_rules_user_id_enabled_idx`(`user_id`, `enabled`),
    INDEX `alert_rules_server_id_enabled_idx`(`server_id`, `enabled`),
    INDEX `alert_rules_metric_enabled_idx`(`metric`, `enabled`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `alert_events` (
    `id` VARCHAR(191) NOT NULL,
    `rule_id` VARCHAR(191) NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `server_id` VARCHAR(191) NULL,
    `node_id` VARCHAR(191) NULL,
    `metric` ENUM('cpu', 'memory', 'disk', 'node_offline') NOT NULL,
    `severity` VARCHAR(191) NOT NULL DEFAULT 'warning',
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `value_pct` DOUBLE NULL,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `alert_events_user_id_read_at_created_at_idx`(`user_id`, `read_at`, `created_at`),
    INDEX `alert_events_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `alert_rules` ADD CONSTRAINT `alert_rules_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `alert_rules` ADD CONSTRAINT `alert_rules_server_id_fkey` FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `alert_events` ADD CONSTRAINT `alert_events_rule_id_fkey` FOREIGN KEY (`rule_id`) REFERENCES `alert_rules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `alert_events` ADD CONSTRAINT `alert_events_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `alert_events` ADD CONSTRAINT `alert_events_server_id_fkey` FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
