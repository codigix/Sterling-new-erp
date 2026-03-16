const db = require('./config/db');

const updateTables = async () => {
  try {
    console.log('Updating quotation tables...');
    
    const columnsToAdd = [
      { name: 'item_group', type: 'VARCHAR(100)' },
      { name: 'material_grade', type: 'VARCHAR(100)' },
      { name: 'part_detail', type: 'VARCHAR(255)' },
      { name: 'make', type: 'VARCHAR(100)' },
      { name: 'remark', type: 'TEXT' }
    ];

    for (const col of columnsToAdd) {
      const [existing] = await db.query(`SHOW COLUMNS FROM quotation_items LIKE '${col.name}'`);
      if (existing.length === 0) {
        await db.query(`ALTER TABLE quotation_items ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Added column ${col.name} to quotation_items`);
      } else {
        console.log(`Column ${col.name} already exists in quotation_items`);
      }
    }

    console.log('Update completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Update failed:', error);
    process.exit(1);
  }
};

updateTables();
