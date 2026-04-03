const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function cleanup() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Starting ERP database cleanup...');
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

        const tables = [
            // Quotations
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

            // Material Requests
            'material_request_items',
            'material_requests',

            // Inventory & Stock (Released Materials)
            'stock_ledger',
            'stock_entry_items',
            'stock_entries',
            'inventory_serials',

            // Quality Inspections (often linked to GRN/Release)
            'quality_inspection_results',
            'quality_inspections',
            'quality_final_report_st_numbers',
            'quality_final_report_items',
            'quality_final_reports'
        ];

        for (const table of tables) {
            console.log(`Cleaning table: ${table}`);
            // Check if table exists before trying to delete
            const [tableExists] = await connection.execute(`
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = ? 
                AND table_name = ?
            `, [process.env.DB_NAME, table]);

            if (tableExists[0].count > 0) {
                await connection.execute(`DELETE FROM ${table}`);
                await connection.execute(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
                console.log(`Table ${table} cleared and auto-increment reset.`);
            } else {
                console.log(`Table ${table} does not exist, skipping.`);
            }
        }

        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
        console.log('ERP cleanup completed successfully.');
    } catch (error) {
        console.error('ERP cleanup failed:', error);
    } finally {
        await connection.end();
    }
}

cleanup();
