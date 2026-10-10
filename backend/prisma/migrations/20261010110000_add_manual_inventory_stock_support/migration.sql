-- AlterTable inventory_serials: Allow NULL for PO/GRN references & add manual stock support
ALTER TABLE `inventory_serials`
    MODIFY COLUMN `purchase_order_id` INT NULL DEFAULT NULL,
    MODIFY COLUMN `item_id` INT NULL DEFAULT NULL,
    MODIFY COLUMN `grn_id` INT NULL DEFAULT NULL;

-- AlterTable stock_entries: Allow NULL for grn_id in direct/manual stock entries
ALTER TABLE `stock_entries`
    MODIFY COLUMN `grn_id` INT NULL DEFAULT NULL;

-- AlterTable stock_entry_items: Allow NULL for material_id
ALTER TABLE `stock_entry_items`
    MODIFY COLUMN `material_id` INT NULL DEFAULT NULL;
