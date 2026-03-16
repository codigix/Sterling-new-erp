const db = require('./config/db');

const updateTables = async () => {
  try {
    console.log('Updating bom_materials table...');
    
    // Check if columns already exist
    const [columns] = await db.query("SHOW COLUMNS FROM bom_materials LIKE 'warehouse'");
    
    if (columns.length === 0) {
      await db.query(`
        ALTER TABLE bom_materials 
        ADD COLUMN warehouse VARCHAR(255), 
        ADD COLUMN operation VARCHAR(255)
      `);
      console.log('Added warehouse and operation columns to bom_materials');
    } else {
      console.log('Columns already exist in bom_materials');
    }

    console.log('Update completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Update failed:', error);
    process.exit(1);
  }
};

updateTables();
