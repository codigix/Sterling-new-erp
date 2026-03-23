const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

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

// Test connection
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Successfully connected to sterling_db');
    connection.release();
  } catch (error) {
    console.error('Error connecting to database:', error.message);
  }
})();

module.exports = pool;
