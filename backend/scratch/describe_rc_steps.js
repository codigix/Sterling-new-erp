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
    
    console.log('Describing root_card_steps:');
    const [cols] = await db.query('DESCRIBE root_card_steps');
    console.log(cols);
    
    await db.end();
  } catch (err) {
    console.error(err);
  }
})();
