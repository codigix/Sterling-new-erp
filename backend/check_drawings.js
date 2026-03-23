const db = require('./config/db');
async function run() {
  try {
    const [rows] = await db.query('SELECT * FROM design_documents');
    console.log('Total drawings:', rows.length);
    if (rows.length > 0) {
      console.log('Sample drawing:', rows[0]);
    }
    
    const [rcRows] = await db.query('SELECT id, project_name FROM root_cards');
    console.log('Total root cards:', rcRows.length);
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
run();
