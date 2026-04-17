const db = require('./config/db');

async function createProductionPlanningTables() {
  const connection = await db.getConnection();
  try {
    console.log('Creating production planning tables...');
    
    // 1. Daily Production Plans (Header table)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS daily_production_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        plan_date DATE NOT NULL,
        created_by INT,
        status ENUM('Draft', 'Finalized', 'In Progress', 'Completed') DEFAULT 'Draft',
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_date (plan_date)
      )
    `);

    // 2. Daily Operator Assignments (Inside each daily plan)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS daily_operator_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        plan_id INT NOT NULL,
        root_card_id VARCHAR(50),
        operation_id INT,
        operation_name VARCHAR(255),
        assignment_type ENUM('inhouse', 'outsource') DEFAULT 'inhouse',
        operator_name VARCHAR(255),
        operator_id INT,
        vendor_name VARCHAR(255),
        vendor_id INT,
        start_time TIME,
        end_time TIME,
        break_time INT DEFAULT 0,
        total_hours DECIMAL(5,2),
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (plan_id) REFERENCES daily_production_plans(id) ON DELETE CASCADE
      )
    `);

    // 3. Daily Production Updates (Actual execution)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS daily_production_updates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        work_date DATE NOT NULL,
        plan_id INT,
        assignment_id INT,
        root_card_id VARCHAR(50),
        operation_id INT,
        operation_name VARCHAR(255),
        assignment_type ENUM('inhouse', 'outsource') DEFAULT 'inhouse',
        operator_name VARCHAR(255),
        operator_id INT,
        vendor_name VARCHAR(255),
        vendor_id INT,
        actual_start TIME,
        actual_end TIME,
        break_time INT DEFAULT 0,
        actual_hours DECIMAL(5,2),
        qty_completed DECIMAL(10,2) DEFAULT 0,
        pending_qty DECIMAL(10,2) DEFAULT 0,
        rework_qty DECIMAL(10,2) DEFAULT 0,
        scrap_qty DECIMAL(10,2) DEFAULT 0,
        status ENUM('Pending', 'In Progress', 'Partially Completed', 'Completed', 'Delayed', 'On Hold') DEFAULT 'Pending',
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (plan_id) REFERENCES daily_production_plans(id) ON DELETE SET NULL,
        FOREIGN KEY (assignment_id) REFERENCES daily_operator_assignments(id) ON DELETE SET NULL
      )
    `);

    console.log('Production planning tables created successfully.');
  } catch (error) {
    console.error('Error creating production planning tables:', error);
  } finally {
    connection.release();
    process.exit();
  }
}

createProductionPlanningTables();
