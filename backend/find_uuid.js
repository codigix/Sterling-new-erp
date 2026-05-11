const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function find() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    const uuid = '67a8b0b0-dc31-4f18-9be7-bd0a0f5dadcb';
    const [rows] = await connection.query('SELECT * FROM root_cards WHERE public_id = ?', [uuid]);
    console.log(JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

find();
