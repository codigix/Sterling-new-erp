const db = require('./config/db');

async function check() {
  try {
    const [rows] = await db.query('SELECT public_id FROM boms LIMIT 1');
    console.log('Success:', rows);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

check();
