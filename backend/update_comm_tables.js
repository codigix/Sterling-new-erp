const db = require('./config/db');

const addQuotationAttachmentsTable = async () => {
    try {
        console.log('Creating Quotation Communication Attachments table...');

        await db.query(`
            CREATE TABLE IF NOT EXISTS quotation_communication_attachments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                communication_id INT NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(255) NOT NULL,
                file_size INT,
                mime_type VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (communication_id) REFERENCES quotation_communications(id) ON DELETE CASCADE
            )
        `);
        console.log('Table "quotation_communication_attachments" created or already exists');

        // Also add is_read to quotation_communications if it doesn't exist
        try {
            await db.query('ALTER TABLE quotation_communications ADD COLUMN is_read BOOLEAN DEFAULT FALSE');
            console.log('Added is_read column to quotation_communications');
        } catch (err) {
            // Probably already exists
        }

        console.log('Setup completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Failed to update tables:', error);
        process.exit(1);
    }
};

addQuotationAttachmentsTable();
