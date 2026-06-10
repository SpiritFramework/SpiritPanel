-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `uuid` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) NULL,
    `last_name` VARCHAR(191) NULL,
    `role` ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    `root_admin` BOOLEAN NOT NULL DEFAULT false,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `totp_secret` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_uuid_key`(`uuid`),
    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_ssh_keys` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `public_key` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `locations` (
    `id` VARCHAR(191) NOT NULL,
    `uuid` VARCHAR(191) NOT NULL,
    `short` VARCHAR(191) NOT NULL,
    `long` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `locations_uuid_key`(`uuid`),
    UNIQUE INDEX `locations_short_key`(`short`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nodes` (
    `id` VARCHAR(191) NOT NULL,
    `uuid` VARCHAR(191) NOT NULL,
    `location_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL DEFAULT '',
    `fqdn` VARCHAR(191) NOT NULL,
    `scheme` VARCHAR(191) NOT NULL DEFAULT 'https',
    `behind_proxy` BOOLEAN NOT NULL DEFAULT false,
    `maintenance_mode` BOOLEAN NOT NULL DEFAULT false,
    `memory` INTEGER NOT NULL DEFAULT 0,
    `memory_overallocate` INTEGER NOT NULL DEFAULT 0,
    `disk` INTEGER NOT NULL DEFAULT 0,
    `disk_overallocate` INTEGER NOT NULL DEFAULT 0,
    `upload_size` INTEGER NOT NULL DEFAULT 100,
    `daemon_token_id` VARCHAR(191) NOT NULL,
    `daemon_token_secret` VARCHAR(191) NOT NULL,
    `daemon_listen` INTEGER NOT NULL DEFAULT 8080,
    `daemon_sftp` INTEGER NOT NULL DEFAULT 2022,
    `daemon_base` VARCHAR(191) NOT NULL DEFAULT '/var/lib/pterodactyl/volumes',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `nodes_uuid_key`(`uuid`),
    UNIQUE INDEX `nodes_daemon_token_id_key`(`daemon_token_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `allocations` (
    `id` VARCHAR(191) NOT NULL,
    `node_id` VARCHAR(191) NOT NULL,
    `ip` VARCHAR(191) NOT NULL,
    `port` INTEGER NOT NULL,
    `alias` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `assigned` BOOLEAN NOT NULL DEFAULT false,
    `server_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `allocations_server_id_key`(`server_id`),
    UNIQUE INDEX `allocations_node_id_ip_port_key`(`node_id`, `ip`, `port`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nests` (
    `id` VARCHAR(191) NOT NULL,
    `uuid` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL DEFAULT '',
    `author` VARCHAR(191) NOT NULL DEFAULT 'support@spirithost.co.uk',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `nests_uuid_key`(`uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `eggs` (
    `id` VARCHAR(191) NOT NULL,
    `uuid` VARCHAR(191) NOT NULL,
    `nest_id` VARCHAR(191) NOT NULL,
    `author` VARCHAR(191) NOT NULL DEFAULT 'support@spirithost.co.uk',
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL DEFAULT '',
    `features` JSON NOT NULL,
    `docker_images` JSON NOT NULL,
    `file_denylist` JSON NOT NULL,
    `config_files` JSON NULL,
    `config_startup` JSON NULL,
    `config_logs` JSON NULL,
    `config_stop` VARCHAR(191) NOT NULL DEFAULT 'stop',
    `startup` TEXT NOT NULL,
    `script_install` TEXT NOT NULL DEFAULT '',
    `script_entry` VARCHAR(191) NOT NULL DEFAULT 'bash',
    `script_container` VARCHAR(191) NOT NULL DEFAULT 'ghcr.io/pterodactyl/installers:debian',
    `script_privileged` BOOLEAN NOT NULL DEFAULT false,
    `force_outgoing_ip` BOOLEAN NOT NULL DEFAULT false,
    `update_url` VARCHAR(191) NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `eggs_uuid_key`(`uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `egg_variables` (
    `id` VARCHAR(191) NOT NULL,
    `egg_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL DEFAULT '',
    `env_variable` VARCHAR(191) NOT NULL,
    `default_value` VARCHAR(191) NOT NULL DEFAULT '',
    `user_viewable` BOOLEAN NOT NULL DEFAULT true,
    `user_editable` BOOLEAN NOT NULL DEFAULT true,
    `rules` VARCHAR(191) NOT NULL DEFAULT '',
    `field_type` VARCHAR(191) NOT NULL DEFAULT 'text',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `servers` (
    `id` VARCHAR(191) NOT NULL,
    `uuid` VARCHAR(191) NOT NULL,
    `uuid_short` VARCHAR(191) NOT NULL,
    `external_id` VARCHAR(191) NULL,
    `owner_id` VARCHAR(191) NOT NULL,
    `node_id` VARCHAR(191) NOT NULL,
    `egg_id` VARCHAR(191) NOT NULL,
    `allocation_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL DEFAULT '',
    `status` ENUM('installing', 'install_failed', 'suspended', 'restoring_backup', 'normal') NOT NULL DEFAULT 'normal',
    `suspended` BOOLEAN NOT NULL DEFAULT false,
    `oom_disabled` BOOLEAN NOT NULL DEFAULT true,
    `skip_scripts` BOOLEAN NOT NULL DEFAULT false,
    `install_status` ENUM('none', 'installing', 'installed', 'failed') NOT NULL DEFAULT 'none',
    `installed_at` DATETIME(3) NULL,
    `memory` INTEGER NOT NULL DEFAULT 1024,
    `swap` INTEGER NOT NULL DEFAULT 0,
    `disk` INTEGER NOT NULL DEFAULT 10240,
    `io` INTEGER NOT NULL DEFAULT 500,
    `cpu` INTEGER NOT NULL DEFAULT 100,
    `threads` VARCHAR(191) NULL,
    `startup` TEXT NOT NULL,
    `image` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `servers_uuid_key`(`uuid`),
    UNIQUE INDEX `servers_uuid_short_key`(`uuid_short`),
    UNIQUE INDEX `servers_external_id_key`(`external_id`),
    UNIQUE INDEX `servers_allocation_id_key`(`allocation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `server_variables` (
    `id` VARCHAR(191) NOT NULL,
    `server_id` VARCHAR(191) NOT NULL,
    `egg_variable_id` VARCHAR(191) NOT NULL,
    `variable_value` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `server_variables_server_id_egg_variable_id_key`(`server_id`, `egg_variable_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subusers` (
    `id` VARCHAR(191) NOT NULL,
    `server_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `permissions` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `subusers_server_id_user_id_key`(`server_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_keys` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `key_type` INTEGER NOT NULL DEFAULT 2,
    `identifier` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `memo` VARCHAR(191) NOT NULL DEFAULT '',
    `last_used_at` DATETIME(3) NULL,
    `expires_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `api_keys_identifier_key`(`identifier`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `schedules` (
    `id` VARCHAR(191) NOT NULL,
    `server_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `cron` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `only_when_online` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `schedule_tasks` (
    `id` VARCHAR(191) NOT NULL,
    `schedule_id` VARCHAR(191) NOT NULL,
    `sequence_id` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `payload` VARCHAR(191) NOT NULL DEFAULT '',
    `time_offset` INTEGER NOT NULL DEFAULT 0,
    `continue_on_failure` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `backups` (
    `id` VARCHAR(191) NOT NULL,
    `uuid` VARCHAR(191) NOT NULL,
    `server_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `ignored` VARCHAR(191) NOT NULL DEFAULT '[]',
    `is_successful` BOOLEAN NOT NULL DEFAULT false,
    `is_locked` BOOLEAN NOT NULL DEFAULT false,
    `bytes` BIGINT NOT NULL DEFAULT 0,
    `checksum` VARCHAR(191) NULL,
    `upload_id` VARCHAR(191) NULL,
    `disk` VARCHAR(191) NOT NULL DEFAULT 'local',
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `backups_uuid_key`(`uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activity_logs` (
    `id` VARCHAR(191) NOT NULL,
    `batch` VARCHAR(191) NULL,
    `event` VARCHAR(191) NOT NULL,
    `ip` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `properties` JSON NULL,
    `actor_id` VARCHAR(191) NULL,
    `server_id` VARCHAR(191) NULL,
    `node_id` VARCHAR(191) NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `activity_logs_event_idx`(`event`),
    INDEX `activity_logs_timestamp_idx`(`timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `panel_settings` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` JSON NOT NULL,

    UNIQUE INDEX `panel_settings_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_ssh_keys` ADD CONSTRAINT `user_ssh_keys_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nodes` ADD CONSTRAINT `nodes_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `allocations` ADD CONSTRAINT `allocations_node_id_fkey` FOREIGN KEY (`node_id`) REFERENCES `nodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `allocations` ADD CONSTRAINT `allocations_server_id_fkey` FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `eggs` ADD CONSTRAINT `eggs_nest_id_fkey` FOREIGN KEY (`nest_id`) REFERENCES `nests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `egg_variables` ADD CONSTRAINT `egg_variables_egg_id_fkey` FOREIGN KEY (`egg_id`) REFERENCES `eggs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `servers` ADD CONSTRAINT `servers_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `servers` ADD CONSTRAINT `servers_node_id_fkey` FOREIGN KEY (`node_id`) REFERENCES `nodes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `servers` ADD CONSTRAINT `servers_egg_id_fkey` FOREIGN KEY (`egg_id`) REFERENCES `eggs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `servers` ADD CONSTRAINT `servers_allocation_id_fkey` FOREIGN KEY (`allocation_id`) REFERENCES `allocations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `server_variables` ADD CONSTRAINT `server_variables_server_id_fkey` FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `server_variables` ADD CONSTRAINT `server_variables_egg_variable_id_fkey` FOREIGN KEY (`egg_variable_id`) REFERENCES `egg_variables`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subusers` ADD CONSTRAINT `subusers_server_id_fkey` FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subusers` ADD CONSTRAINT `subusers_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `api_keys` ADD CONSTRAINT `api_keys_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedules` ADD CONSTRAINT `schedules_server_id_fkey` FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedule_tasks` ADD CONSTRAINT `schedule_tasks_schedule_id_fkey` FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `backups` ADD CONSTRAINT `backups_server_id_fkey` FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_server_id_fkey` FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

