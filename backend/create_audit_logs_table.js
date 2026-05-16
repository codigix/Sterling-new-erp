const db = require('./config/db');

async function createAuditLogsTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_name VARCHAR(255) NOT NULL,
      action VARCHAR(255) NOT NULL,
      type ENUM('auth', 'admin', 'export', 'account', 'security', 'system') NOT NULL,
      details TEXT,
      ip_address VARCHAR(45),
      status ENUM('success', 'warning', 'error') DEFAULT 'success',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await db.query(query);
    console.log("Table 'audit_logs' created successfully or already exists.");
    process.exit(0);
  } catch (error) {
    console.error("Error creating 'audit_logs' table:", error);
    process.exit(1);
  }
}

createAuditLogsTable();
