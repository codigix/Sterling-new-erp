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
    
    console.log('Describing daily_production_updates:');
    const [cols] = await db.query('DESCRIBE daily_production_updates');
    console.log(cols);
    
    console.log('Describing root_cards:');
    const [rcCols] = await db.query('DESCRIBE root_cards');
    console.log(rcCols.map(c => c.Field));
    
    await db.end();
  } catch (err) {
    console.error(err);
  }
})();
