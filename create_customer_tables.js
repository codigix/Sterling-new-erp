const db = require('./backend/config/db');

async function setupCustomerTables() {
    try {
        console.log("Creating customer tables...");

        // 1. customer_invoices table
        await db.query(`
            CREATE TABLE IF NOT EXISTS customer_invoices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                invoice_number VARCHAR(50) UNIQUE NOT NULL,
                customer_name VARCHAR(255) NOT NULL,
                project_id VARCHAR(50),
                invoice_date DATE NOT NULL,
                place_of_supply VARCHAR(100),
                sub_total DECIMAL(15, 2) DEFAULT 0.00,
                taxable_value DECIMAL(15, 2) DEFAULT 0.00,
                cgst_amount DECIMAL(15, 2) DEFAULT 0.00,
                sgst_amount DECIMAL(15, 2) DEFAULT 0.00,
                igst_amount DECIMAL(15, 2) DEFAULT 0.00,
                grand_total DECIMAL(15, 2) DEFAULT 0.00,
                paid_amount DECIMAL(15, 2) DEFAULT 0.00,
                balance_amount DECIMAL(15, 2) DEFAULT 0.00,
                round_off DECIMAL(15, 2) DEFAULT 0.00,
                notes TEXT,
                status ENUM('PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED') DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // 2. customer_invoice_items table
        await db.query(`
            CREATE TABLE IF NOT EXISTS customer_invoice_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                invoice_id INT NOT NULL,
                description TEXT NOT NULL,
                hsn_code VARCHAR(50),
                qty DECIMAL(15, 3) NOT NULL,
                unit VARCHAR(20),
                rate DECIMAL(15, 2) NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                FOREIGN KEY (invoice_id) REFERENCES customer_invoices(id) ON DELETE CASCADE
            )
        `);

        // 3. customer_payments table
        await db.query(`
            CREATE TABLE IF NOT EXISTS customer_payments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                receipt_number VARCHAR(50) UNIQUE NOT NULL,
                invoice_id INT,
                customer_name VARCHAR(255) NOT NULL,
                received_date DATE NOT NULL,
                amount_received DECIMAL(15, 2) NOT NULL,
                payment_method VARCHAR(50),
                transaction_ref VARCHAR(100),
                notes TEXT,
                status ENUM('COMPLETED', 'PENDING', 'FAILED') DEFAULT 'COMPLETED',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (invoice_id) REFERENCES customer_invoices(id) ON DELETE SET NULL
            )
        `);

        console.log("Customer tables created successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Failed to create customer tables:", err);
        process.exit(1);
    }
}

setupCustomerTables();
