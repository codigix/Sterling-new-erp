const db = require('./config/db');

async function checkSchema() {
  try {
    const [rows] = await db.query('DESCRIBE root_cards');
    console.log(rows);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSchema();
