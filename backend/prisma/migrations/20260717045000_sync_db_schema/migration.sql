-- AlterTable
ALTER TABLE `customer_invoices` ADD COLUMN `challan_date` DATE NULL,
    ADD COLUMN `challan_number` VARCHAR(50) NULL,
    ADD COLUMN `customer_address` TEXT NULL,
    ADD COLUMN `customer_gstin` VARCHAR(50) NULL,
    ADD COLUMN `customer_state_code` VARCHAR(10) NULL,
    ADD COLUMN `gst_tds` DECIMAL(15, 2) NULL DEFAULT 0.00,
    ADD COLUMN `it_tds` DECIMAL(15, 2) NULL DEFAULT 0.00,
    ADD COLUMN `lr_number` VARCHAR(50) NULL,
    ADD COLUMN `po_date` DATE NULL,
    ADD COLUMN `po_number` VARCHAR(50) NULL,
    ADD COLUMN `transporter` VARCHAR(100) NULL;

-- AlterTable
ALTER TABLE `customer_payments` ADD COLUMN `gst_tds` DECIMAL(15, 2) NULL DEFAULT 0.00,
    ADD COLUMN `it_tds` DECIMAL(15, 2) NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE `department_tasks` ADD COLUMN `completed_date` DATETIME(0) NULL,
    ADD COLUMN `task_code` VARCHAR(50) NULL;

-- AlterTable
ALTER TABLE `quality_final_report_items` ADD COLUMN `material_grade` VARCHAR(100) NULL;

-- AlterTable
ALTER TABLE `root_cards` ADD COLUMN `timelines` JSON NULL;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `test_field`,
    ADD COLUMN `status` VARCHAR(20) NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE `vendor_invoice_items` MODIFY `po_item_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `vendor_invoices` MODIFY `purchase_order_id` INTEGER NULL;

-- DropTable
DROP TABLE `_migrations_history`;

-- CreateTable
CREATE TABLE `financial_reminders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `reminder_date` DATE NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `recurrence` VARCHAR(50) NULL DEFAULT 'once',
    `recurrence_day` INTEGER NULL,
    `recurrence_month` INTEGER NULL,
    `is_triggered` BOOLEAN NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_reset_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `username` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `token` VARCHAR(255) NULL,
    `expires_at` TIMESTAMP(0) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED') NULL DEFAULT 'PENDING',
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `token`(`token`),
    INDEX `user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` VARCHAR(50) NOT NULL,
    `document_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(255) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `uploaded_by` INTEGER NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `project_id`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `password_reset_requests` ADD CONSTRAINT `password_reset_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `project_documents` ADD CONSTRAINT `project_documents_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `root_cards`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
