const db = require('./config/db');
async function run() {
    try {
        const [rows] = await db.query('DESCRIBE bom_materials');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
