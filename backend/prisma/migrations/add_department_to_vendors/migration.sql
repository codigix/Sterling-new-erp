-- AlterTable
ALTER TABLE `vendors` ADD COLUMN `department` VARCHAR(50) NULL DEFAULT 'procurement';

-- Set existing vendors to 'procurement'
UPDATE `vendors` SET `department` = 'procurement' WHERE `department` IS NULL OR `department` = '';
