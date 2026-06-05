const db = require('./config/db');

async function createPasswordResetRequestsTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS password_reset_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      username VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      token VARCHAR(255) NULL UNIQUE,
      expires_at TIMESTAMP NULL,
      status ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED') DEFAULT 'PENDING',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await db.query(query);
    console.log("Table 'password_reset_requests' created successfully or already exists.");
    process.exit(0);
  } catch (error) {
    console.error("Error creating 'password_reset_requests' table:", error);
    process.exit(1);
  }
}

createPasswordResetRequestsTable();
