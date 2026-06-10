-- Parkervcp / PTDL egg exports often have descriptions longer than VARCHAR(191).
ALTER TABLE `nests` MODIFY `description` TEXT NOT NULL;
ALTER TABLE `eggs` MODIFY `description` TEXT NOT NULL;
ALTER TABLE `egg_variables` MODIFY `description` TEXT NOT NULL;
