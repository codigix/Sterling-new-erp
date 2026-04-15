const db = require('./config/db');

const addMoreDimensionsToProcurementTables = async () => {
  try {
    console.log('Adding additional dimension columns to quotation_items and purchase_order_items tables...');

    const tables = ['quotation_items', 'purchase_order_items'];
    const columns = [
      { name: 'side1', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'side2', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'web_thickness', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'flange_thickness', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'vendor_side1', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'vendor_side2', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'vendor_web_thickness', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'vendor_flange_thickness', type: 'DECIMAL(15, 4) DEFAULT 0' }
    ];

    for (const table of tables) {
      console.log(`Updating table: ${table}`);
      for (const col of columns) {
        try {
          await db.query(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type}`);
          console.log(`Column "${col.name}" added successfully to ${table}`);
        } catch (err) {
          if (err.code === 'ER_DUP_COLUMN_NAME') {
            console.log(`Column "${col.name}" already exists in ${table}`);
          } else {
            console.error(`Error adding column ${col.name} to ${table}:`, err);
            // Don't throw here, continue with other columns/tables
          }
        }
      }
    }

    console.log('Procurement tables migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Procurement tables migration failed:', error);
    process.exit(1);
  }
};

addMoreDimensionsToProcurementTables();
