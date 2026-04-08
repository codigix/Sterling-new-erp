const db = require('./config/db');

async function deleteStockData() {
    const connection = await db.getConnection();
    try {
        console.log('--- STARTING STOCK DATA CLEANUP ---');
        await connection.beginTransaction();

        // 1. Disable foreign key checks to allow truncating
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        const tablesToClear = [
            'stock_entry_items',
            'stock_entries',
            'stock_ledger'
        ];

        for (const table of tablesToClear) {
            try {
                // Check if table exists before trying to truncate
                const [checkTable] = await connection.query(`SHOW TABLES LIKE '${table}'`);
                if (checkTable.length > 0) {
                    await connection.query(`TRUNCATE TABLE ${table}`);
                    console.log(`Successfully TRUNCATED table: ${table}`);
                } else {
                    console.log(`Table ${table} does not exist, skipping.`);
                }
            } catch (err) {
                console.error(`Error clearing table ${table}:`, err.message);
            }
        }

        // 2. Re-enable foreign key checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        await connection.commit();
        console.log('--- ALL STOCK DATA (ENTRIES, MOVEMENT/LEDGER) HAS BEEN CLEARED ---');

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Fatal error during cleanup:', error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

deleteStockData();
