const db = require('./config/db');

async function addWeightFields() {
  const connection = await db.getConnection();
  try {
    console.log('Adding weight calculation fields to bom_materials table...');

    const columnsToAdd = [
      { name: 'material_type', type: 'VARCHAR(100) NULL' },
      { name: 'density', type: 'DECIMAL(10, 4) DEFAULT 0' },
      { name: 'unit_weight', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'total_weight', type: 'DECIMAL(15, 4) DEFAULT 0' }
    ];

    for (const col of columnsToAdd) {
      try {
        await connection.query(`ALTER TABLE bom_materials ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Added column: ${col.name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME') {
          console.log(`Column ${col.name} already exists.`);
        } else {
          throw err;
        }
      }
    }

    console.log('Successfully updated bom_materials schema.');
  } catch (error) {
    console.error('Error updating bom_materials schema:', error);
  } finally {
    connection.release();
    process.exit();
  }
}

addWeightFields();
