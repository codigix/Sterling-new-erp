const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function update() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('Populating public_id...');
    const [rows] = await connection.query('SELECT id FROM root_cards WHERE public_id IS NULL OR public_id = ""');
    console.log(`Found ${rows.length} records to update.`);

    const { v4: uuidv4 } = require('uuid');
    for (const row of rows) {
      const publicId = uuidv4();
      console.log(`Updating ${row.id} with ${publicId}`);
      await connection.query('UPDATE root_cards SET public_id = ? WHERE id = ?', [publicId, row.id]);
    }

    console.log('Done.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

update();
