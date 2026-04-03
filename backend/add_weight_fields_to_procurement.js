const db = require('./config/db');

async function addWeightFieldsToProcurement() {
  const connection = await db.getConnection();
  try {
    console.log('Adding weight calculation fields to procurement related tables...');

    const tables = [
      'material_request_items',
      'quotation_items',
      'purchase_order_items',
      'grn_items'
    ];

    const columnsToAdd = [
      { name: 'material_type', type: 'VARCHAR(100) NULL' },
      { name: 'density', type: 'DECIMAL(10, 4) DEFAULT 0' },
      { name: 'unit_weight', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'total_weight', type: 'DECIMAL(15, 4) DEFAULT 0' }
    ];

    for (const table of tables) {
      console.log(`Updating table: ${table}`);
      for (const col of columnsToAdd) {
        try {
          await connection.query(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type}`);
          console.log(`Added column: ${col.name} to ${table}`);
        } catch (err) {
          if (err.code === 'ER_DUP_COLUMN_NAME' || err.code === 'ER_DUP_FIELDNAME') {
            console.log(`Column ${col.name} already exists in ${table}.`);
          } else {
            console.error(`Error adding ${col.name} to ${table}:`, err.message);
          }
        }
      }
    }

    console.log('Successfully updated procurement schema.');
  } catch (error) {
    console.error('Error updating procurement schema:', error);
  } finally {
    connection.release();
    process.exit();
  }
}

addWeightFieldsToProcurement();
