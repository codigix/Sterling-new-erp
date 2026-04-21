const db = require('./config/db');

const createDepartmentTasksTable = async () => {
  try {
    console.log('Creating department_tasks table...');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS department_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        department_id INT NOT NULL,
        priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
        assignment_date DATE NOT NULL,
        due_date DATE NOT NULL,
        status ENUM('Pending', 'In Progress', 'Completed') DEFAULT 'Pending',
        assigned_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    console.log('department_tasks table created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating department_tasks table:', error.message);
    process.exit(1);
  }
};

createDepartmentTasksTable();
