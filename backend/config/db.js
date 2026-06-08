const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z', // Force UTC to avoid timezone mismatch between DB and JS
  dateStrings: false
});

// Test connection & ensure timelines column exists
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`Successfully connected to ${process.env.DB_NAME}`);
    
    // Check if timelines column exists
    const [columns] = await connection.query("SHOW COLUMNS FROM root_cards LIKE 'timelines'");
    if (columns.length === 0) {
      await connection.query("ALTER TABLE root_cards ADD COLUMN timelines JSON DEFAULT NULL");
      console.log("Added 'timelines' column to 'root_cards' table.");
    }
    
    connection.release();
  } catch (error) {
    console.error('Error connecting or running schema update:', error.message);
  }
})();

module.exports = pool;
