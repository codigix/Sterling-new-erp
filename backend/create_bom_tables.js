const db = require('./config/db');

const createBOMTables = async () => {
  try {
    console.log('Creating BOM tables...');

    // 1. Create boms table
    await db.query(`
      CREATE TABLE IF NOT EXISTS boms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        root_card_id VARCHAR(50) NOT NULL,
        bom_number VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        is_active BOOLEAN DEFAULT TRUE,
        project_id VARCHAR(50),
        total_cost DECIMAL(15, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (root_card_id) REFERENCES root_cards(id) ON DELETE CASCADE
      )
    `);
    console.log('Table "boms" created or already exists');

    // 2. Create bom_materials table
    await db.query(`
      CREATE TABLE IF NOT EXISTS bom_materials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bom_id INT NOT NULL,
        item_code VARCHAR(100),
        item_name VARCHAR(255) NOT NULL,
        item_group VARCHAR(100),
        material_grade VARCHAR(100),
        part_detail VARCHAR(255),
        remark TEXT,
        make VARCHAR(100),
        quantity DECIMAL(15, 4) DEFAULT 0,
        uom VARCHAR(50),
        rate DECIMAL(15, 2) DEFAULT 0,
        total_amount DECIMAL(15, 2) DEFAULT 0,
        FOREIGN KEY (bom_id) REFERENCES boms(id) ON DELETE CASCADE
      )
    `);
    console.log('Table "bom_materials" created or already exists');

    // 3. Create bom_operations table
    await db.query(`
      CREATE TABLE IF NOT EXISTS bom_operations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bom_id INT NOT NULL,
        operation_name VARCHAR(255) NOT NULL,
        workstation VARCHAR(255),
        cycle_time DECIMAL(15, 4) DEFAULT 0,
        setup_time DECIMAL(15, 4) DEFAULT 0,
        hourly_rate DECIMAL(15, 2) DEFAULT 0,
        cost DECIMAL(15, 2) DEFAULT 0,
        FOREIGN KEY (bom_id) REFERENCES boms(id) ON DELETE CASCADE
      )
    `);
    console.log('Table "bom_operations" created or already exists');

    console.log('BOM tables setup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Failed to create BOM tables:', error);
    process.exit(1);
  }
};

createBOMTables();
