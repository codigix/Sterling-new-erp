const db = require('./config/db');

async function checkUsers() {
  try {
    const [rows] = await db.query('SELECT DISTINCT role FROM users');
    console.log('Roles in DB:', rows);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUsers();
