-- AlterTable
ALTER TABLE `quotations` ADD COLUMN `public_id` VARCHAR(36) AFTER `id`;
ALTER TABLE `purchase_orders` ADD COLUMN `public_id` VARCHAR(36) AFTER `id`;
ALTER TABLE `material_requests` ADD COLUMN `public_id` VARCHAR(36) AFTER `id`;
ALTER TABLE `grns` ADD COLUMN `public_id` VARCHAR(36) AFTER `id`;
ALTER TABLE `vendor_invoices` ADD COLUMN `public_id` VARCHAR(36) AFTER `id`;
ALTER TABLE `customer_invoices` ADD COLUMN `public_id` VARCHAR(36) AFTER `id`;

-- PopulateData
UPDATE `quotations` SET `public_id` = UUID() WHERE `public_id` IS NULL;
UPDATE `purchase_orders` SET `public_id` = UUID() WHERE `public_id` IS NULL;
UPDATE `material_requests` SET `public_id` = UUID() WHERE `public_id` IS NULL;
UPDATE `grns` SET `public_id` = UUID() WHERE `public_id` IS NULL;
UPDATE `vendor_invoices` SET `public_id` = UUID() WHERE `public_id` IS NULL;
UPDATE `customer_invoices` SET `public_id` = UUID() WHERE `public_id` IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX `idx_quotation_public_id` ON `quotations`(`public_id`);
CREATE UNIQUE INDEX `idx_po_public_id` ON `purchase_orders`(`public_id`);
CREATE UNIQUE INDEX `idx_mr_public_id` ON `material_requests`(`public_id`);
CREATE UNIQUE INDEX `idx_grn_public_id` ON `grns`(`public_id`);
CREATE UNIQUE INDEX `idx_vi_public_id` ON `vendor_invoices`(`public_id`);
CREATE UNIQUE INDEX `idx_ci_public_id` ON `customer_invoices`(`public_id`);
