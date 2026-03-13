const db = require('./config/db');

const addDesignDocumentsTable = async () => {
  try {
    // Create design_documents table
    await db.query(`
      CREATE TABLE IF NOT EXISTS design_documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        root_card_id VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        type ENUM('Mechanical', 'Electrical', 'Assembly') NOT NULL,
        version INT DEFAULT 1,
        file_path VARCHAR(255) NOT NULL,
        description TEXT,
        status ENUM('Draft', 'Pending Review', 'Rejected', 'Approved') DEFAULT 'Pending Review',
        reviewer_id INT,
        reviewer_comment TEXT,
        created_by INT NOT NULL,
        parent_id INT, -- To link revisions to the original document
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (root_card_id) REFERENCES root_cards(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    
    // Self-referencing FK should be added separately if needed to ensure table existence
    await db.query(`
      ALTER TABLE design_documents 
      ADD CONSTRAINT fk_parent_id 
      FOREIGN KEY (parent_id) REFERENCES design_documents(id) ON DELETE CASCADE
    `).catch(err => {
      // Ignore if constraint already exists
      if (!err.message.includes('Duplicate constraint')) {
        console.warn('Constraint parent_id might already exist or failed:', err.message);
      }
    });
    
    console.log('design_documents table created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Failed to create design_documents table:', error.message);
    process.exit(1);
  }
};

addDesignDocumentsTable();
