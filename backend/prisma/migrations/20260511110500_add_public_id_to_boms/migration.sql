-- AlterTable
ALTER TABLE `boms` ADD COLUMN `public_id` VARCHAR(36) AFTER `id`;

-- PopulateData
UPDATE `boms` SET `public_id` = UUID() WHERE `public_id` IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX `idx_bom_public_id` ON `boms`(`public_id`);
