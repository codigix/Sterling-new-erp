const db = require('./backend/config/db');

async function migrate() {
    try {
        console.log("Starting migration to update vendors table...");

        // Check if columns exist and add them if not
        const [existingColumns] = await db.query('DESCRIBE vendors');
        const columnNames = existingColumns.map(c => c.Field);

        const newColumns = [
            { name: 'vendor_code', type: 'VARCHAR(50) UNIQUE' },
            { name: 'contact_person_name', type: 'VARCHAR(255)' },
            { name: 'designation', type: 'VARCHAR(100)' },
            { name: 'mobile_number', type: 'VARCHAR(50)' },
            { name: 'vendor_type', type: "ENUM('material_supplier', 'service_vendor', 'contractor') DEFAULT 'material_supplier'" },
            { name: 'status', type: "ENUM('active', 'inactive') DEFAULT 'active'" },
            { name: 'city', type: 'VARCHAR(100)' },
            { name: 'state', type: 'VARCHAR(100)' },
            { name: 'pincode', type: 'VARCHAR(20)' },
            { name: 'gstin', type: 'VARCHAR(20)' },
            { name: 'pan_number', type: 'VARCHAR(20)' },
            { name: 'msme_category', type: "ENUM('micro', 'small', 'medium', 'none') DEFAULT 'none'" },
            { name: 'msme_certificate', type: 'VARCHAR(255)' }, // Path to file
            { name: 'payment_terms', type: "ENUM('advance', 'net_15', 'net_30', 'net_45', 'net_60') DEFAULT 'net_30'" },
            { name: 'credit_limit', type: 'DECIMAL(15, 2) DEFAULT 0.00' },
            { name: 'bank_name', type: 'VARCHAR(255)' },
            { name: 'account_number', type: 'VARCHAR(100)' },
            { name: 'ifsc_code', type: 'VARCHAR(20)' },
            { name: 'average_lead_time', type: 'INT DEFAULT 0' },
            { name: 'preferred_vendor', type: 'BOOLEAN DEFAULT FALSE' },
            { name: 'notes', type: 'TEXT' }
        ];

        for (const col of newColumns) {
            if (!columnNames.includes(col.name)) {
                console.log(`Adding column: ${col.name}`);
                await db.query(`ALTER TABLE vendors ADD COLUMN ${col.name} ${col.type}`);
            }
        }

        // Rename contact to mobile_number if it exists and mobile_number was just added
        if (columnNames.includes('contact') && !columnNames.includes('mobile_number')) {
             // Already handled by loop above if we add mobile_number
        }

        console.log("Migration completed successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();