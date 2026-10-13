-- AlterTable root_cards: Add qap_status column and initialize existing statuses
ALTER TABLE `root_cards` ADD COLUMN `qap_status` VARCHAR(50) NULL DEFAULT 'NOT_STARTED';

-- Initialize existing records based on current status
UPDATE `root_cards` SET `qap_status` = 'QUALITY_QAP_PENDING' WHERE `status` = 'QUALITY_QAP_PENDING';
UPDATE `root_cards` SET `qap_status` = 'DESIGN_QAP_REVIEW' WHERE `status` = 'DESIGN_QAP_REVIEW';
UPDATE `root_cards` SET `qap_status` = 'APPROVED' WHERE `status` IN (
  'BOM_PREPARATION', 'MATERIAL_PLANNING', 'PURCHASE_ORDER_RELEASED', 
  'PARTIALLY_RELEASED', 'MATERIAL_RELEASED', 'PRODUCTION_IN_PROGRESS', 
  'DIMENSIONAL_QC_PENDING', 'DIMENSIONAL_QC_APPROVED', 'PHASE_2_QC_PENDING', 
  'PHASE_2_QC_APPROVED', 'QC_APPROVED', 'Redy for Dispatch'
);
