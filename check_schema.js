const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('--- inventory_serials Schema ---');
    const [columns] = await connection.query("SHOW COLUMNS FROM inventory_serials");
    console.log(JSON.stringify(columns, null, 2));

  } catch (error) {
    console.error(error);
  } finally {
    await connection.end();
  }
}

checkSchema();
