const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').resolve(__dirname, './.env') });

async function checkData() {
  const dbName = 'sterling_db_Development';
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: dbName,
    port: process.env.DB_PORT || 3306
  });

  try {
    const [rows] = await connection.query('SELECT id, public_id FROM root_cards');
    console.log(`Data in ${dbName}.root_cards:`);
    rows.forEach(row => {
      console.log(`- ID: ${row.id}, Public ID: ${row.public_id}`);
    });
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    if (connection) await connection.end();
    process.exit(1);
  }
}

checkData();
