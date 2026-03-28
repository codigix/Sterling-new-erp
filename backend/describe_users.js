\"const db = require('./config/db'); async function run() { const [rows] = await db.query('DESCRIBE users'); console.log(JSON.stringify(rows, null, 2)); process.exit(0); } run();\"  
