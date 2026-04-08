const db = require('./config/db');

async function deleteRequestedData() {
    const connection = await db.getConnection();
    try {
        console.log('--- STARTING REQUESTED DATA CLEANUP ---');
        await connection.beginTransaction();

        // 1. Disable foreign key checks to allow truncating
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        const tablesToClear = [
            // Purchase Orders
            'purchase_order_communication_attachments',
            'purchase_order_communications',
            'purchase_order_attachments',
            'purchase_order_items',
            'purchase_orders',
            
            // GRNs
            'grn_items',
            'grns',
            'inventory_serials', // Serials are created during GRN
            
            // Quality Control
            'quality_final_report_st_numbers',
            'quality_final_report_items',
            'quality_final_reports',
            'quality_inspections',
            'quality_inspection_results'
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

        // 2. Reset GRN-related status for Root Cards if they are in QC or procurement-related statuses
        const statusesToReset = ['QC_PENDING', 'PURCHASE_ORDER_RELEASED', 'awaiting_storage', 'qc_pending', 'qc_finalized', 'qc_completed'];
        await connection.query('UPDATE root_cards SET status = "draft" WHERE status IN (?)', [statusesToReset]);
        console.log('Reset related Root Card statuses.');

        // 3. Re-enable foreign key checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        await connection.commit();
        console.log('--- ALL REQUESTED DATA (PO, GRN, QUALITY) HAS BEEN CLEARED ---');

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Fatal error during cleanup:', error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

deleteRequestedData();
