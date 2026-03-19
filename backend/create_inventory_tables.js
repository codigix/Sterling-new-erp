const db = require('./config/db');

const createInventoryTables = async () => {
    try {
        console.log('Creating inventory serials and purchase receipts tables...');

        // Create purchase_receipts table (GRN header)
        await db.query(`
            CREATE TABLE IF NOT EXISTS purchase_receipts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                receipt_number VARCHAR(100) NOT NULL UNIQUE,
                purchase_order_id INT NOT NULL,
                vendor_id INT NOT NULL,
                posting_date DATE NOT NULL,
                status ENUM('draft', 'submitted', 'cancelled') DEFAULT 'submitted',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
                FOREIGN KEY (vendor_id) REFERENCES vendors(id)
            )
        `);

        // Create inventory_serials table (ST Numbers)
        await db.query(`
            CREATE TABLE IF NOT EXISTS inventory_serials (
                id INT AUTO_INCREMENT PRIMARY KEY,
                serial_number VARCHAR(100) NOT NULL UNIQUE, -- ST Number
                purchase_order_id INT NOT NULL,
                item_id INT NOT NULL, -- purchase_order_items.id
                item_name VARCHAR(255) NOT NULL,
                receipt_id INT, -- purchase_receipts.id
                status ENUM('Available', 'Used', 'Rejected') DEFAULT 'Available',
                location VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
                FOREIGN KEY (item_id) REFERENCES purchase_order_items(id),
                FOREIGN KEY (receipt_id) REFERENCES purchase_receipts(id)
            )
        `);

        // Create purchase_receipt_items table (GRN lines)
        await db.query(`
            CREATE TABLE IF NOT EXISTS purchase_receipt_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                receipt_id INT NOT NULL,
                po_item_id INT NOT NULL,
                material_name VARCHAR(255) NOT NULL,
                ordered_qty DECIMAL(15, 3) NOT NULL,
                received_qty DECIMAL(15, 3) NOT NULL,
                unit VARCHAR(50),
                FOREIGN KEY (receipt_id) REFERENCES purchase_receipts(id) ON DELETE CASCADE,
                FOREIGN KEY (po_item_id) REFERENCES purchase_order_items(id)
            )
        `);

        console.log('Inventory tables created successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error creating inventory tables:', error.message);
        process.exit(1);
    }
};

createInventoryTables();
