const db = require('./config/db');

const fixDatabase = async () => {
  try {
    console.log('Ensuring is_read column exists...');
    
    // Check if column exists
    const [columns] = await db.query('SHOW COLUMNS FROM quotation_communications LIKE "is_read"');
    
    if (columns.length === 0) {
      await db.query('ALTER TABLE quotation_communications ADD COLUMN is_read BOOLEAN DEFAULT FALSE');
      console.log('Column is_read added successfully.');
    } else {
      console.log('Column is_read already exists.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Database Fix Error:', error.message);
    process.exit(1);
  }
};

fixDatabase();
