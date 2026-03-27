const db = require('./backend/config/db');
async function check() {
  try {
    const [rows] = await db.query('SELECT id, project_name, status FROM root_cards');
    rows.forEach(r => console.log(`ID: "${r.id}", Length: ${r.id.length}`));
    console.log(JSON.stringify(rows, null, 2));
    const [docs] = await db.query('SELECT id, root_card_id, name, status FROM design_documents');
    console.log('--- DESIGN DOCUMENTS ---');
    console.log(JSON.stringify(docs, null, 2));
    const [users] = await db.query('SELECT id, full_name, email, department, role FROM users');
    console.log('--- USERS ---');
    console.log(JSON.stringify(users, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
