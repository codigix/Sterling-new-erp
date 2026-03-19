const db = require('./config/db');

async function cleanup() {
    try {
        console.log('Starting cleanup of POs and GRNs...');
        
        await db.query('SET FOREIGN_KEY_CHECKS = 0');
        
        console.log('Truncating tables...');
        const tables = [
            'purchase_order_items',
            'purchase_order_attachments',
            'purchase_order_communications',
            'purchase_order_invoices',
            'purchase_receipt_items',
            'inventory_serials',
            'purchase_receipts',
            'purchase_orders'
        ];
        
        for (const table of tables) {
            try {
                await db.query(`TRUNCATE TABLE ${table}`);
                console.log(`- Truncated ${table}`);
            } catch (err) {
                console.warn(`- Could not truncate ${table} (it might not exist): ${err.message}`);
                // Try DELETE if TRUNCATE fails (e.g. for views or if table is missing)
                try {
                   await db.query(`DELETE FROM ${table}`);
                   console.log(`- Deleted rows from ${table}`);
                } catch (delErr) {
                   // Silently ignore if it really doesn't exist
                }
            }
        }
        
        await db.query('SET FOREIGN_KEY_CHECKS = 1');
        
        console.log('Cleanup completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Cleanup failed:', error);
        process.exit(1);
    }
}

cleanup();
