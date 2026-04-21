const db = require('./config/db');

async function checkQuotations() {
  try {
    const [rows] = await db.query('DESCRIBE quotations');
    console.log(rows);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkQuotations();
