const db = require('./config/db');

async function updateSchema() {
    try {
        console.log('Adding missing columns to grn_items table...');
        
        const colsToAdd = [
            { name: 'item_group', type: 'VARCHAR(100) DEFAULT NULL' },
            { name: 'web_thickness', type: 'DECIMAL(15, 4) DEFAULT 0.0000' },
            { name: 'flange_thickness', type: 'DECIMAL(15, 4) DEFAULT 0.0000' },
            { name: 'side1', type: 'DECIMAL(15, 4) DEFAULT NULL' },
            { name: 'side2', type: 'DECIMAL(15, 4) DEFAULT NULL' },
            { name: 'side_s', type: 'DECIMAL(15, 4) DEFAULT NULL' },
            { name: 'side_s1', type: 'DECIMAL(15, 4) DEFAULT NULL' },
            { name: 'side_s2', type: 'DECIMAL(15, 4) DEFAULT NULL' }
        ];

        for (const col of colsToAdd) {
            try {
                await db.query(`ALTER TABLE grn_items ADD COLUMN ${col.name} ${col.type}`);
                console.log(`- Added ${col.name} to grn_items`);
            } catch (e) {
                if (e.code === 'ER_DUP_COLUMN_NAME' || e.code === 'ER_DUP_FIELDNAME') {
                    console.warn(`- ${col.name} already exists in grn_items`);
                } else {
                    throw e;
                }
            }

            try {
                await db.query(`ALTER TABLE inventory_serials ADD COLUMN ${col.name} ${col.type}`);
                console.log(`- Added ${col.name} to inventory_serials`);
            } catch (e) {
                if (e.code === 'ER_DUP_COLUMN_NAME' || e.code === 'ER_DUP_FIELDNAME') {
                    console.warn(`- ${col.name} already exists in inventory_serials`);
                } else {
                    throw e;
                }
            }
        }

        console.log('grn_items table updated successfully');
        process.exit(0);
    } catch (error) {
        console.error('Update failed:', error);
        process.exit(1);
    }
}

updateSchema();
