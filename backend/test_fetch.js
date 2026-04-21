const db = require('./config/db');

async function testFetch() {
  try {
    const statuses = ['Released', 'Production', 'Partially Completed', 'MATERIAL_PLANNING', 'PURCHASE_ORDER_RELEASED'];
    const [rows] = await db.query('SELECT rc.* FROM root_cards rc WHERE rc.status IN (?)', [statuses]);
    console.log('Results with new filter:', rows.length);
    console.log(rows.map(r => ({id: r.id, name: r.project_name, status: r.status})));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testFetch();
