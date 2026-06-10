-- Per-server MySQL database cap (0 = unlimited).
ALTER TABLE `servers` ADD COLUMN `database_limit` INTEGER NOT NULL DEFAULT 0;

-- Prevent duplicate schedule fires within the same poll window.
ALTER TABLE `schedules` ADD COLUMN `last_run_at` DATETIME(3) NULL;
