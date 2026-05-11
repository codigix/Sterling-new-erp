const db = require('./config/db');

async function test() {
  try {
    const bomId = '52';
    console.log(`Testing with bomId: ${bomId}`);
    
    const [bomRows] = await db.query(`
      SELECT b.*, rc.project_name, rc.project_code, rc.po_number, rc.quantity
      FROM boms b
      JOIN root_cards rc ON b.root_card_id = rc.id
      WHERE b.id = ? OR b.public_id = ?
    `, [bomId, bomId]);

    console.log('Success!', bomRows.length);
  } catch (error) {
    console.error('FAILED:', error.message);
  } finally {
    process.exit();
  }
}

test();
