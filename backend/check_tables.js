const db = require('./config/db');

const checkTables = async () => {
  try {
    const [tables] = await db.query('SHOW TABLES');
    console.log('Tables in database:', tables.map(t => Object.values(t)[0]));
    
    const [columnsPO] = await db.query('SHOW COLUMNS FROM purchase_order_items');
    console.log('Columns in purchase_order_items:', columnsPO.map(c => c.Field));
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking tables:', error.message);
    process.exit(1);
  }
};

checkTables();
