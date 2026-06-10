-- AlterTable: 2FA fields on users
ALTER TABLE `users`
    ADD COLUMN `totp_enabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `totp_recovery_codes` TEXT NULL;

-- AlterTable: per-server backup limit
ALTER TABLE `servers`
    ADD COLUMN `backup_limit` INTEGER NOT NULL DEFAULT 0;

-- CreateTable: password reset tokens
CREATE TABLE `password_resets` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `password_resets_token_key`(`token`),
    INDEX `password_resets_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `password_resets` ADD CONSTRAINT `password_resets_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
