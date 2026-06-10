-- Session invalidation: bump token_version on password change to revoke JWTs.
ALTER TABLE `users` ADD COLUMN `token_version` INTEGER NOT NULL DEFAULT 0;
