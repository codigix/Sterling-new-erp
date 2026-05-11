const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    const [columns] = await connection.query('SHOW COLUMNS FROM root_cards');
    console.log(JSON.stringify(columns, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

check();
