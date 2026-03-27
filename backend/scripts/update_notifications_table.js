const db = require('../config/db');

async function updateNotificationsTable() {
  try {
    console.log('Adding link and metadata columns to notifications table...');
    
    // Check if columns exist first
    const [columns] = await db.query('SHOW COLUMNS FROM notifications');
    const columnNames = columns.map(c => c.Field);
    
    if (!columnNames.includes('link')) {
      await db.query('ALTER TABLE notifications ADD COLUMN link VARCHAR(255)');
      console.log('Added link column');
    }
    
    if (!columnNames.includes('metadata')) {
      await db.query('ALTER TABLE notifications ADD COLUMN metadata JSON');
      console.log('Added metadata column');
    }
    
    console.log('Notifications table updated successfully');
    process.exit(0);
  } catch (error) {
    console.error('Failed to update notifications table:', error);
    process.exit(1);
  }
}

updateNotificationsTable();
