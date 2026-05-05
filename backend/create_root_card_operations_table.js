const db = require('./config/db');

async function createRootCardOperationsTable() {
  const connection = await db.getConnection();
  try {
    console.log('Creating root_card_operations table...');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS root_card_operations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        root_card_id VARCHAR(50) NOT NULL,
        operation_name VARCHAR(255) NOT NULL,
        operation_type ENUM('in_house', 'outsourced') DEFAULT 'in_house',
        phase INT DEFAULT 1,
        status ENUM('Pending', 'In Progress', 'Partially Completed', 'Completed', 'Delayed', 'On Hold') DEFAULT 'Pending',
        planned_start DATE,
        planned_end DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (root_card_id) REFERENCES root_cards(id) ON DELETE CASCADE
      )
    `);

    console.log('root_card_operations table created successfully.');
  } catch (error) {
    console.error('Error creating root_card_operations table:', error);
  } finally {
    connection.release();
    process.exit();
  }
}

createRootCardOperationsTable();
