const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
});

async function fixRootCardStatus() {
  try {
    const [result] = await pool.query("UPDATE root_cards SET status = 'RC_CREATED' WHERE status = '' OR status IS NULL");
    console.log(`Updated ${result.affectedRows} root cards to RC_CREATED`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixRootCardStatus();
