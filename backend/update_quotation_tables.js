const db = require('./config/db');

const updateTables = async () => {
  try {
    console.log('Updating quotation tables...');
    
    // 1. Update quotations table
    const quotationsCols = [
      { name: 'rfq_id', type: 'INT' }
    ];

    for (const col of quotationsCols) {
      const [existing] = await db.query(`SHOW COLUMNS FROM quotations LIKE '${col.name}'`);
      if (existing.length === 0) {
        await db.query(`ALTER TABLE quotations ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Added column ${col.name} to quotations`);
      }
    }

    // 2. Update quotation_items table
    const itemCols = [
      { name: 'item_group', type: 'VARCHAR(100)' },
      { name: 'material_grade', type: 'VARCHAR(100)' },
      { name: 'part_detail', type: 'VARCHAR(255)' },
      { name: 'make', type: 'VARCHAR(100)' },
      { name: 'remark', type: 'TEXT' },
      { name: 'length', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'width', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'thickness', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'diameter', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'outer_diameter', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'height', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'material_type', type: 'VARCHAR(100)' },
      { name: 'density', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'unit_weight', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'vendor_length', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'vendor_width', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'vendor_thickness', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'vendor_diameter', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'vendor_outer_diameter', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'vendor_height', type: 'DECIMAL(15, 4) DEFAULT 0' }
    ];

    for (const col of itemCols) {
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
