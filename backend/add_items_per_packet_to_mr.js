const db = require('./config/db');

const addItemsPerPacketToMR = async () => {
  try {
    console.log('Adding items_per_packet column to material_request_items table...');
    
    // Check if column already exists
    const [columns] = await db.query("SHOW COLUMNS FROM material_request_items LIKE 'items_per_packet'");
    
    if (columns.length === 0) {
      await db.query(`
        ALTER TABLE material_request_items 
        ADD COLUMN items_per_packet DECIMAL(15, 4) DEFAULT 1
      `);
      console.log('Added items_per_packet column to material_request_items');
    } else {
      console.log('Column items_per_packet already exists in material_request_items');
    }

    console.log('Update completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Update failed:', error);
    process.exit(1);
  }
};

addItemsPerPacketToMR();
