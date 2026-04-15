const db = require('./config/db');

const migrateSideDimensions = async () => {
  try {
    console.log('Adding side_s, side_s1, side_s2 to bom_materials table...');

    const columns = [
      { name: 'side_s', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'side_s1', type: 'DECIMAL(15, 4) DEFAULT 0' },
      { name: 'side_s2', type: 'DECIMAL(15, 4) DEFAULT 0' }
    ];

    for (const col of columns) {
      try {
        await db.query(`ALTER TABLE bom_materials ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Column "${col.name}" added successfully`);
      } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME') {
          console.log(`Column "${col.name}" already exists`);
        } else {
          throw err;
        }
      }
    }

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrateSideDimensions();
