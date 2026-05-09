const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function checkDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('--- All Available Serials ---');
    const [serials] = await connection.query("SELECT id, serial_number, status, issued_in_entry_id, item_code, item_name FROM inventory_serials WHERE status = 'Available' LIMIT 20");
    console.log(JSON.stringify(serials, null, 2));

    console.log('\n--- Stock Entries for LR-ASHM Load Simulation Dummy ---');
    const [entries] = await connection.query("SELECT * FROM stock_entries WHERE project_name LIKE '%LR-ASHM Load Simulation Dummy%'");
    console.log(JSON.stringify(entries, null, 2));

  } catch (error) {
    console.error(error);
  } finally {
    await connection.end();
  }
}

checkDatabase();
