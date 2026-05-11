-- AlterTable
ALTER TABLE `root_cards` ADD COLUMN `public_id` VARCHAR(36) AFTER `id`;

-- PopulateData
UPDATE `root_cards` SET `public_id` = UUID() WHERE `public_id` IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX `idx_public_id` ON `root_cards`(`public_id`);
