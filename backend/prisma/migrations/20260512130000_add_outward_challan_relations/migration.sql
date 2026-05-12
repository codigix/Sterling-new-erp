-- AlterTable
ALTER TABLE `vendor_invoices` ADD COLUMN `outward_challan_id` INTEGER NULL AFTER `purchase_order_id`;

-- CreateIndex
CREATE INDEX `outward_challan_id` ON `vendor_invoices`(`outward_challan_id`);

-- AddForeignKey
ALTER TABLE `vendor_invoices` ADD CONSTRAINT `vendor_invoices_ibfk_4` FOREIGN KEY (`outward_challan_id`) REFERENCES `outward_challans`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AlterTable
ALTER TABLE `vendor_invoice_items` ADD COLUMN `challan_item_id` INTEGER NULL AFTER `po_item_id`;

-- CreateIndex
CREATE INDEX `fk_vendor_invoice_items_challan_item` ON `vendor_invoice_items`(`challan_item_id`);

-- AddForeignKey
ALTER TABLE `vendor_invoice_items` ADD CONSTRAINT `fk_vendor_invoice_items_challan_item` FOREIGN KEY (`challan_item_id`) REFERENCES `outward_challan_items`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
