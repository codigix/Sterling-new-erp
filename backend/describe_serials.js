const db = require('./config/db');

async function checkColumn() {
    try {
        const [rows] = await db.query("SHOW COLUMNS FROM inventory_serials LIKE 'inspection_status'");
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkColumn();
