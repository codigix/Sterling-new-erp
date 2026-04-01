const db = require('./config/db');

async function createOperationsTable() {
  const connection = await db.getConnection();
  try {
    console.log('Creating operations table...');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS operations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type ENUM('In-house', 'Outsource') DEFAULT 'In-house',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('Operations table created successfully.');
  } catch (error) {
    console.error('Error creating operations table:', error);
  } finally {
    connection.release();
    process.exit();
  }
}

createOperationsTable();
