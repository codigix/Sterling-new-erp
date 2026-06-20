const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

(async () => {
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306
    });
    
    const [rows] = await db.query('SELECT id, project_name, project_code, timelines FROM root_cards WHERE timelines IS NOT NULL');
    console.log(`Found ${rows.length} projects with timelines:`);
    console.log(JSON.stringify(rows, null, 2));
    
    await db.end();
  } catch (err) {
    console.error(err);
  }
})();
