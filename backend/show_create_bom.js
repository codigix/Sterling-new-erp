const db = require('./config/db');

async function test() {
  try {
    const [rows] = await db.query('SHOW CREATE TABLE boms');
    console.log(rows[0]['Create Table']);
  } catch (error) {
    console.error('FAILED:', error.message);
  } finally {
    process.exit();
  }
}

test();
