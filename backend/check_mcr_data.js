const db = require('./config/db');

async function checkData() {
    try {
        console.log('--- Checking MCR Items Data ---');
        const [rows] = await db.query('SELECT * FROM material_cutting_report_items ORDER BY id DESC LIMIT 5');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkData();
