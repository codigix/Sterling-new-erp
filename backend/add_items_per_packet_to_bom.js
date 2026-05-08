const db = require('./config/db');

const addItemsPerPacket = async () => {
  try {
    console.log('Adding items_per_packet column to bom_materials table...');
    
    // Check if column already exists
    const [columns] = await db.query("SHOW COLUMNS FROM bom_materials LIKE 'items_per_packet'");
    
    if (columns.length === 0) {
      await db.query(`
        ALTER TABLE bom_materials 
        ADD COLUMN items_per_packet DECIMAL(15, 4) DEFAULT 1
      `);
      console.log('Added items_per_packet column to bom_materials');
    } else {
      console.log('Column items_per_packet already exists in bom_materials');
    }

    console.log('Update completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Update failed:', error);
    process.exit(1);
  }
};

addItemsPerPacket();
