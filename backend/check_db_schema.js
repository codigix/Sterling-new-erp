const db = require('./config/db');

async function check() {
  try {
    const [columns] = await db.query('SHOW COLUMNS FROM boms');
    console.log(JSON.stringify(columns, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

check();
