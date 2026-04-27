const pool = require('./config/db');

async function setupChallanTables() {
    try {
        console.log("Updating challan tables to minimal version...");

        // Drop existing tables to recreate with new schema
        await pool.query(`DROP TABLE IF EXISTS outward_challan_items`);
        await pool.query(`DROP TABLE IF EXISTS outward_challans`);

        // 1. outward_challans table (Minimal)
        await pool.query(`
            CREATE TABLE outward_challans (
                id INT AUTO_INCREMENT PRIMARY KEY,
                challan_no VARCHAR(50) UNIQUE NOT NULL,
                challan_date DATE NOT NULL,
                status ENUM('DRAFT', 'SUBMITTED', 'RECEIVED', 'CANCELLED') DEFAULT 'DRAFT',
                vendor_id INT,
                vendor_name VARCHAR(255),
                vendor_address TEXT,
                operation_name VARCHAR(100),
                supply_order_no VARCHAR(100),
                supply_order_date DATE,
                despatched_through VARCHAR(255),
                against_lr_rr_no VARCHAR(100),
                freight_type VARCHAR(50),
                remarks TEXT,
                assignment_id INT,
                plan_id INT,
                root_card_id VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // 2. outward_challan_items table
        await pool.query(`
            CREATE TABLE outward_challan_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                challan_id INT,
                item_code VARCHAR(100),
                item_name VARCHAR(255),
                batch_no VARCHAR(100),
                available_qty DECIMAL(15, 6),
                dispatch_qty DECIMAL(15, 6),
                uom VARCHAR(20),
                FOREIGN KEY (challan_id) REFERENCES outward_challans(id) ON DELETE CASCADE
            )
        `);

        console.log("Minimal challan tables updated successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Error updating challan tables:", error);
        process.exit(1);
    }
}

setupChallanTables();
