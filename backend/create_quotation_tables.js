const db = require('./config/db');

const createQuotationTables = async () => {
    try {
        console.log('Creating Quotation and Vendor tables...');

        // 1. Create vendors table
        await db.query(`
            CREATE TABLE IF NOT EXISTS vendors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                phone VARCHAR(50),
                address TEXT,
                category VARCHAR(100),
                rating DECIMAL(3, 2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('Table "vendors" created or already exists');

        // Insert some dummy vendors if empty
        const [vendorRows] = await db.query('SELECT COUNT(*) as count FROM vendors');
        if (vendorRows[0].count === 0) {
            await db.query(`
                INSERT INTO vendors (name, email, category) VALUES 
                ('Steel Supplies Inc.', 'sales@steelsupplies.com', 'Raw Materials'),
                ('Hardware Depot', 'contact@hardwaredepot.com', 'Hardware'),
                ('Precision Tools Ltd.', 'info@precisiontools.com', 'Tools')
            `);
            console.log('Dummy vendors inserted');
        }

        // 2. Create quotations table
        await db.query(`
            CREATE TABLE IF NOT EXISTS quotations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                quotation_number VARCHAR(100) NOT NULL UNIQUE,
                vendor_id INT NOT NULL,
                root_card_id VARCHAR(50),
                material_request_id INT,
                rfq_id INT,
                type ENUM('inbound', 'outbound') DEFAULT 'outbound',
                notes TEXT,
                total_amount DECIMAL(15, 2) DEFAULT 0,
                valid_until DATE,
                status VARCHAR(50) DEFAULT 'pending', -- pending, sent, received, accepted, rejected
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
                FOREIGN KEY (root_card_id) REFERENCES root_cards(id) ON DELETE SET NULL,
                FOREIGN KEY (material_request_id) REFERENCES material_requests(id) ON DELETE SET NULL
            )
        `);
        console.log('Table "quotations" created or already exists');

        // 3. Create quotation_items table
        await db.query(`
            CREATE TABLE IF NOT EXISTS quotation_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                quotation_id INT NOT NULL,
                item_name TEXT,
                vendor_item_name TEXT,
                item_group VARCHAR(100),
                material_grade VARCHAR(100),
                part_detail VARCHAR(255),
                make VARCHAR(100),
                remark TEXT,
                category VARCHAR(100),
                quantity DECIMAL(15, 4) DEFAULT 0,
                unit VARCHAR(50),
                unit_price DECIMAL(15, 2) DEFAULT 0,
                rate_per_kg DECIMAL(15, 2) DEFAULT 0,
                total_weight DECIMAL(15, 4) DEFAULT 0,
                length DECIMAL(15, 4) DEFAULT 0,
                width DECIMAL(15, 4) DEFAULT 0,
                thickness DECIMAL(15, 4) DEFAULT 0,
                diameter DECIMAL(15, 4) DEFAULT 0,
                outer_diameter DECIMAL(15, 4) DEFAULT 0,
                height DECIMAL(15, 4) DEFAULT 0,
                material_type VARCHAR(100),
                density DECIMAL(15, 4) DEFAULT 0,
                unit_weight DECIMAL(15, 4) DEFAULT 0,
                vendor_length DECIMAL(15, 4) DEFAULT 0,
                vendor_width DECIMAL(15, 4) DEFAULT 0,
                vendor_thickness DECIMAL(15, 4) DEFAULT 0,
                vendor_diameter DECIMAL(15, 4) DEFAULT 0,
                vendor_outer_diameter DECIMAL(15, 4) DEFAULT 0,
                vendor_height DECIMAL(15, 4) DEFAULT 0,
                FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
            )
        `);
        console.log('Table "quotation_items" created or already exists');

        // 4. Create quotation_communications table
        await db.query(`
            CREATE TABLE IF NOT EXISTS quotation_communications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                quotation_id INT NOT NULL,
                sender_id INT,
                message TEXT NOT NULL,
                attachment_path VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
            )
        `);
        console.log('Table "quotation_communications" created or already exists');

        console.log('Quotation tables setup completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Failed to create Quotation tables:', error);
        process.exit(1);
    }
};

createQuotationTables();
