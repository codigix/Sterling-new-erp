const db = require('./config/db');

async function clearAllProcurementAndInventoryData() {
    const connection = await db.getConnection();
    try {
        console.log('--- STARTING DESTRUCTIVE DATA CLEANUP ---');
        await connection.beginTransaction();

        // 1. Disable foreign key checks to allow truncating
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        const tablesToClear = [
            // Material Requests
            'material_request_items',
            'material_requests',
            
            // Quotations
            'quotation_communication_attachments',
            'quotation_communications',
            'quotation_items',
            'quotations',
            
            // Purchase Orders
            'purchase_order_communication_attachments',
            'purchase_order_communications',
            'purchase_order_attachments',
            'purchase_order_items',
            'purchase_orders',
            
            // GRNs
            'grn_items',
            'grns',
            
            // Inventory & Stock
            'stock_entry_items',
            'stock_entries',
            'stock_ledger',
            'inventory_serials',
            
            // Quality Control
            'quality_final_report_st_numbers',
            'quality_final_report_items',
            'quality_final_reports',
            'quality_inspections',
            'quality_inspection_results',
            'quality_inspection_challans'
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
        console.log('--- ALL PROCUREMENT, INVENTORY, AND QC DATA HAS BEEN CLEARED ---');

        // 3. Reset Root Cards to 'draft' if they are in procurement-related statuses (Optional, but helps with clean state)
        // const procurementStatuses = ['MATERIAL_PLANNING', 'PURCHASE_ORDER_RELEASED', 'awaiting_storage', 'qc_pending', 'MATERIAL_RELEASED', 'PARTIALLY_RELEASED'];
        // await connection.query('UPDATE root_cards SET status = "draft" WHERE status IN (?)', [procurementStatuses]);
        // console.log('Reset related Root Card statuses.');

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Fatal error during cleanup:', error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

clearAllProcurementAndInventoryData();
