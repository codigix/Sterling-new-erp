-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_name` VARCHAR(255) NOT NULL,
    `action` VARCHAR(255) NOT NULL,
    `type` ENUM('auth', 'admin', 'export', 'account', 'security', 'system') NOT NULL,
    `details` TEXT NULL,
    `ip_address` VARCHAR(45) NULL,
    `status` ENUM('success', 'warning', 'error') NULL DEFAULT 'success',
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
