const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

const updateSchema = async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'sterling_user',
    password: 'C0digix$309',
    database: 'sterling_db'
  });

  console.log('Connected to database.');

  const tables = ['material_request_items'];
  const columns = [
    { name: 'side_s', type: 'DECIMAL(15,4) DEFAULT 0' },
    { name: 'side_s1', type: 'DECIMAL(15,4) DEFAULT 0' },
    { name: 'side_s2', type: 'DECIMAL(15,4) DEFAULT 0' },
    { name: 'side1', type: 'DECIMAL(15,4) DEFAULT 0' },
    { name: 'side2', type: 'DECIMAL(15,4) DEFAULT 0' },
    { name: 'web_thickness', type: 'DECIMAL(15,4) DEFAULT 0' },
    { name: 'flange_thickness', type: 'DECIMAL(15,4) DEFAULT 0' }
  ];

  try {
    for (const table of tables) {
      const [existingColumns] = await connection.query(`SHOW COLUMNS FROM ${table}`);
      const existingNames = existingColumns.map(c => c.Field);

      for (const col of columns) {
        if (!existingNames.includes(col.name)) {
          console.log(`Adding ${col.name} to ${table}...`);
          await connection.query(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type}`);
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
