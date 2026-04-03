const db = require('./config/db');

const updatePOTables = async () => {
  try {
    console.log('Updating PO tables...');
    
    const itemCols = [
      { name: 'vendor_length', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'vendor_width', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'vendor_thickness', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'vendor_diameter', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'vendor_outer_diameter', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'vendor_height', type: 'DECIMAL(15, 4) DEFAULT 0' }
    ];

    for (const col of itemCols) {
      const [existing] = await db.query(`SHOW COLUMNS FROM purchase_order_items LIKE '${col.name}'`);
      if (existing.length === 0) {
        await db.query(`ALTER TABLE purchase_order_items ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Added column ${col.name} to purchase_order_items`);
      } else {
        console.log(`Column ${col.name} already exists in purchase_order_items`);
      }
    }

    console.log('Update completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Update failed:', error);
    process.exit(1);
  }
};

updatePOTables();
