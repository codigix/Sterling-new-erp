const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    try {
        const connection = await mysql.createConnection(process.env.DATABASE_URL);
        console.log('Connected to database');
        
        const [rootCardCols] = await connection.query('DESCRIBE root_cards');
        console.log('root_cards columns:', rootCardCols.map(c => c.Field));
        
        const tables = ['quotations', 'purchase_orders', 'material_requests', 'grns', 'vendor_invoices', 'customer_invoices'];
        for (const table of tables) {
            try {
                const [cols] = await connection.query(`DESCRIBE ${table}`);
                console.log(`${table} columns:`, cols.map(c => c.Field));
            } catch (e) {
                console.log(`${table} table error:`, e.message);
            }
        }
        
        await connection.end();
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
})();
