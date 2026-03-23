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
        console.log('Starting database cleanup...');
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

        const tables = [
            'quality_final_report_st_numbers',
            'quality_final_report_items',
            'quality_final_reports',
            'quality_inspection_results',
            'quality_inspections',
            'stock_ledger',
            'stock_entry_items',
            'stock_entries',
            'inventory_serials',
            'grn_items',
            'grns',
            'purchase_order_items',
            'purchase_orders'
        ];

        for (const table of tables) {
            console.log(`Cleaning table: ${table}`);
            await connection.execute(`DELETE FROM ${table}`);
            await connection.execute(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
        }

        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
        console.log('Cleanup completed successfully.');
    } catch (error) {
        console.error('Cleanup failed:', error);
    } finally {
        await connection.end();
    }
}

cleanup();
