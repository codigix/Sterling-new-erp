const mysql = require('mysql2/promise');

const updateSchema = async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'sterling_user',
    password: 'C0digix$309',
    database: 'sterling_db'
  });

  console.log('Connected to database.');

  const tables = ['stock_entry_items', 'stock_ledger'];
  const columns = [
    { name: 'side_s', type: 'DECIMAL(15,4) DEFAULT 0' },
    { name: 'side_s1', type: 'DECIMAL(15,4) DEFAULT 0' },
    { name: 'side_s2', type: 'DECIMAL(15,4) DEFAULT 0' }
  ];

  try {
    for (const table of tables) {
      const [existingColumns] = await connection.query(`SHOW COLUMNS FROM ${table}`);
      const existingNames = existingColumns.map(c => c.Field);

      for (const col of columns) {
        if (!existingNames.includes(col.name)) {
          console.log(`Adding ${col.name} to ${table}...`);
          try {
            await connection.query(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type}`);
          } catch (e) {
            console.log(`Failed to add ${col.name} to ${table}: ${e.message}`);
          }
        } else {
          console.log(`${col.name} already exists in ${table}.`);
        }
      }
    }
    console.log('Schema updated successfully.');
  } catch (error) {
    console.error('Error updating schema:', error);
  } finally {
    await connection.end();
  }
};

updateSchema();
