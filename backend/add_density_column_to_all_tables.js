const db = require('./config/db');

async function addDensityColumnToAllTables() {
  const connection = await db.getConnection();
  try {
    console.log('Adding density field to all relevant tables...');

    const tables = [
      'inventory_serials',
      'stock_entry_items',
      'stock_ledger',
      'quality_final_report_items',
      'quality_final_report_st_numbers'
    ];

    const columnToAdd = { name: 'density', type: 'DECIMAL(10, 4) DEFAULT 0' };

    for (const table of tables) {
      console.log(`Updating table: ${table}`);
      try {
        await connection.query(`ALTER TABLE ${table} ADD COLUMN ${columnToAdd.name} ${columnToAdd.type}`);
        console.log(`Added column: ${columnToAdd.name} to ${table}`);
      } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME' || err.code === 'ER_DUP_FIELDNAME') {
          console.log(`Column ${columnToAdd.name} already exists in ${table}.`);
        } else {
          console.error(`Error adding ${columnToAdd.name} to ${table}:`, err.message);
        }
      }
    }

    console.log('Successfully updated all tables with density field.');
  } catch (error) {
    console.error('Error updating schema:', error);
  } finally {
    connection.release();
    process.exit();
  }
}

addDensityColumnToAllTables();
