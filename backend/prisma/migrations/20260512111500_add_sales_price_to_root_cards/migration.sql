-- AlterTable
ALTER TABLE `root_cards` ADD COLUMN `sales_price` DECIMAL(15, 2) DEFAULT 0.00 AFTER `quantity`;
