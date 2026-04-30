const db = require('./config/db');

const createAccountingTables = async () => {
    try {
        console.log('Creating accounting vendor invoices and items tables...');

        // Create vendor_invoices table
        await db.query(`
            CREATE TABLE IF NOT EXISTS vendor_invoices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                invoice_number VARCHAR(100) NOT NULL UNIQUE,
                purchase_order_id INT NOT NULL,
                vendor_id INT NOT NULL,
                project_id VARCHAR(50),
                invoice_date DATE NOT NULL,
                place_of_supply VARCHAR(255),
                transporter VARCHAR(255),
                lr_number VARCHAR(100),
                challan_number VARCHAR(100),
                challan_date DATE,
                sub_total DECIMAL(15, 2) DEFAULT 0,
                taxable_value DECIMAL(15, 2) DEFAULT 0,
                cgst_amount DECIMAL(15, 2) DEFAULT 0,
                sgst_amount DECIMAL(15, 2) DEFAULT 0,
                igst_amount DECIMAL(15, 2) DEFAULT 0,
                grand_total DECIMAL(15, 2) DEFAULT 0,
                round_off DECIMAL(15, 2) DEFAULT 0,
                status ENUM('PENDING', 'PAID', 'OVERDUE', 'CANCELLED') DEFAULT 'PENDING',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
                FOREIGN KEY (vendor_id) REFERENCES vendors(id),
                FOREIGN KEY (project_id) REFERENCES root_cards(id)
            )
        `);

        // Create vendor_invoice_items table
        await db.query(`
            CREATE TABLE IF NOT EXISTS vendor_invoice_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                invoice_id INT NOT NULL,
                po_item_id INT NOT NULL,
                description TEXT NOT NULL,
                hsn_code VARCHAR(50),
                qty DECIMAL(15, 3) NOT NULL,
                unit VARCHAR(50),
                rate DECIMAL(15, 2) NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                FOREIGN KEY (invoice_id) REFERENCES vendor_invoices(id) ON DELETE CASCADE,
                FOREIGN KEY (po_item_id) REFERENCES purchase_order_items(id)
            )
        `);

        console.log('Accounting tables created successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error creating accounting tables:', error.message);
        process.exit(1);
    }
};

createAccountingTables();
