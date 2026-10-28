-- FeatherWings 1.4.3 panel-owned runtime options.
ALTER TABLE `nodes`
  ADD COLUMN IF NOT EXISTS `crash_detection_enabled` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS `check_install_exit_code` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS `cpu_shares` INT NOT NULL DEFAULT 1024;

ALTER TABLE `servers`
  ADD COLUMN IF NOT EXISTS `crash_detection_enabled` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS `auto_start_enabled` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS `auto_start_manually_stopped` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS `auto_start_delay` INT NOT NULL DEFAULT 0;
