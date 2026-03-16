const db = require('./config/db');

const updateTables = async () => {
  try {
    console.log('Updating material request tables...');
    
    // Check if columns already exist to avoid errors
    const [columns] = await db.query("SHOW COLUMNS FROM material_request_items LIKE 'warehouse'");
    
    if (columns.length === 0) {
      await db.query(`
        ALTER TABLE material_request_items 
        ADD COLUMN warehouse VARCHAR(255), 
        ADD COLUMN operation VARCHAR(255)
      `);
      console.log('Added warehouse and operation columns to material_request_items');
    } else {
      console.log('Columns already exist in material_request_items');
    }

    // Update material_requests table to store snapshots
    const [mrColumns] = await db.query("SHOW COLUMNS FROM material_requests LIKE 'bom_number'");
    if (mrColumns.length === 0) {
      await db.query(`
        ALTER TABLE material_requests 
        ADD COLUMN bom_number VARCHAR(100),
        ADD COLUMN project_name VARCHAR(255),
        ADD COLUMN revision INT DEFAULT 0
      `);
      console.log('Added snapshot columns to material_requests');
    } else {
      console.log('Snapshot columns already exist in material_requests');
    }

    console.log('Update completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Update failed:', error);
    process.exit(1);
  }
};

updateTables();
