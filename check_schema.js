const mysql = require('mysql2/promise');

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3307,
    user: 'sterling_user',
    password: 'C0digix$309',
    database: 'sterling_db'
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
