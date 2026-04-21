const db = require('./config/db');

async function checkProjects() {
  try {
    const [rows] = await db.query('SELECT id, project_name, status FROM root_cards');
    console.log('--- ROOT CARDS ---');
    console.log(rows);
    console.log('--- STATUS COUNTS ---');
    const counts = rows.reduce((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {});
    console.log(counts);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkProjects();
