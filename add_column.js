const db = require('./backend/config/db');
async function addColumn() {
    try {
        await db.query('ALTER TABLE quality_final_reports ADD COLUMN is_sent_to_inventory BOOLEAN DEFAULT FALSE');
        console.log('Column is_sent_to_inventory added successfully');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
addColumn();