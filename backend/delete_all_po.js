const db = require('./config/db');

async function deleteAllPOs() {
    try {
        console.log("Starting PO deletion...");
        await db.query('SET FOREIGN_KEY_CHECKS = 0');
        
        const tables = [
            'purchase_order_communication_attachments',
            'purchase_order_communications',
            'purchase_order_attachments',
            'purchase_order_items', 
            'purchase_orders'
        ];
        
        for (const table of tables) {
            console.log(`Truncating ${table}...`);
            await db.query(`TRUNCATE TABLE ${table}`);
        }
        
        await db.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log("All Purchase Orders deleted successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Deletion failed:", error);
        process.exit(1);
    }
}

deleteAllPOs();
