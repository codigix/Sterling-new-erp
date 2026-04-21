const db = require('./config/db');

async function truncateData() {
    try {
        console.log('--- STARTING REQUESTED DATA TRUNCATION ---');
        
        // Disable foreign key checks to allow truncating tables with relationships
        await db.query('SET FOREIGN_KEY_CHECKS = 0');

        const tablesToClear = [
            // Quotations & RFQs
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
            
            // Quality Control (Incoming Inspection & Quality Reports)
            'quality_inspection_results',
            'quality_inspections',
            'quality_inspection_challans',
            'quality_final_report_items',
            'quality_final_report_st_numbers',
            'quality_final_reports',
            
            // Released Material (Material Cutting Reports)
            'material_cutting_report_items',
            'material_cutting_reports',
            
            // Material Requests (Associated with Procurement)
            'material_request_items',
            'material_requests',

            // Stock & Inventory (Stock Entry, Stock Balance, Stock Movement)
            'stock_ledger',
            'stock_entry_items',
            'stock_entries',
            'inventory_serials'
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

        console.log('--- ALL REQUESTED DATA HAS BEEN CLEARED SUCCESSFULLY ---');
        process.exit(0);
    } catch (error) {
        console.error('Failed to truncate data:', error);
        process.exit(1);
    }
}

truncateData();
