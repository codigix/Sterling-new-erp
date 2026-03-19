const db = require('./config/db');

const createQualityTables = async () => {
    try {
        console.log('Creating Quality Inspection tables...');

        // 1. Add columns to grns
        try {
            await db.query(`ALTER TABLE grns ADD COLUMN inspection_type ENUM('Inhouse', 'Outsource') DEFAULT 'Inhouse' AFTER status`);
            console.log('- Added inspection_type to grns');
        } catch (e) {
            console.warn('- inspection_type already exists or error:', e.message);
        }

        try {
            await db.query(`ALTER TABLE grns ADD COLUMN inspection_vendor_id INT AFTER inspection_type`);
            await db.query(`ALTER TABLE grns ADD FOREIGN KEY (inspection_vendor_id) REFERENCES vendors(id)`);
            console.log('- Added inspection_vendor_id to grns');
        } catch (e) {
            console.warn('- inspection_vendor_id already exists or error:', e.message);
        }

        // 2. Update inventory_serials status ENUM and add inspection columns
        try {
            // Modify status ENUM to include 'Pending', 'Quality'
            await db.query(`ALTER TABLE inventory_serials MODIFY COLUMN status ENUM('Available', 'Used', 'Rejected', 'Pending', 'Quality') DEFAULT 'Pending'`);
            console.log('- Updated status ENUM in inventory_serials');
        } catch (e) {
            console.warn('- Error updating status ENUM:', e.message);
        }

        try {
            await db.query(`ALTER TABLE inventory_serials ADD COLUMN inspection_status ENUM('Pending', 'Sent for Inspection', 'Accepted', 'Rejected') DEFAULT 'Pending' AFTER status`);
            console.log('- Added inspection_status to inventory_serials');
        } catch (e) {
            console.warn('- inspection_status already exists or error:', e.message);
        }

        // 3. Create quality_inspections table
        await db.query(`
            CREATE TABLE IF NOT EXISTS quality_inspections (
                id INT AUTO_INCREMENT PRIMARY KEY,
                grn_id INT NOT NULL,
                inspector_id INT,
                inspection_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                inspection_type ENUM('Inhouse', 'Outsource') NOT NULL,
                status ENUM('Pending', 'Completed') DEFAULT 'Pending',
                remarks TEXT,
                common_document_path VARCHAR(255), -- For outsource accepted items
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (grn_id) REFERENCES grns(id),
                FOREIGN KEY (inspector_id) REFERENCES users(id)
            )
        `);
        console.log('- Created quality_inspections table');

        // 4. Create quality_inspection_results table (per ST Number)
        await db.query(`
            CREATE TABLE IF NOT EXISTS quality_inspection_results (
                id INT AUTO_INCREMENT PRIMARY KEY,
                inspection_id INT NOT NULL,
                serial_number VARCHAR(100) NOT NULL,
                status ENUM('Accepted', 'Rejected') NOT NULL,
                notes TEXT,
                document_path VARCHAR(255), -- For rejected items in outsource flow
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (inspection_id) REFERENCES quality_inspections(id),
                FOREIGN KEY (serial_number) REFERENCES inventory_serials(serial_number)
            )
        `);
        console.log('- Created quality_inspection_results table');

        // 5. Create quality_inspection_challans table
        await db.query(`
            CREATE TABLE IF NOT EXISTS quality_inspection_challans (
                id INT AUTO_INCREMENT PRIMARY KEY,
                grn_id INT NOT NULL,
                vendor_id INT NOT NULL,
                challan_number VARCHAR(100) NOT NULL UNIQUE,
                challan_date DATE NOT NULL,
                status ENUM('Created', 'Sent', 'Returned') DEFAULT 'Created',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (grn_id) REFERENCES grns(id),
                FOREIGN KEY (vendor_id) REFERENCES vendors(id)
            )
        `);
        console.log('- Created quality_inspection_challans table');

        // 6. Link inventory_serials to inspection challan
        try {
            await db.query(`ALTER TABLE inventory_serials ADD COLUMN inspection_challan_id INT AFTER inspection_status`);
            await db.query(`ALTER TABLE inventory_serials ADD FOREIGN KEY (inspection_challan_id) REFERENCES quality_inspection_challans(id)`);
            console.log('- Linked inventory_serials to inspection_challans');
        } catch (e) {
            console.warn('- inspection_challan_id already exists or error:', e.message);
        }

        console.log('Quality Inspection tables created successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error creating Quality Inspection tables:', error.message);
        process.exit(1);
    }
};

createQualityTables();
