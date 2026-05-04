require('dotenv').config({ path: './.env' });
const db = require("./backend/config/db");

const createLedgerTables = async () => {
  try {
    console.log("Creating ledger tables...");

    await db.query(`
      CREATE TABLE IF NOT EXISTS ledger_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        reference_no VARCHAR(50) NOT NULL,
        description TEXT,
        account_name VARCHAR(100) NOT NULL,
        debit DECIMAL(15, 2) DEFAULT 0.00,
        credit DECIMAL(15, 2) DEFAULT 0.00,
        transaction_type ENUM('PAYMENT_MADE', 'PAYMENT_RECEIVED', 'JOURNAL', 'INVOICE') NOT NULL,
        related_id INT, -- ID of the payment or invoice
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("Ledger tables created successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error creating ledger tables:", error);
    process.exit(1);
  }
};

createLedgerTables();
