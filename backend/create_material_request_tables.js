const db = require('./config/db');

const createMaterialRequestTables = async () => {
  try {
    console.log('Creating Material Request tables...');

    // 1. Create material_requests table
    await db.query(`
      CREATE TABLE IF NOT EXISTS material_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bom_id INT NOT NULL,
        request_number VARCHAR(100) NOT NULL UNIQUE,
        status VARCHAR(50) DEFAULT 'pending', -- pending, approved, partially_received, received, cancelled
        department VARCHAR(100) DEFAULT 'Production',
        project_id VARCHAR(50),
        root_card_id VARCHAR(50),
        created_by INT,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (bom_id) REFERENCES boms(id) ON DELETE CASCADE,
        FOREIGN KEY (root_card_id) REFERENCES root_cards(id) ON DELETE SET NULL
      )
    `);
    console.log('Table "material_requests" created or already exists');

    // 2. Create material_request_items table
    await db.query(`
      CREATE TABLE IF NOT EXISTS material_request_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        material_request_id INT NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        item_group VARCHAR(100),
        material_grade VARCHAR(100),
        part_detail VARCHAR(255),
        make VARCHAR(100),
        required_quantity DECIMAL(15, 4) DEFAULT 0,
        uom VARCHAR(50),
        remark TEXT,
        received_quantity DECIMAL(15, 4) DEFAULT 0,
        FOREIGN KEY (material_request_id) REFERENCES material_requests(id) ON DELETE CASCADE
      )
    `);
    console.log('Table "material_request_items" created or already exists');

    console.log('Material Request tables setup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Failed to create Material Request tables:', error);
    process.exit(1);
  }
};

createMaterialRequestTables();
