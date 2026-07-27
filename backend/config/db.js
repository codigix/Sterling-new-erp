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

// Test connection & ensure timelines column and project_documents table exist
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

    // Ensure email column in users table is nullable
    const [userColumns] = await connection.query("SHOW COLUMNS FROM users LIKE 'email'");
    if (userColumns.length > 0 && userColumns[0].Null === 'NO') {
      await connection.query("ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NULL DEFAULT NULL");
      console.log("Updated 'email' column in 'users' table to be nullable.");
    }

    // Check/Create project_documents table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS project_documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id VARCHAR(50) NOT NULL,
        document_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        uploaded_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES root_cards(id) ON DELETE CASCADE
      )
    `);
    console.log("Verified/Created 'project_documents' table.");

    // Verify department_tasks table and task_code column
    const [tasksTableExists] = await connection.query("SHOW TABLES LIKE 'department_tasks'");
    if (tasksTableExists.length > 0) {
      const [taskCodeColumns] = await connection.query("SHOW COLUMNS FROM department_tasks LIKE 'task_code'");
      if (taskCodeColumns.length === 0) {
        await connection.query("ALTER TABLE department_tasks ADD COLUMN task_code VARCHAR(50) DEFAULT NULL");
        console.log("Added 'task_code' column to 'department_tasks' table.");
      }

      // Convert any existing Task-20XX-YY-ZZZ task_codes to Task-XX/YY-ZZZ format
      const [allTasks] = await connection.query("SELECT id, task_code FROM department_tasks WHERE task_code LIKE 'Task-20%'");
      if (allTasks.length > 0) {
        console.log(`Reformatting task_code for ${allTasks.length} tasks to Task-XX/YY-ZZZ...`);
        for (const t of allTasks) {
          const match = t.task_code.match(/^Task-20(\d{2})-(\d{2})-(\d{3})$/);
          if (match) {
            const newCode = `Task-${match[1]}/${match[2]}-${match[3]}`;
            await connection.query("UPDATE department_tasks SET task_code = ? WHERE id = ?", [newCode, t.id]);
          }
        }
        console.log("Reformatting complete.");
      }

      // Backfill task_code for existing tasks if NULL
      const [nullTasks] = await connection.query("SELECT id, assignment_date FROM department_tasks WHERE task_code IS NULL ORDER BY id ASC");
      if (nullTasks.length > 0) {
        console.log(`Backfilling task_code for ${nullTasks.length} tasks...`);
        for (const t of nullTasks) {
          const d = new Date(t.assignment_date);
          const month = d.getMonth() + 1;
          const year = d.getFullYear();
          let startYear = month >= 4 ? year : year - 1;
          let startYearShort = String(startYear).slice(-2);
          let endYearShort = String(startYear + 1).slice(-2);
          const financialYear = `${startYearShort}/${endYearShort}`;
          
          const [lastTask] = await connection.query(
            "SELECT task_code FROM department_tasks WHERE task_code LIKE ? ORDER BY id DESC LIMIT 1",
            [`Task-${financialYear}-%`]
          );
          let nextSerial = 1;
          if (lastTask.length > 0 && lastTask[0].task_code) {
            const parts = lastTask[0].task_code.split('-');
            const lastSerial = parseInt(parts[parts.length - 1]);
            if (!isNaN(lastSerial)) {
              nextSerial = lastSerial + 1;
            }
          }
          const taskCode = `Task-${financialYear}-${String(nextSerial).padStart(3, '0')}`;
          await connection.query("UPDATE department_tasks SET task_code = ? WHERE id = ?", [taskCode, t.id]);
        }
        console.log("Backfill complete.");
      }
    }
    
    connection.release();
  } catch (error) {
    console.error('Error connecting or running schema update:', error.message);
  }
})();

module.exports = pool;
