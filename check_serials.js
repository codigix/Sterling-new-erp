const db = require('./backend/config/db');
async function checkSerials() {
    try {
        const [rows] = await db.query('DESCRIBE inventory_serials');
        console.table(rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkSerials();