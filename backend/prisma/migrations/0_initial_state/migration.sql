-- CreateTable
CREATE TABLE `_migrations_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `filename` VARCHAR(255) NOT NULL,
    `executed_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `filename`(`filename`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bom_materials` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bom_id` INTEGER NOT NULL,
    `item_name` VARCHAR(255) NOT NULL,
    `vendor_item_name` TEXT NULL,
    `item_group` VARCHAR(100) NULL,
    `material_grade` VARCHAR(100) NULL,
    `part_detail` VARCHAR(255) NULL,
    `remark` TEXT NULL,
    `make` VARCHAR(100) NULL,
    `quantity` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `uom` VARCHAR(20) NULL,
    `rate` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `total_amount` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `warehouse` VARCHAR(255) NULL,
    `operation` VARCHAR(255) NULL,
    `rate_per_kg` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `total_weight` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `length` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `width` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `thickness` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `diameter` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `outer_diameter` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `height` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `material_type` VARCHAR(100) NULL,
    `density` DECIMAL(10, 4) NULL DEFAULT 0.0000,
    `unit_weight` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `side1` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `side2` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `web_thickness` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `flange_thickness` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `side_s` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `side_s1` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `side_s2` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `items_per_packet` DECIMAL(15, 4) NULL DEFAULT 1.0000,

    INDEX `bom_id`(`bom_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bom_operations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bom_id` INTEGER NOT NULL,
    `operation_name` VARCHAR(255) NOT NULL,
    `type` VARCHAR(50) NULL DEFAULT 'in-house',
    `workstation` VARCHAR(255) NULL,
    `target_warehouse` VARCHAR(255) NULL,
    `vendor_name` VARCHAR(255) NULL,
    `vendor_rate_per_unit` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `subcontract_warehouse` VARCHAR(255) NULL,
    `cycle_time` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `setup_time` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `hourly_rate` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `cost` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `bom_id`(`bom_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `boms` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `root_card_id` VARCHAR(50) NOT NULL,
    `bom_number` VARCHAR(100) NOT NULL,
    `revision` INTEGER NULL DEFAULT 1,
    `description` TEXT NULL,
    `status` VARCHAR(50) NULL DEFAULT 'draft',
    `is_active` BOOLEAN NULL DEFAULT true,
    `project_id` VARCHAR(50) NULL,
    `total_cost` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `root_card_id`(`root_card_id`),
    UNIQUE INDEX `unique_bom_rev`(`bom_number`, `revision`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_invoice_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_id` INTEGER NOT NULL,
    `description` TEXT NOT NULL,
    `hsn_code` VARCHAR(50) NULL,
    `qty` DECIMAL(15, 3) NOT NULL,
    `unit` VARCHAR(20) NULL,
    `rate` DECIMAL(15, 2) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,

    INDEX `invoice_id`(`invoice_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_invoices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_number` VARCHAR(50) NOT NULL,
    `customer_name` VARCHAR(255) NOT NULL,
    `project_id` VARCHAR(50) NULL,
    `invoice_date` DATE NOT NULL,
    `place_of_supply` VARCHAR(100) NULL,
    `sub_total` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `taxable_value` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `cgst_amount` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `sgst_amount` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `igst_amount` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `grand_total` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `paid_amount` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `balance_amount` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `round_off` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `notes` TEXT NULL,
    `status` ENUM('PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED') NULL DEFAULT 'PENDING',
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `invoice_number`(`invoice_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `receipt_number` VARCHAR(50) NOT NULL,
    `invoice_id` INTEGER NULL,
    `customer_name` VARCHAR(255) NOT NULL,
    `received_date` DATE NOT NULL,
    `amount_received` DECIMAL(15, 2) NOT NULL,
    `payment_method` VARCHAR(50) NULL,
    `transaction_ref` VARCHAR(100) NULL,
    `notes` TEXT NULL,
    `status` ENUM('COMPLETED', 'PENDING', 'FAILED') NULL DEFAULT 'COMPLETED',
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `receipt_number`(`receipt_number`),
    INDEX `invoice_id`(`invoice_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_operator_assignments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `plan_id` INTEGER NOT NULL,
    `root_card_id` VARCHAR(50) NULL,
    `material_entry_no` VARCHAR(255) NULL,
    `operation_id` INTEGER NULL,
    `operation_name` VARCHAR(255) NULL,
    `assignment_type` ENUM('inhouse', 'outsource') NULL DEFAULT 'inhouse',
    `operator_name` VARCHAR(255) NULL,
    `operator_id` INTEGER NULL,
    `vendor_name` VARCHAR(255) NULL,
    `vendor_id` INTEGER NULL,
    `start_time` TIME(0) NULL,
    `end_time` TIME(0) NULL,
    `break_time` INTEGER NULL DEFAULT 0,
    `total_hours` DECIMAL(5, 2) NULL,
    `remarks` TEXT NULL,
    `status` ENUM('Pending', 'In Progress', 'Partially Completed', 'Completed', 'Delayed', 'On Hold') NULL DEFAULT 'Pending',
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `plan_id`(`plan_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_production_plans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `plan_date` DATE NOT NULL,
    `created_by` INTEGER NULL,
    `status` ENUM('Draft', 'Finalized', 'In Progress', 'Completed') NULL DEFAULT 'Draft',
    `remarks` TEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_production_updates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `work_date` DATE NOT NULL,
    `plan_id` INTEGER NULL,
    `assignment_id` INTEGER NULL,
    `root_card_id` VARCHAR(50) NULL,
    `operation_id` INTEGER NULL,
    `operation_name` VARCHAR(255) NULL,
    `assignment_type` ENUM('inhouse', 'outsource') NULL DEFAULT 'inhouse',
    `operator_name` VARCHAR(255) NULL,
    `operator_id` INTEGER NULL,
    `vendor_name` VARCHAR(255) NULL,
    `vendor_id` INTEGER NULL,
    `actual_start` TIME(0) NULL,
    `actual_end` TIME(0) NULL,
    `break_time` INTEGER NULL DEFAULT 0,
    `actual_hours` DECIMAL(5, 2) NULL,
    `qty_completed` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `pending_qty` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `rework_qty` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `scrap_qty` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `status` ENUM('Pending', 'In Progress', 'Partially Completed', 'Completed', 'Delayed', 'On Hold') NULL DEFAULT 'Pending',
    `remarks` TEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `assignment_id`(`assignment_id`),
    INDEX `plan_id`(`plan_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `department_tasks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `department_id` INTEGER NOT NULL,
    `priority` ENUM('Low', 'Medium', 'High') NULL DEFAULT 'Medium',
    `assignment_date` DATE NOT NULL,
    `due_date` DATE NOT NULL,
    `status` ENUM('Pending', 'In Progress', 'Completed') NULL DEFAULT 'Pending',
    `assigned_by` INTEGER NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `assigned_by`(`assigned_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `design_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `root_card_id` VARCHAR(50) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `type` ENUM('Part Drawing', 'Assembly Drawing', 'Final Approved Drawing', 'Mechanical', 'Electrical', 'Assembly') NOT NULL,
    `version` INTEGER NULL DEFAULT 1,
    `file_path` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('Draft', 'Pending Review', 'Rejected', 'Approved') NULL DEFAULT 'Pending Review',
    `reviewer_id` INTEGER NULL,
    `reviewer_comment` TEXT NULL,
    `created_by` INTEGER NOT NULL,
    `parent_id` INTEGER NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `dwg_path` VARCHAR(255) NULL,
    `step_path` VARCHAR(255) NULL,

    INDEX `created_by`(`created_by`),
    INDEX `fk_parent_id`(`parent_id`),
    INDEX `reviewer_id`(`reviewer_id`),
    INDEX `root_card_id`(`root_card_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grn_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `grn_id` INTEGER NULL,
    `po_item_id` INTEGER NOT NULL,
    `item_code` VARCHAR(100) NULL,
    `material_name` VARCHAR(255) NULL,
    `ordered_qty` DECIMAL(15, 3) NOT NULL,
    `received_qty` DECIMAL(15, 3) NOT NULL,
    `received_weight` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `rate_per_kg` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `unit` VARCHAR(50) NULL,
    `length` DECIMAL(15, 4) NULL,
    `width` DECIMAL(15, 4) NULL,
    `thickness` DECIMAL(15, 4) NULL,
    `diameter` DECIMAL(15, 4) NULL,
    `outer_diameter` DECIMAL(15, 4) NULL,
    `height` DECIMAL(15, 4) NULL,
    `material_type` VARCHAR(100) NULL,
    `density` DECIMAL(10, 4) NULL DEFAULT 0.0000,
    `unit_weight` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `total_weight` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `total_weight_alt` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `item_group` VARCHAR(100) NULL,
    `web_thickness` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `flange_thickness` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `side_s` DECIMAL(15, 4) NULL,
    `side_s1` DECIMAL(15, 4) NULL,
    `side_s2` DECIMAL(15, 4) NULL,
    `side1` DECIMAL(15, 4) NULL,
    `side2` DECIMAL(15, 4) NULL,
    `items_per_packet` DOUBLE NULL DEFAULT 1,
    `vendor_items_per_packet` DOUBLE NULL DEFAULT 1,

    INDEX `po_item_id`(`po_item_id`),
    INDEX `receipt_id`(`grn_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grns` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `grn_number` VARCHAR(100) NULL,
    `purchase_order_id` INTEGER NOT NULL,
    `vendor_id` INTEGER NOT NULL,
    `posting_date` DATE NOT NULL,
    `status` VARCHAR(50) NULL DEFAULT 'pending',
    `inspection_type` ENUM('Inhouse', 'Outsource') NULL DEFAULT 'Inhouse',
    `inspection_vendor_id` INTEGER NULL,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `receipt_number`(`grn_number`),
    INDEX `inspection_vendor_id`(`inspection_vendor_id`),
    INDEX `purchase_order_id`(`purchase_order_id`),
    INDEX `vendor_id`(`vendor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_serials` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `serial_number` VARCHAR(100) NOT NULL,
    `item_code` VARCHAR(100) NULL,
    `purchase_order_id` INTEGER NOT NULL,
    `item_id` INTEGER NOT NULL,
    `item_name` VARCHAR(255) NOT NULL,
    `grn_id` INTEGER NULL,
    `status` ENUM('Available', 'Used', 'Rejected', 'Pending', 'Quality', 'Consumed') NULL DEFAULT 'Pending',
    `inspection_status` VARCHAR(50) NULL DEFAULT 'Pending',
    `inspection_challan_id` INTEGER NULL,
    `location` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `issued_in_entry_id` INTEGER NULL,
    `length` DECIMAL(15, 4) NULL,
    `width` DECIMAL(15, 4) NULL,
    `thickness` DECIMAL(15, 4) NULL,
    `diameter` DECIMAL(15, 4) NULL,
    `outer_diameter` DECIMAL(15, 4) NULL,
    `height` DECIMAL(15, 4) NULL,
    `unit_weight` DECIMAL(15, 4) NULL,
    `total_weight` DECIMAL(15, 4) NULL,
    `density` DECIMAL(10, 4) NULL DEFAULT 0.0000,
    `material_grade` VARCHAR(100) NULL,
    `item_group` VARCHAR(100) NULL,
    `web_thickness` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `flange_thickness` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `side_s` DECIMAL(15, 4) NULL,
    `side_s1` DECIMAL(15, 4) NULL,
    `side_s2` DECIMAL(15, 4) NULL,
    `side1` DECIMAL(15, 4) NULL,
    `side2` DECIMAL(15, 4) NULL,
    `material_type` VARCHAR(100) NULL,

    UNIQUE INDEX `serial_number`(`serial_number`),
    INDEX `fk_issued_entry`(`issued_in_entry_id`),
    INDEX `inspection_challan_id`(`inspection_challan_id`),
    INDEX `item_id`(`item_id`),
    INDEX `purchase_order_id`(`purchase_order_id`),
    INDEX `receipt_id`(`grn_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inward_challan_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inward_challan_id` INTEGER NULL,
    `item_code` VARCHAR(100) NULL,
    `item_name` VARCHAR(255) NULL,
    `batch_no` VARCHAR(100) NULL,
    `sent_qty` DECIMAL(15, 6) NULL,
    `received_qty` DECIMAL(15, 6) NULL,
    `accepted_qty` DECIMAL(15, 6) NULL,
    `rejected_qty` DECIMAL(15, 6) NULL,
    `uom` VARCHAR(20) NULL,
    `remarks` TEXT NULL,

    INDEX `inward_challan_id`(`inward_challan_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inward_challans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `challan_no` VARCHAR(50) NOT NULL,
    `challan_date` DATE NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'CANCELLED') NULL DEFAULT 'DRAFT',
    `outward_challan_id` INTEGER NULL,
    `vendor_id` INTEGER NULL,
    `vendor_name` VARCHAR(255) NULL,
    `vendor_address` TEXT NULL,
    `received_date` DATE NULL,
    `vehicle_no` VARCHAR(50) NULL,
    `remarks` TEXT NULL,
    `root_card_id` VARCHAR(50) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `challan_no`(`challan_no`),
    INDEX `outward_challan_id`(`outward_challan_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ledger_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `reference_no` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `account_name` VARCHAR(100) NOT NULL,
    `debit` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `credit` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `transaction_type` ENUM('PAYMENT_MADE', 'PAYMENT_RECEIVED', 'JOURNAL', 'INVOICE') NOT NULL,
    `related_id` INTEGER NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `material_cutting_report_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mcr_id` INTEGER NOT NULL,
    `serial_number` VARCHAR(100) NOT NULL,
    `item_code` VARCHAR(100) NOT NULL,
    `item_name` VARCHAR(255) NOT NULL,
    `design` VARCHAR(50) NULL DEFAULT 'Rectangular',
    `produced_qty` INTEGER NULL DEFAULT 1,
    `cutting_axis` VARCHAR(10) NULL DEFAULT 'L',
    `raw_l` DECIMAL(10, 2) NULL,
    `raw_w` DECIMAL(10, 2) NULL,
    `raw_t` DECIMAL(10, 2) NULL,
    `new_l` DECIMAL(10, 2) NULL,
    `new_w` DECIMAL(10, 2) NULL,
    `new_t` DECIMAL(10, 2) NULL,
    `weight_consumed` DECIMAL(10, 3) NULL,
    `unit_weight_consumed` DECIMAL(10, 3) NULL,
    `scrap_weight` DECIMAL(10, 3) NULL,
    `is_finished` BOOLEAN NULL DEFAULT false,
    `remarks` TEXT NULL,
    `item_group` VARCHAR(100) NULL,
    `material_grade` VARCHAR(100) NULL,
    `return_to_stock` BOOLEAN NULL DEFAULT false,
    `return_l` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `return_w` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `return_t` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `raw_diameter` DECIMAL(15, 4) NULL,
    `raw_outer_diameter` DECIMAL(15, 4) NULL,
    `raw_height` DECIMAL(15, 4) NULL,
    `raw_web_thickness` DECIMAL(15, 4) NULL,
    `raw_flange_thickness` DECIMAL(15, 4) NULL,
    `raw_side1` DECIMAL(15, 4) NULL,
    `raw_side2` DECIMAL(15, 4) NULL,
    `raw_side_s` DECIMAL(15, 4) NULL,
    `raw_side_s1` DECIMAL(15, 4) NULL,
    `raw_side_s2` DECIMAL(15, 4) NULL,
    `new_diameter` DECIMAL(15, 4) NULL,
    `new_outer_diameter` DECIMAL(15, 4) NULL,
    `new_height` DECIMAL(15, 4) NULL,
    `new_web_thickness` DECIMAL(15, 4) NULL,
    `new_flange_thickness` DECIMAL(15, 4) NULL,
    `new_side1` DECIMAL(15, 4) NULL,
    `new_side2` DECIMAL(15, 4) NULL,
    `new_side_s` DECIMAL(15, 4) NULL,
    `new_side_s1` DECIMAL(15, 4) NULL,
    `new_side_s2` DECIMAL(15, 4) NULL,
    `return_diameter` DECIMAL(15, 4) NULL,
    `return_outer_diameter` DECIMAL(15, 4) NULL,
    `return_height` DECIMAL(15, 4) NULL,
    `return_web_thickness` DECIMAL(15, 4) NULL,
    `return_flange_thickness` DECIMAL(15, 4) NULL,
    `return_side1` DECIMAL(15, 4) NULL,
    `return_side2` DECIMAL(15, 4) NULL,
    `return_side_s` DECIMAL(15, 4) NULL,
    `return_side_s1` DECIMAL(15, 4) NULL,
    `return_side_s2` DECIMAL(15, 4) NULL,
    `root_card_id` VARCHAR(100) NULL,

    INDEX `mcr_id`(`mcr_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `material_cutting_reports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `plan_id` INTEGER NOT NULL,
    `work_date` DATE NOT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `plan_id`(`plan_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `material_request_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `material_request_id` INTEGER NOT NULL,
    `item_name` VARCHAR(255) NOT NULL,
    `item_group` VARCHAR(100) NULL,
    `material_grade` VARCHAR(100) NULL,
    `part_detail` VARCHAR(255) NULL,
    `make` VARCHAR(100) NULL,
    `required_quantity` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `uom` VARCHAR(50) NULL,
    `remark` TEXT NULL,
    `received_quantity` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `warehouse` VARCHAR(255) NULL,
    `operation` VARCHAR(255) NULL,
    `length` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `width` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `thickness` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `diameter` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `outer_diameter` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `height` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `material_type` VARCHAR(100) NULL,
    `density` DECIMAL(10, 4) NULL DEFAULT 0.0000,
    `unit_weight` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `total_weight` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `side1` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `side2` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `web_thickness` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `flange_thickness` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `side_s` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `side_s1` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `side_s2` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `items_per_packet` DECIMAL(15, 4) NULL DEFAULT 1.0000,

    INDEX `material_request_id`(`material_request_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `material_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bom_id` INTEGER NULL,
    `request_number` VARCHAR(100) NOT NULL,
    `status` VARCHAR(50) NULL DEFAULT 'pending',
    `department` VARCHAR(100) NULL DEFAULT 'Production',
    `project_id` VARCHAR(50) NULL,
    `root_card_id` VARCHAR(50) NULL,
    `created_by` INTEGER NULL,
    `remarks` TEXT NULL,
    `type` VARCHAR(50) NULL DEFAULT 'production',
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `bom_number` VARCHAR(100) NULL,
    `project_name` VARCHAR(255) NULL,
    `revision` INTEGER NULL DEFAULT 0,

    UNIQUE INDEX `request_number`(`request_number`),
    INDEX `bom_id`(`bom_id`),
    INDEX `root_card_id`(`root_card_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `department` VARCHAR(50) NULL,
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `type` VARCHAR(50) NULL DEFAULT 'info',
    `link` VARCHAR(255) NULL,
    `metadata` JSON NULL,
    `read_status` BOOLEAN NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `operations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `type` ENUM('In-house', 'Outsource') NULL DEFAULT 'In-house',
    `phase` INTEGER NULL DEFAULT 1,
    `description` TEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `outward_challan_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `challan_id` INTEGER NULL,
    `item_code` VARCHAR(100) NULL,
    `item_name` VARCHAR(255) NULL,
    `batch_no` VARCHAR(100) NULL,
    `available_qty` DECIMAL(15, 6) NULL,
    `dispatch_qty` DECIMAL(15, 6) NULL,
    `uom` VARCHAR(20) NULL,

    INDEX `challan_id`(`challan_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `outward_challans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `challan_no` VARCHAR(50) NOT NULL,
    `challan_date` DATE NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'RECEIVED', 'CANCELLED') NULL DEFAULT 'DRAFT',
    `vendor_id` INTEGER NULL,
    `vendor_name` VARCHAR(255) NULL,
    `vendor_address` TEXT NULL,
    `operation_name` VARCHAR(100) NULL,
    `supply_order_no` VARCHAR(100) NULL,
    `supply_order_date` DATE NULL,
    `despatched_through` VARCHAR(255) NULL,
    `against_lr_rr_no` VARCHAR(100) NULL,
    `freight_type` VARCHAR(50) NULL,
    `remarks` TEXT NULL,
    `assignment_id` INTEGER NULL,
    `plan_id` INTEGER NULL,
    `root_card_id` VARCHAR(50) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `challan_no`(`challan_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_inspections` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `root_card_id` VARCHAR(255) NOT NULL,
    `inspection_name` VARCHAR(255) NOT NULL,
    `phase` INTEGER NULL DEFAULT 1,
    `status` ENUM('Pending', 'Approved', 'Rejected') NULL DEFAULT 'Pending',
    `document_path` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `phase`(`phase`),
    INDEX `root_card_id`(`root_card_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_order_attachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `purchase_order_id` INTEGER NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(255) NOT NULL,
    `file_size` INTEGER NULL,
    `mime_type` VARCHAR(100) NULL,
    `uploaded_by` INTEGER NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `purchase_order_id`(`purchase_order_id`),
    INDEX `uploaded_by`(`uploaded_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_order_communication_attachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `communication_id` INTEGER NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(255) NOT NULL,
    `file_size` INTEGER NULL,
    `mime_type` VARCHAR(100) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `communication_id`(`communication_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_order_communications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `purchase_order_id` INTEGER NOT NULL,
    `sender_id` INTEGER NULL,
    `message` TEXT NULL,
    `attachment_path` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_read` BOOLEAN NULL DEFAULT false,
    `is_outgoing` BOOLEAN NULL DEFAULT true,
    `subject` VARCHAR(255) NULL,
    `sender_email` VARCHAR(255) NULL,
    `content_text` TEXT NULL,
    `has_attachments` BOOLEAN NULL DEFAULT false,

    INDEX `purchase_order_id`(`purchase_order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_order_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `purchase_order_id` INTEGER NOT NULL,
    `material_name` VARCHAR(255) NULL,
    `vendor_material_name` VARCHAR(255) NULL,
    `item_group` VARCHAR(100) NULL,
    `part_detail` VARCHAR(255) NULL,
    `material_grade` VARCHAR(100) NULL,
    `remark` TEXT NULL,
    `make` VARCHAR(100) NULL,
    `quantity` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `unit` VARCHAR(50) NULL,
    `rate_per_kg` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `total_weight` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `rate` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `amount` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `received` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `length` DECIMAL(15, 4) NULL,
    `width` DECIMAL(15, 4) NULL,
    `thickness` DECIMAL(15, 4) NULL,
    `diameter` DECIMAL(15, 4) NULL,
    `outer_diameter` DECIMAL(15, 4) NULL,
    `height` DECIMAL(15, 4) NULL,
    `material_type` VARCHAR(100) NULL,
    `density` DECIMAL(10, 4) NULL DEFAULT 0.0000,
    `unit_weight` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `total_weight_alt` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `vendor_length` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `vendor_width` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `vendor_thickness` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `vendor_diameter` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `vendor_outer_diameter` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `vendor_height` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `side1` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `side2` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `web_thickness` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `flange_thickness` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `vendor_side1` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `vendor_side2` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `vendor_web_thickness` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `vendor_flange_thickness` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `side_s` DECIMAL(15, 4) NULL,
    `side_s1` DECIMAL(15, 4) NULL,
    `side_s2` DECIMAL(15, 4) NULL,
    `items_per_packet` DOUBLE NULL DEFAULT 1,
    `vendor_items_per_packet` DOUBLE NULL DEFAULT 1,

    INDEX `purchase_order_id`(`purchase_order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `po_number` VARCHAR(100) NOT NULL,
    `quotation_id` INTEGER NULL,
    `project_id` VARCHAR(50) NULL,
    `vendor_id` INTEGER NOT NULL,
    `order_date` DATE NOT NULL,
    `expected_delivery_date` DATE NULL,
    `delivery_location` VARCHAR(255) NULL,
    `location_link` TEXT NULL,
    `currency` VARCHAR(10) NULL DEFAULT 'INR',
    `tax_template` VARCHAR(100) NULL DEFAULT 'No Tax Template',
    `tax_amount` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `subtotal` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `total_amount` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `notes` TEXT NULL,
    `terms` TEXT NULL,
    `status` VARCHAR(50) NULL DEFAULT 'draft',
    `inventory_status` VARCHAR(50) NULL DEFAULT 'pending',
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `dc_approved` BOOLEAN NULL DEFAULT false,

    UNIQUE INDEX `po_number`(`po_number`),
    INDEX `fk_po_project`(`project_id`),
    INDEX `quotation_id`(`quotation_id`),
    INDEX `vendor_id`(`vendor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quality_final_report_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `report_id` INTEGER NOT NULL,
    `material_name` VARCHAR(255) NULL,
    `item_code` VARCHAR(100) NULL,
    `item_group` VARCHAR(255) NULL,
    `material_id` INTEGER NULL,
    `received_qty` DECIMAL(15, 3) NULL,
    `unit` VARCHAR(50) NULL,
    `accepted_qty` INTEGER NULL,
    `rejected_qty` INTEGER NULL,
    `accepted_report` VARCHAR(255) NULL,
    `rejected_report` VARCHAR(255) NULL,
    `length` DECIMAL(15, 4) NULL,
    `width` DECIMAL(15, 4) NULL,
    `thickness` DECIMAL(15, 4) NULL,
    `diameter` DECIMAL(15, 4) NULL,
    `outer_diameter` DECIMAL(15, 4) NULL,
    `height` DECIMAL(15, 4) NULL,
    `density` DECIMAL(10, 4) NULL DEFAULT 0.0000,
    `web_thickness` DECIMAL(15, 4) NULL,
    `flange_thickness` DECIMAL(15, 4) NULL,
    `side1` DECIMAL(15, 4) NULL,
    `side2` DECIMAL(15, 4) NULL,
    `side_s` DECIMAL(15, 4) NULL,
    `side_s1` DECIMAL(15, 4) NULL,
    `side_s2` DECIMAL(15, 4) NULL,

    INDEX `report_id`(`report_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quality_final_report_st_numbers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `report_item_id` INTEGER NOT NULL,
    `st_code` VARCHAR(100) NULL,
    `item_code` VARCHAR(100) NULL,
    `status` ENUM('ACCEPTED', 'REJECTED', 'PENDING') NULL,
    `length` DECIMAL(15, 4) NULL,
    `width` DECIMAL(15, 4) NULL,
    `thickness` DECIMAL(15, 4) NULL,
    `diameter` DECIMAL(15, 4) NULL,
    `outer_diameter` DECIMAL(15, 4) NULL,
    `height` DECIMAL(15, 4) NULL,
    `density` DECIMAL(10, 4) NULL DEFAULT 0.0000,
    `item_group` VARCHAR(255) NULL,
    `web_thickness` DECIMAL(15, 4) NULL,
    `flange_thickness` DECIMAL(15, 4) NULL,
    `side1` DECIMAL(15, 4) NULL,
    `side2` DECIMAL(15, 4) NULL,
    `side_s` DECIMAL(15, 4) NULL,
    `side_s1` DECIMAL(15, 4) NULL,
    `side_s2` DECIMAL(15, 4) NULL,

    INDEX `report_item_id`(`report_item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quality_final_reports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `grn_id` INTEGER NOT NULL,
    `grn_number` VARCHAR(100) NULL,
    `project_name` VARCHAR(255) NULL,
    `vendor_name` VARCHAR(255) NULL,
    `inspection_type` VARCHAR(50) NULL,
    `received_date` DATE NULL,
    `report_date` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_sent_to_inventory` BOOLEAN NULL DEFAULT false,

    INDEX `grn_id`(`grn_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quality_inspection_challans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `grn_id` INTEGER NOT NULL,
    `vendor_id` INTEGER NOT NULL,
    `challan_number` VARCHAR(100) NOT NULL,
    `challan_date` DATE NOT NULL,
    `status` ENUM('Created', 'Sent', 'Returned') NULL DEFAULT 'Created',
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `challan_number`(`challan_number`),
    INDEX `grn_id`(`grn_id`),
    INDEX `vendor_id`(`vendor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quality_inspection_results` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inspection_id` INTEGER NOT NULL,
    `serial_number` VARCHAR(100) NOT NULL,
    `status` ENUM('Accepted', 'Rejected') NOT NULL,
    `notes` TEXT NULL,
    `document_path` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `inspection_id`(`inspection_id`),
    INDEX `serial_number`(`serial_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quality_inspections` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `grn_id` INTEGER NOT NULL,
    `po_item_id` INTEGER NULL,
    `inspector_id` INTEGER NULL,
    `inspection_date` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `inspection_type` ENUM('Inhouse', 'Outsource') NOT NULL,
    `status` ENUM('Pending', 'Completed') NULL DEFAULT 'Pending',
    `remarks` TEXT NULL,
    `common_document_path` VARCHAR(255) NULL,
    `rejected_document_path` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `inspector_id`(`inspector_id`),
    UNIQUE INDEX `idx_grn_item_id`(`grn_id`, `po_item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotation_communication_attachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `communication_id` INTEGER NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(255) NOT NULL,
    `file_size` INTEGER NULL,
    `mime_type` VARCHAR(100) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `communication_id`(`communication_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotation_communications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quotation_id` INTEGER NOT NULL,
    `sender_id` INTEGER NULL,
    `message` TEXT NOT NULL,
    `attachment_path` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_read` BOOLEAN NULL DEFAULT false,
    `is_outgoing` BOOLEAN NULL DEFAULT false,
    `sender_email` VARCHAR(255) NULL,
    `subject` VARCHAR(255) NULL,
    `content_text` TEXT NULL,
    `has_attachments` BOOLEAN NULL DEFAULT false,

    INDEX `quotation_id`(`quotation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotation_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quotation_id` INTEGER NOT NULL,
    `item_name` TEXT NULL,
    `vendor_item_name` TEXT NULL,
    `category` VARCHAR(100) NULL,
    `quantity` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `unit` VARCHAR(50) NULL,
    `unit_price` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `rate_per_kg` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `total_weight` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `material_grade` VARCHAR(100) NULL,
    `part_detail` VARCHAR(255) NULL,
    `make` VARCHAR(100) NULL,
    `remark` TEXT NULL,
    `item_group` VARCHAR(100) NULL,
    `length` DECIMAL(15, 4) NULL,
    `width` DECIMAL(15, 4) NULL,
    `thickness` DECIMAL(15, 4) NULL,
    `diameter` DECIMAL(15, 4) NULL,
    `outer_diameter` DECIMAL(15, 4) NULL,
    `height` DECIMAL(15, 4) NULL,
    `material_type` VARCHAR(100) NULL,
    `density` DECIMAL(10, 4) NULL DEFAULT 0.0000,
    `unit_weight` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `vendor_length` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `vendor_width` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `vendor_thickness` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `vendor_diameter` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `vendor_outer_diameter` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `vendor_height` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `side1` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `side2` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `web_thickness` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `flange_thickness` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `vendor_side1` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `vendor_side2` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `vendor_web_thickness` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `vendor_flange_thickness` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `side_s` DECIMAL(15, 4) NULL,
    `side_s1` DECIMAL(15, 4) NULL,
    `side_s2` DECIMAL(15, 4) NULL,
    `items_per_packet` DECIMAL(15, 4) NULL DEFAULT 1.0000,
    `vendor_items_per_packet` DECIMAL(15, 4) NULL DEFAULT 1.0000,

    INDEX `quotation_id`(`quotation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quotation_number` VARCHAR(100) NOT NULL,
    `vendor_id` INTEGER NOT NULL,
    `root_card_id` VARCHAR(50) NULL,
    `material_request_id` INTEGER NULL,
    `type` ENUM('inbound', 'outbound') NULL DEFAULT 'outbound',
    `notes` TEXT NULL,
    `total_amount` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `valid_until` DATE NULL,
    `status` VARCHAR(50) NULL DEFAULT 'pending',
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `rfq_id` INTEGER NULL,
    `received_quotation_path` VARCHAR(255) NULL,

    UNIQUE INDEX `quotation_number`(`quotation_number`),
    INDEX `material_request_id`(`material_request_id`),
    INDEX `rfq_id`(`rfq_id`),
    INDEX `root_card_id`(`root_card_id`),
    INDEX `vendor_id`(`vendor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `role_id` INTEGER NOT NULL,
    `permission_id` INTEGER NOT NULL,

    INDEX `permission_id`(`permission_id`),
    PRIMARY KEY (`role_id`, `permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `root_card_operations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `root_card_id` VARCHAR(50) NOT NULL,
    `operation_name` VARCHAR(255) NOT NULL,
    `operation_type` ENUM('in_house', 'outsourced') NULL DEFAULT 'in_house',
    `phase` INTEGER NULL DEFAULT 1,
    `status` ENUM('Pending', 'In Progress', 'Partially Completed', 'Completed', 'Delayed', 'On Hold') NULL DEFAULT 'Pending',
    `planned_start` DATE NULL,
    `planned_end` DATE NULL,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `root_card_id`(`root_card_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `root_card_steps` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `root_card_id` VARCHAR(50) NOT NULL,
    `step_key` VARCHAR(50) NOT NULL,
    `step_data` JSON NULL,
    `assigned_to` INTEGER NULL,
    `status` VARCHAR(50) NULL DEFAULT 'pending',
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `unique_step`(`root_card_id`, `step_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `root_cards` (
    `id` VARCHAR(50) NOT NULL,
    `po_number` VARCHAR(100) NOT NULL,
    `po_date` DATE NULL,
    `project_name` VARCHAR(255) NOT NULL,
    `project_code` VARCHAR(100) NULL,
    `quantity` INTEGER NULL DEFAULT 1,
    `delivery_date` DATE NULL,
    `total` DECIMAL(15, 2) NULL,
    `currency` VARCHAR(10) NULL DEFAULT 'INR',
    `priority` ENUM('low', 'medium', 'high', 'critical') NULL DEFAULT 'medium',
    `status` VARCHAR(100) NULL DEFAULT 'RC_CREATED',
    `inspection` VARCHAR(255) NULL,
    `inspection_authority` VARCHAR(255) NULL,
    `ld` TEXT NULL,
    `items` JSON NULL,
    `documents` JSON NULL,
    `notes` TEXT NULL,
    `project_scope` JSON NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `po_number`(`po_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `entry_no` VARCHAR(100) NOT NULL,
    `entry_type` ENUM('Material Receipt', 'Material Issue', 'Material Transfer') NOT NULL,
    `from_warehouse` VARCHAR(255) NULL,
    `to_warehouse` VARCHAR(255) NULL,
    `entry_date` DATE NOT NULL,
    `status` ENUM('draft', 'submitted', 'cancelled') NULL DEFAULT 'submitted',
    `remarks` TEXT NULL,
    `grn_id` INTEGER NULL,
    `project_name` VARCHAR(255) NULL,
    `vendor_name` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `entry_no`(`entry_no`),
    INDEX `grn_id`(`grn_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_entry_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stock_entry_id` INTEGER NOT NULL,
    `material_id` INTEGER NULL,
    `item_code` VARCHAR(100) NOT NULL,
    `item_name` VARCHAR(255) NOT NULL,
    `quantity` DECIMAL(15, 3) NOT NULL,
    `uom` VARCHAR(50) NULL,
    `batch_no` VARCHAR(100) NULL,
    `valuation_rate` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `length` DECIMAL(15, 4) NULL,
    `width` DECIMAL(15, 4) NULL,
    `thickness` DECIMAL(15, 4) NULL,
    `diameter` DECIMAL(15, 4) NULL,
    `outer_diameter` DECIMAL(15, 4) NULL,
    `height` DECIMAL(15, 4) NULL,
    `unit_weight` DECIMAL(15, 4) NULL,
    `total_weight` DECIMAL(15, 4) NULL,
    `density` DECIMAL(10, 4) NULL DEFAULT 0.0000,
    `side1` DECIMAL(15, 4) NULL,
    `side2` DECIMAL(15, 4) NULL,
    `side_s` DECIMAL(15, 4) NULL,
    `side_s1` DECIMAL(15, 4) NULL,
    `side_s2` DECIMAL(15, 4) NULL,
    `web_thickness` DECIMAL(15, 4) NULL,
    `flange_thickness` DECIMAL(15, 4) NULL,
    `item_group` VARCHAR(100) NULL,
    `material_type` VARCHAR(100) NULL,

    INDEX `stock_entry_id`(`stock_entry_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_ledger` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `item_code` VARCHAR(100) NOT NULL,
    `material_name` VARCHAR(255) NULL,
    `posting_date` DATE NOT NULL,
    `posting_time` TIME(0) NOT NULL,
    `voucher_type` VARCHAR(100) NOT NULL,
    `voucher_no` VARCHAR(100) NOT NULL,
    `actual_qty` DECIMAL(15, 3) NOT NULL,
    `uom` VARCHAR(50) NULL,
    `balance_qty` DECIMAL(15, 3) NULL DEFAULT 0.000,
    `project_name` VARCHAR(255) NULL,
    `vendor_name` VARCHAR(255) NULL,
    `valuation_rate` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `remarks` TEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `length` DECIMAL(15, 4) NULL,
    `width` DECIMAL(15, 4) NULL,
    `thickness` DECIMAL(15, 4) NULL,
    `diameter` DECIMAL(15, 4) NULL,
    `outer_diameter` DECIMAL(15, 4) NULL,
    `height` DECIMAL(15, 4) NULL,
    `unit_weight` DECIMAL(15, 4) NULL,
    `total_weight` DECIMAL(15, 4) NULL,
    `density` DECIMAL(10, 4) NULL DEFAULT 0.0000,
    `side1` DECIMAL(15, 4) NULL,
    `side2` DECIMAL(15, 4) NULL,
    `side_s` DECIMAL(15, 4) NULL,
    `side_s1` DECIMAL(15, 4) NULL,
    `side_s2` DECIMAL(15, 4) NULL,
    `web_thickness` DECIMAL(15, 4) NULL,
    `flange_thickness` DECIMAL(15, 4) NULL,
    `item_group` VARCHAR(100) NULL,
    `material_type` VARCHAR(100) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `full_name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `department` VARCHAR(50) NULL DEFAULT 'Production',
    `role` VARCHAR(50) NULL DEFAULT 'employee',
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `first_name` VARCHAR(255) NULL,
    `last_name` VARCHAR(255) NULL,
    `designation` VARCHAR(255) NULL,
    `login_id` VARCHAR(255) NULL,
    `role_id` INTEGER NULL,
    `test_field` VARCHAR(100) NULL,
    `department_id` INTEGER NULL,
    `actions` TEXT NULL,

    UNIQUE INDEX `email`(`email`),
    UNIQUE INDEX `idx_login_id`(`login_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_invoice_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_id` INTEGER NOT NULL,
    `po_item_id` INTEGER NOT NULL,
    `description` TEXT NOT NULL,
    `hsn_code` VARCHAR(50) NULL,
    `qty` DECIMAL(15, 3) NOT NULL,
    `unit` VARCHAR(50) NULL,
    `rate` DECIMAL(15, 2) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,

    INDEX `invoice_id`(`invoice_id`),
    INDEX `po_item_id`(`po_item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_invoices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_number` VARCHAR(100) NOT NULL,
    `purchase_order_id` INTEGER NOT NULL,
    `vendor_id` INTEGER NOT NULL,
    `project_id` VARCHAR(50) NULL,
    `invoice_date` DATE NOT NULL,
    `place_of_supply` VARCHAR(255) NULL,
    `transporter` VARCHAR(255) NULL,
    `lr_number` VARCHAR(100) NULL,
    `challan_number` VARCHAR(100) NULL,
    `challan_date` DATE NULL,
    `sub_total` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `taxable_value` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `cgst_amount` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `sgst_amount` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `igst_amount` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `grand_total` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `paid_amount` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `balance_amount` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `round_off` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `status` ENUM('PENDING', 'PAID', 'OVERDUE', 'CANCELLED') NULL DEFAULT 'PENDING',
    `notes` TEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `invoice_number`(`invoice_number`),
    INDEX `project_id`(`project_id`),
    INDEX `purchase_order_id`(`purchase_order_id`),
    INDEX `vendor_id`(`vendor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `payment_number` VARCHAR(100) NOT NULL,
    `invoice_id` INTEGER NOT NULL,
    `vendor_id` INTEGER NOT NULL,
    `payment_date` DATE NOT NULL,
    `amount_paid` DECIMAL(15, 2) NOT NULL,
    `payment_method` ENUM('Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Other') NULL DEFAULT 'Bank Transfer',
    `reference_number` VARCHAR(100) NULL,
    `status` ENUM('PENDING', 'COMPLETED', 'CANCELLED') NULL DEFAULT 'COMPLETED',
    `notes` TEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `payment_number`(`payment_number`),
    INDEX `invoice_id`(`invoice_id`),
    INDEX `vendor_id`(`vendor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `address` TEXT NULL,
    `category` VARCHAR(100) NULL,
    `rating` DECIMAL(3, 2) NULL DEFAULT 0.00,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `vendor_code` VARCHAR(50) NULL,
    `contact_person_name` VARCHAR(255) NULL,
    `designation` VARCHAR(100) NULL,
    `mobile_number` VARCHAR(50) NULL,
    `vendor_type` ENUM('material_supplier', 'service_vendor', 'contractor') NULL DEFAULT 'material_supplier',
    `status` ENUM('active', 'inactive') NULL DEFAULT 'active',
    `city` VARCHAR(100) NULL,
    `state` VARCHAR(100) NULL,
    `pincode` VARCHAR(20) NULL,
    `gstin` VARCHAR(20) NULL,
    `pan_number` VARCHAR(20) NULL,
    `msme_category` ENUM('micro', 'small', 'medium', 'none') NULL DEFAULT 'none',
    `msme_certificate` VARCHAR(255) NULL,
    `payment_terms` ENUM('advance', 'net_15', 'net_30', 'net_45', 'net_60') NULL DEFAULT 'net_30',
    `credit_limit` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `bank_name` VARCHAR(255) NULL,
    `account_number` VARCHAR(100) NULL,
    `ifsc_code` VARCHAR(20) NULL,
    `average_lead_time` INTEGER NULL DEFAULT 0,
    `preferred_vendor` BOOLEAN NULL DEFAULT false,
    `notes` TEXT NULL,

    UNIQUE INDEX `email`(`email`),
    UNIQUE INDEX `vendor_code`(`vendor_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `warehouses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `type` VARCHAR(100) NULL DEFAULT 'Warehouse',
    `location` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `bom_materials` ADD CONSTRAINT `bom_materials_ibfk_1` FOREIGN KEY (`bom_id`) REFERENCES `boms`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `bom_operations` ADD CONSTRAINT `bom_operations_ibfk_1` FOREIGN KEY (`bom_id`) REFERENCES `boms`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `boms` ADD CONSTRAINT `boms_ibfk_1` FOREIGN KEY (`root_card_id`) REFERENCES `root_cards`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `customer_invoice_items` ADD CONSTRAINT `customer_invoice_items_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `customer_invoices`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `customer_payments` ADD CONSTRAINT `customer_payments_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `customer_invoices`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `daily_operator_assignments` ADD CONSTRAINT `daily_operator_assignments_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `daily_production_plans`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `daily_production_updates` ADD CONSTRAINT `daily_production_updates_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `daily_production_plans`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `daily_production_updates` ADD CONSTRAINT `daily_production_updates_ibfk_2` FOREIGN KEY (`assignment_id`) REFERENCES `daily_operator_assignments`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `department_tasks` ADD CONSTRAINT `department_tasks_ibfk_1` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `design_documents` ADD CONSTRAINT `design_documents_ibfk_1` FOREIGN KEY (`root_card_id`) REFERENCES `root_cards`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `design_documents` ADD CONSTRAINT `design_documents_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `design_documents` ADD CONSTRAINT `design_documents_ibfk_3` FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `design_documents` ADD CONSTRAINT `fk_parent_id` FOREIGN KEY (`parent_id`) REFERENCES `design_documents`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `grn_items` ADD CONSTRAINT `grn_items_ibfk_1` FOREIGN KEY (`grn_id`) REFERENCES `grns`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `grn_items` ADD CONSTRAINT `grn_items_ibfk_2` FOREIGN KEY (`po_item_id`) REFERENCES `purchase_order_items`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `grns` ADD CONSTRAINT `grns_ibfk_1` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `grns` ADD CONSTRAINT `grns_ibfk_2` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `grns` ADD CONSTRAINT `grns_ibfk_3` FOREIGN KEY (`inspection_vendor_id`) REFERENCES `vendors`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `inventory_serials` ADD CONSTRAINT `fk_issued_entry` FOREIGN KEY (`issued_in_entry_id`) REFERENCES `stock_entries`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `inventory_serials` ADD CONSTRAINT `inventory_serials_ibfk_1` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `inventory_serials` ADD CONSTRAINT `inventory_serials_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `purchase_order_items`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `inventory_serials` ADD CONSTRAINT `inventory_serials_ibfk_3` FOREIGN KEY (`grn_id`) REFERENCES `grns`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `inventory_serials` ADD CONSTRAINT `inventory_serials_ibfk_4` FOREIGN KEY (`inspection_challan_id`) REFERENCES `quality_inspection_challans`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `inward_challan_items` ADD CONSTRAINT `inward_challan_items_ibfk_1` FOREIGN KEY (`inward_challan_id`) REFERENCES `inward_challans`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `inward_challans` ADD CONSTRAINT `inward_challans_ibfk_1` FOREIGN KEY (`outward_challan_id`) REFERENCES `outward_challans`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `material_cutting_report_items` ADD CONSTRAINT `material_cutting_report_items_ibfk_1` FOREIGN KEY (`mcr_id`) REFERENCES `material_cutting_reports`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `material_cutting_reports` ADD CONSTRAINT `material_cutting_reports_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `daily_production_plans`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `material_request_items` ADD CONSTRAINT `material_request_items_ibfk_1` FOREIGN KEY (`material_request_id`) REFERENCES `material_requests`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `material_requests` ADD CONSTRAINT `material_requests_ibfk_1` FOREIGN KEY (`bom_id`) REFERENCES `boms`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `material_requests` ADD CONSTRAINT `material_requests_ibfk_2` FOREIGN KEY (`root_card_id`) REFERENCES `root_cards`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `outward_challan_items` ADD CONSTRAINT `outward_challan_items_ibfk_1` FOREIGN KEY (`challan_id`) REFERENCES `outward_challans`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `purchase_order_attachments` ADD CONSTRAINT `purchase_order_attachments_ibfk_1` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `purchase_order_attachments` ADD CONSTRAINT `purchase_order_attachments_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `purchase_order_communication_attachments` ADD CONSTRAINT `purchase_order_communication_attachments_ibfk_1` FOREIGN KEY (`communication_id`) REFERENCES `purchase_order_communications`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `purchase_order_communications` ADD CONSTRAINT `purchase_order_communications_ibfk_1` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_ibfk_1` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `fk_po_project` FOREIGN KEY (`project_id`) REFERENCES `root_cards`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_ibfk_1` FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_ibfk_2` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `quality_final_report_items` ADD CONSTRAINT `quality_final_report_items_ibfk_1` FOREIGN KEY (`report_id`) REFERENCES `quality_final_reports`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `quality_final_report_st_numbers` ADD CONSTRAINT `quality_final_report_st_numbers_ibfk_1` FOREIGN KEY (`report_item_id`) REFERENCES `quality_final_report_items`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `quality_final_reports` ADD CONSTRAINT `quality_final_reports_ibfk_1` FOREIGN KEY (`grn_id`) REFERENCES `grns`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `quality_inspection_challans` ADD CONSTRAINT `quality_inspection_challans_ibfk_1` FOREIGN KEY (`grn_id`) REFERENCES `grns`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `quality_inspection_challans` ADD CONSTRAINT `quality_inspection_challans_ibfk_2` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `quality_inspection_results` ADD CONSTRAINT `quality_inspection_results_ibfk_1` FOREIGN KEY (`inspection_id`) REFERENCES `quality_inspections`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `quality_inspection_results` ADD CONSTRAINT `quality_inspection_results_ibfk_2` FOREIGN KEY (`serial_number`) REFERENCES `inventory_serials`(`serial_number`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `quality_inspections` ADD CONSTRAINT `quality_inspections_ibfk_1` FOREIGN KEY (`grn_id`) REFERENCES `grns`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `quality_inspections` ADD CONSTRAINT `quality_inspections_ibfk_2` FOREIGN KEY (`inspector_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `quotation_communication_attachments` ADD CONSTRAINT `quotation_communication_attachments_ibfk_1` FOREIGN KEY (`communication_id`) REFERENCES `quotation_communications`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `quotation_communications` ADD CONSTRAINT `quotation_communications_ibfk_1` FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `quotation_items` ADD CONSTRAINT `quotation_items_ibfk_1` FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_ibfk_2` FOREIGN KEY (`root_card_id`) REFERENCES `root_cards`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_ibfk_3` FOREIGN KEY (`material_request_id`) REFERENCES `material_requests`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_ibfk_4` FOREIGN KEY (`rfq_id`) REFERENCES `quotations`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `root_card_operations` ADD CONSTRAINT `root_card_operations_ibfk_1` FOREIGN KEY (`root_card_id`) REFERENCES `root_cards`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `root_card_steps` ADD CONSTRAINT `root_card_steps_ibfk_1` FOREIGN KEY (`root_card_id`) REFERENCES `root_cards`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_entries` ADD CONSTRAINT `stock_entries_ibfk_1` FOREIGN KEY (`grn_id`) REFERENCES `grns`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_entry_items` ADD CONSTRAINT `stock_entry_items_ibfk_1` FOREIGN KEY (`stock_entry_id`) REFERENCES `stock_entries`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `vendor_invoice_items` ADD CONSTRAINT `vendor_invoice_items_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `vendor_invoices`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `vendor_invoice_items` ADD CONSTRAINT `vendor_invoice_items_ibfk_2` FOREIGN KEY (`po_item_id`) REFERENCES `purchase_order_items`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `vendor_invoices` ADD CONSTRAINT `vendor_invoices_ibfk_1` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `vendor_invoices` ADD CONSTRAINT `vendor_invoices_ibfk_2` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `vendor_invoices` ADD CONSTRAINT `vendor_invoices_ibfk_3` FOREIGN KEY (`project_id`) REFERENCES `root_cards`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `vendor_payments` ADD CONSTRAINT `vendor_payments_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `vendor_invoices`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `vendor_payments` ADD CONSTRAINT `vendor_payments_ibfk_2` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

