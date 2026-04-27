const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

(async () => {
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    const [rows] = await db.query('SHOW TABLES');
    console.log(JSON.stringify(rows, null, 2));
    await db.end();
  } catch (err) {
    console.error(err);
  }
})();
