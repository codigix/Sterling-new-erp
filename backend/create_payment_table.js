const db = require('./config/db');

const createPaymentTable = async () => {
    try {
        console.log('Creating vendor_payments table...');

        await db.query(`
            CREATE TABLE IF NOT EXISTS vendor_payments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                payment_number VARCHAR(100) NOT NULL UNIQUE,
                invoice_id INT NOT NULL,
                vendor_id INT NOT NULL,
                payment_date DATE NOT NULL,
                amount_paid DECIMAL(15, 2) NOT NULL,
                payment_method ENUM('Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Other') DEFAULT 'Bank Transfer',
                reference_number VARCHAR(100),
                status ENUM('PENDING', 'COMPLETED', 'CANCELLED') DEFAULT 'COMPLETED',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (invoice_id) REFERENCES vendor_invoices(id),
                FOREIGN KEY (vendor_id) REFERENCES vendors(id)
            )
        `);

        console.log('Payment table created successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error creating payment table:', error.message);
        process.exit(1);
    }
};

createPaymentTable();
