const db = require('./config/db');

const addMoreDimensionsToMaterialRequestItems = async () => {
  try {
    console.log('Adding additional dimension columns to material_request_items table...');

    const columns = [
      { name: 'side1', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'side2', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'web_thickness', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'flange_thickness', type: 'DECIMAL(15, 4) DEFAULT 0' }
    ];

    for (const col of columns) {
      try {
        await db.query(`ALTER TABLE material_request_items ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Column "${col.name}" added successfully`);
      } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME') {
          console.log(`Column "${col.name}" already exists`);
        } else {
          throw err;
        }
      }
    }

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

addMoreDimensionsToMaterialRequestItems();
