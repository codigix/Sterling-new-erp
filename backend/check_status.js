const db = require('./config/db');

async function checkStatus() {
    try {
        console.log('--- Checking Serial Statuses ---');
        const [rows] = await db.query('SELECT DISTINCT status FROM inventory_serials');
        console.log('Unique statuses in DB:', rows.map(r => r.status));
        
        const [rows2] = await db.query('SELECT serial_number, status, issued_in_entry_id FROM inventory_serials WHERE issued_in_entry_id IS NOT NULL LIMIT 10');
        console.log('Sample of issued serials:');
        console.table(rows2);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkStatus();
