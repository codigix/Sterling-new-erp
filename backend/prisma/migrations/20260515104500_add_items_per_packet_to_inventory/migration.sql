-- AlterTable
ALTER TABLE `inventory_serials` ADD COLUMN `items_per_packet` DECIMAL(10, 4) NULL DEFAULT 1.0000,
    ADD COLUMN `vendor_items_per_packet` DECIMAL(10, 4) NULL DEFAULT 1.0000;

-- AlterTable
ALTER TABLE `stock_entry_items` ADD COLUMN `items_per_packet` DECIMAL(10, 4) NULL DEFAULT 1.0000,
    ADD COLUMN `vendor_items_per_packet` DECIMAL(10, 4) NULL DEFAULT 1.0000;

-- AlterTable
ALTER TABLE `stock_ledger` ADD COLUMN `items_per_packet` DECIMAL(10, 4) NULL DEFAULT 1.0000,
    ADD COLUMN `vendor_items_per_packet` DECIMAL(10, 4) NULL DEFAULT 1.0000;
