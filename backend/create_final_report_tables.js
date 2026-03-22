const db = require('./config/db');

const createFinalReportTables = async () => {
    try {
        console.log('Creating Quality Final Report tables...');

        await db.query(`
            CREATE TABLE IF NOT EXISTS quality_final_reports (
                id INT AUTO_INCREMENT PRIMARY KEY,
                grn_id INT NOT NULL,
                grn_number VARCHAR(100),
                project_name VARCHAR(255),
                vendor_name VARCHAR(255),
                inspection_type VARCHAR(50),
                received_date DATE,
                report_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (grn_id) REFERENCES grns(id)
            )
        `);
        console.log('- Created quality_final_reports table');

        await db.query(`
            CREATE TABLE IF NOT EXISTS quality_final_report_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                report_id INT NOT NULL,
                material_name VARCHAR(255),
                item_code VARCHAR(100),
                item_group VARCHAR(255),
                material_id INT,
                received_qty DECIMAL(15, 3),
                unit VARCHAR(50),
                accepted_qty INT,
                rejected_qty INT,
                accepted_report VARCHAR(255),
                rejected_report VARCHAR(255),
                FOREIGN KEY (report_id) REFERENCES quality_final_reports(id) ON DELETE CASCADE
            )
        `);
        console.log('- Created quality_final_report_items table');

        await db.query(`
            CREATE TABLE IF NOT EXISTS quality_final_report_st_numbers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                report_item_id INT NOT NULL,
                st_code VARCHAR(100),
                item_code VARCHAR(100),
                status ENUM('ACCEPTED', 'REJECTED', 'PENDING'),
                FOREIGN KEY (report_item_id) REFERENCES quality_final_report_items(id) ON DELETE CASCADE
            )
        `);
        console.log('- Created quality_final_report_st_numbers table');

        console.log('Quality Final Report tables created successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error creating Final Report tables:', error.message);
        process.exit(1);
    }
};

createFinalReportTables();