const pool = require('./backend/config/database');
(async () => {
  try {
    const [rows] = await pool.execute("SELECT * FROM department_tasks LIMIT 5");
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
