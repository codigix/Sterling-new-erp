const db = require('./config/db');

async function clearData() {
    try {
        console.log('Clearing PO, GRN, Stock Entry, and Quality Report data...');

        // Disable foreign key checks to truncate tables with relationships
        await db.query('SET FOREIGN_KEY_CHECKS = 0');

        const tablesToClear = [
            'stock_ledger',
            'stock_entry_items',
            'stock_entries',
            'inventory_serials',
            'quality_inspection_results',
            'quality_inspections',
            'quality_inspection_challans',
            'quality_final_report_items',
            'quality_final_report_st_numbers',
            'quality_final_reports',
            'grn_items',
            'grns',
            'purchase_receipt_items',
            'purchase_receipts',
            'purchase_order_communication_attachments',
            'purchase_order_communications',
            'purchase_order_attachments',
            'purchase_order_items',
            'purchase_orders'
        ];

        for (const table of tablesToClear) {
            try {
                // Check if table exists before truncating
                const [exists] = await db.query(`SHOW TABLES LIKE '${table}'`);
                if (exists.length > 0) {
                    await db.query(`TRUNCATE TABLE ${table}`);
                    console.log(`- Truncated ${table}`);
                } else {
                    console.log(`- Table ${table} does not exist, skipping...`);
                }
            } catch (err) {
                console.error(`- Error truncating ${table}:`, err.message);
            }
        }

        // Re-enable foreign key checks
        await db.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('All requested data has been cleared successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Failed to clear data:', error);
        process.exit(1);
    }
}

clearData();
