const db = require('./config/db');

async function checkMaterials() {
    try {
        console.log('--- Checking Serials for Issue ---');
        // Fetch serials that belong to any Issue entry
        const [rows] = await db.query(`
            SELECT s.serial_number, s.status, s.total_weight, s.unit_weight, s.length, s.issued_in_entry_id, se.project_name
            FROM inventory_serials s
            JOIN stock_entries se ON s.issued_in_entry_id = se.id
            WHERE se.entry_type = 'Material Issue'
            ORDER BY s.created_at DESC
            LIMIT 10
        `);
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkMaterials();
