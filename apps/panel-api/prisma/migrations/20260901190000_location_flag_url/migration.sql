ALTER TABLE `locations` ADD COLUMN `flag_url` VARCHAR(512) NULL;
ALTER TABLE `locations` DROP COLUMN `country_code`;
