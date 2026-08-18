-- Keep install tracking when the installing user is deleted.
ALTER TABLE `minecraft_modrinth_installs` DROP FOREIGN KEY `minecraft_modrinth_installs_installed_by_id_fkey`;

ALTER TABLE `minecraft_modrinth_installs` MODIFY `installed_by_id` VARCHAR(191) NULL;

ALTER TABLE `minecraft_modrinth_installs` ADD CONSTRAINT `minecraft_modrinth_installs_installed_by_id_fkey` FOREIGN KEY (`installed_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
