const db = require('./config/db');

async function renameColumns() {
    try {
        console.log('Renaming side_s, side_s1, side_s2 to side1, side2 in grn_items and inventory_serials...');
        
        // grn_items
        const tables = ['grn_items', 'inventory_serials'];
        
        for (const table of tables) {
            console.log(`Checking columns in ${table}...`);
            const [columns] = await db.query(`SHOW COLUMNS FROM ${table}`);
            const columnNames = columns.map(c => c.Field);
            
            // Map: oldName -> newName
            const mapping = {
                'side_s': 'side_s', // Let's keep side_s but also add side1, side2 for consistency
                'side_s1': 'side1',
                'side_s2': 'side2'
            };

            for (const [oldName, newName] of Object.entries(mapping)) {
                if (columnNames.includes(oldName) && !columnNames.includes(newName)) {
                    console.log(`Renaming ${oldName} to ${newName} in ${table}...`);
                    await db.query(`ALTER TABLE ${table} CHANGE COLUMN ${oldName} ${newName} DECIMAL(15, 4) DEFAULT NULL`);
                } else if (!columnNames.includes(newName)) {
                    console.log(`Adding ${newName} to ${table}...`);
                    await db.query(`ALTER TABLE ${table} ADD COLUMN ${newName} DECIMAL(15, 4) DEFAULT NULL`);
                } else {
                    console.log(`Column ${newName} already exists in ${table}`);
                }
            }
        }

        console.log('Database updated successfully');
        process.exit(0);
    } catch (error) {
        console.error('Renaming failed:', error);
        process.exit(1);
    }
}

renameColumns();
