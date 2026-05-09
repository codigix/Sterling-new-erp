const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTable() {
  const connectionConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  };

  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log('--- root_card_operations Columns ---');
    const [columns] = await connection.query('DESCRIBE root_card_operations');
    console.table(columns);

    console.log('\n--- Sample Data ---');
    const [rows] = await connection.query('SELECT * FROM root_card_operations LIMIT 5');
    console.log(JSON.stringify(rows, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) await connection.end();
    process.exit();
  }
}

checkTable();
