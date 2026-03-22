const db = require('./config/db');

async function cleanup() {
    try {
        console.log("Starting database cleanup...");
        await db.query('SET FOREIGN_KEY_CHECKS = 0');
        const tables = [
            'purchase_order_items', 
            'purchase_orders', 
            'grn_items', 
            'grns', 
            'stock_entry_items', 
            'stock_entries', 
            'stock_ledger', 
            'inventory_serials'
        ];
        
        for (const table of tables) {
            console.log(`Truncating ${table}...`);
            await db.query(`TRUNCATE TABLE ${table}`);
        }
        
        await db.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log("Database cleanup completed successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Cleanup failed:", error);
        process.exit(1);
    }
}

cleanup();
