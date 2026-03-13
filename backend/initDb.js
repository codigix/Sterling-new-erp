const db = require('./config/db');

const initDb = async () => {
  try {
    // Drop tables if they exist (for a fresh start)
    await db.query(`DROP TABLE IF EXISTS notifications`);
    await db.query(`DROP TABLE IF EXISTS root_card_steps`);
    await db.query(`DROP TABLE IF EXISTS root_cards`);
    await db.query(`DROP TABLE IF EXISTS users`);
    
    // Create users table
    await db.query(`
      CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        department VARCHAR(50) DEFAULT 'Production',
        role VARCHAR(50) DEFAULT 'employee',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create root_cards table
    await db.query(`
      CREATE TABLE root_cards (
        id VARCHAR(50) PRIMARY KEY,
        po_number VARCHAR(100) NOT NULL UNIQUE,
        po_date DATE,
        project_name VARCHAR(255) NOT NULL,
        project_code VARCHAR(100),
        quantity INT DEFAULT 1,
        delivery_date DATE,
        total DECIMAL(15, 2),
        currency VARCHAR(10) DEFAULT 'INR',
        priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
        status VARCHAR(50) DEFAULT 'RC_CREATED',
        inspection VARCHAR(255),
        inspection_authority VARCHAR(255),
        ld TEXT,
        items JSON,
        documents JSON,
        notes TEXT,
        project_scope JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create root_card_steps table to store detailed step data
    await db.query(`
      CREATE TABLE root_card_steps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        root_card_id VARCHAR(50) NOT NULL,
        step_key VARCHAR(50) NOT NULL,
        step_data JSON,
        assigned_to INT,
        status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (root_card_id) REFERENCES root_cards(id) ON DELETE CASCADE,
        UNIQUE KEY unique_step (root_card_id, step_key)
      )
    `);

    // Create notifications table
    await db.query(`
      CREATE TABLE notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        department VARCHAR(50),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        read_status BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    console.log('Database tables initialized successfully');
    process.exit(0);
  } catch (error) {
    console.error('Failed to initialize database:', error.message);
    process.exit(1);
  }
};

initDb();
