const db = require('./config/db');

async function fixAllDimensionColumns() {
    try {
        console.log('Fixing all dimension columns in grn_items, inventory_serials, stock_entry_items, and stock_ledger...');
        
        const tables = ['grn_items', 'inventory_serials', 'stock_entry_items', 'stock_ledger'];
        const colsToAdd = [
            { name: 'length', type: 'DECIMAL(15, 4) DEFAULT NULL' },
            { name: 'width', type: 'DECIMAL(15, 4) DEFAULT NULL' },
            { name: 'thickness', type: 'DECIMAL(15, 4) DEFAULT NULL' },
            { name: 'diameter', type: 'DECIMAL(15, 4) DEFAULT NULL' },
            { name: 'outer_diameter', type: 'DECIMAL(15, 4) DEFAULT NULL' },
            { name: 'height', type: 'DECIMAL(15, 4) DEFAULT NULL' },
            { name: 'side1', type: 'DECIMAL(15, 4) DEFAULT NULL' },
            { name: 'side2', type: 'DECIMAL(15, 4) DEFAULT NULL' },
            { name: 'side_s', type: 'DECIMAL(15, 4) DEFAULT NULL' },
            { name: 'side_s1', type: 'DECIMAL(15, 4) DEFAULT NULL' },
            { name: 'side_s2', type: 'DECIMAL(15, 4) DEFAULT NULL' },
            { name: 'web_thickness', type: 'DECIMAL(15, 4) DEFAULT NULL' },
            { name: 'flange_thickness', type: 'DECIMAL(15, 4) DEFAULT NULL' },
            { name: 'item_group', type: 'VARCHAR(100) DEFAULT NULL' },
            { name: 'material_type', type: 'VARCHAR(100) DEFAULT NULL' },
            { name: 'density', type: 'DECIMAL(15, 4) DEFAULT NULL' },
            { name: 'unit_weight', type: 'DECIMAL(15, 4) DEFAULT NULL' },
            { name: 'total_weight', type: 'DECIMAL(15, 4) DEFAULT NULL' }
        ];

        for (const table of tables) {
            console.log(`- Checking table: ${table}`);
            for (const col of colsToAdd) {
                try {
                    await db.query(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type}`);
                    console.log(`  + Added ${col.name} to ${table}`);
                } catch (e) {
                    if (e.code === 'ER_DUP_COLUMN_NAME' || e.code === 'ER_DUP_FIELDNAME') {
                        // console.warn(`  - ${col.name} already exists in ${table}`);
                    } else {
                        console.error(`  ! Error adding ${col.name} to ${table}:`, e.message);
                    }
                }
            }
        }

        console.log('All tables updated successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

fixAllDimensionColumns();
