const db = require('./backend/config/db');
async function checkTasks() {
  try {
    const [rows] = await db.query('SELECT * FROM department_tasks');
    console.log('All departmental tasks:', rows);
    const [users] = await db.query('SELECT id, full_name, department, department_id FROM users');
    console.log('Users and their departments:', users);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkTasks();
