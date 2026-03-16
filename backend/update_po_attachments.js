const db = require('./config/db');

const addPOAttachmentsTable = async () => {
    try {
        console.log('Creating Purchase Order Attachments table...');

        await db.query(`
            CREATE TABLE IF NOT EXISTS purchase_order_attachments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                purchase_order_id INT NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(255) NOT NULL,
                file_size INT,
                mime_type VARCHAR(100),
                uploaded_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
                FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log('Table "purchase_order_attachments" created or already exists');

        console.log('Setup completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Failed to update tables:', error);
        process.exit(1);
    }
};

addPOAttachmentsTable();
