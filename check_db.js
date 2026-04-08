const mysql = require('mysql2/promise');

async function checkDatabase() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3307,
    user: 'sterling_user',
    password: 'C0digix$309',
    database: 'sterling_db'
  });

  try {
    console.log('--- Stock Entries ---');
    const [entries] = await connection.query("SELECT id, entry_no, entry_type, project_name FROM stock_entries WHERE entry_no = 'STE-2026-0002'");
    console.log(JSON.stringify(entries, null, 2));

    if (entries.length > 0) {
      const entryId = entries[0].id;
      console.log(`\n--- Serials for Entry ID ${entryId} ---`);
      const [serials] = await connection.query("SELECT id, serial_number, status, inspection_status, issued_in_entry_id FROM inventory_serials WHERE issued_in_entry_id = ?", [entryId]);
      console.log(JSON.stringify(serials, null, 2));
    }

    console.log('\n--- Projects in Stock Entries ---');
    const [projects] = await connection.query("SELECT DISTINCT project_name FROM stock_entries WHERE entry_type = 'Material Issue'");
    console.log(JSON.stringify(projects, null, 2));

  } catch (error) {
    console.error(error);
  } finally {
    await connection.end();
  }
}

checkDatabase();
