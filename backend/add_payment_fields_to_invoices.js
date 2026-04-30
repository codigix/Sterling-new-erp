const db = require('./config/db');

const addPaymentFields = async () => {
    try {
        console.log('Adding paid_amount and balance_amount to vendor_invoices...');

        await db.query(`
            ALTER TABLE vendor_invoices 
            ADD COLUMN paid_amount DECIMAL(15, 2) DEFAULT 0 AFTER grand_total,
            ADD COLUMN balance_amount DECIMAL(15, 2) DEFAULT 0 AFTER paid_amount
        `);

        // Initialize balance_amount to grand_total for existing records
        await db.query(`
            UPDATE vendor_invoices SET balance_amount = grand_total - paid_amount
        `);

        console.log('Payment fields added successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error adding payment fields:', error.message);
        process.exit(1);
    }
};

addPaymentFields();
