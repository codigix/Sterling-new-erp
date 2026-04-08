const db = require('./config/db');

async function alterTable() {
    try {
        console.log('Altering inventory_serials.inspection_status to VARCHAR...');
        await db.query("ALTER TABLE inventory_serials MODIFY COLUMN inspection_status VARCHAR(50) DEFAULT 'Pending'");
        console.log('✓ Column altered successfully');
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

alterTable();
