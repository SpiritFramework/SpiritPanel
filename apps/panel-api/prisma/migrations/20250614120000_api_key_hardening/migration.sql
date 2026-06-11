-- Application API key scoping and IP allowlists
ALTER TABLE `api_keys` ADD COLUMN `permissions` JSON NULL;
ALTER TABLE `api_keys` ADD COLUMN `allowed_ips` JSON NULL;
