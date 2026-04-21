const db = require('./config/db');

const addQapColumn = async () => {
  try {
    await db.query(`ALTER TABLE root_cards ADD COLUMN qap_path VARCHAR(255) AFTER project_scope`);
    console.log('Added qap_path column to root_cards table');
    process.exit(0);
  } catch (error) {
    if (error.code === 'ER_DUP_COLUMN_NAME') {
      console.log('qap_path column already exists');
      process.exit(0);
    }
    console.error('Error adding qap_path column:', error);
    process.exit(1);
  }
};

addQapColumn();
