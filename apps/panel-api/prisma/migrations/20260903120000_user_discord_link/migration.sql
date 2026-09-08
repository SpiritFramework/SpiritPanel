ALTER TABLE `users` ADD COLUMN `discord_id` VARCHAR(191) NULL,
    ADD COLUMN `discord_username` VARCHAR(191) NULL,
    ADD COLUMN `discord_linked_at` DATETIME(3) NULL;

CREATE UNIQUE INDEX `users_discord_id_key` ON `users`(`discord_id`);
