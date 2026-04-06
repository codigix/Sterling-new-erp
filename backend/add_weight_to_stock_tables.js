const db = require('./config/db');

const addWeightToStockTables = async () => {
    try {
        const tables = ['stock_entry_items', 'stock_ledger', 'inventory_serials'];
        const columns = [
            'ADD COLUMN unit_weight DECIMAL(15, 4) DEFAULT NULL',
            'ADD COLUMN total_weight DECIMAL(15, 4) DEFAULT NULL'
        ];

        for (const table of tables) {
            console.log(`Adding weights to ${table} table...`);
            for (const column of columns) {
                try {
                    const columnName = column.split(' ')[2];
                    await db.query(`ALTER TABLE ${table} ${column}`);
                    console.log(`Added ${columnName} to ${table}`);
                } catch (err) {
                    if (err.code === 'ER_DUP_COLUMN_NAME') {
                        console.log(`Column already exists in ${table}, skipping...`);
                    } else {
                        console.error(`Error adding column to ${table}:`, err.message);
                    }
                }
            }
        }

        console.log('Stock tables update completed');
        process.exit(0);
    } catch (error) {
        console.error('Failed to update stock tables:', error);
        process.exit(1);
    }
};

addWeightToStockTables();
