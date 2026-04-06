const db = require('./config/db');

async function updateSchema() {
    try {
        console.log('Updating purchase_receipt_items table...');
        
        // Add received_weight to purchase_receipt_items
        try {
            await db.query(`ALTER TABLE purchase_receipt_items ADD COLUMN received_weight DECIMAL(15, 4) DEFAULT 0.0000 AFTER received_qty`);
            console.log('- Added received_weight');
        } catch (e) {
            console.warn('- received_weight already exists or error:', e.message);
        }

        try {
            await db.query(`ALTER TABLE purchase_receipt_items ADD COLUMN rate_per_kg DECIMAL(15, 2) DEFAULT 0.00 AFTER received_weight`);
            console.log('- Added rate_per_kg');
        } catch (e) {
            console.warn('- rate_per_kg already exists or error:', e.message);
        }
        
        // Add unit_weight and total_weight to purchase_receipt_items
        try {
            await db.query(`ALTER TABLE purchase_receipt_items ADD COLUMN unit_weight DECIMAL(15, 4) DEFAULT 0.0000`);
            console.log('- Added unit_weight to purchase_receipt_items');
        } catch (e) {
            console.warn('- unit_weight already exists or error:', e.message);
        }

        try {
            await db.query(`ALTER TABLE purchase_receipt_items ADD COLUMN total_weight DECIMAL(15, 4) DEFAULT 0.0000`);
            console.log('- Added total_weight to purchase_receipt_items');
        } catch (e) {
            console.warn('- total_weight already exists or error:', e.message);
        }

        // Add to grn_items too if it exists
        try {
            await db.query(`ALTER TABLE grn_items ADD COLUMN unit_weight DECIMAL(15, 4) DEFAULT 0.0000`);
            console.log('- Added unit_weight to grn_items');
        } catch (e) {
            console.warn('- unit_weight already exists in grn_items or error:', e.message);
        }

        try {
            await db.query(`ALTER TABLE grn_items ADD COLUMN total_weight DECIMAL(15, 4) DEFAULT 0.0000`);
            console.log('- Added total_weight to grn_items');
        } catch (e) {
            console.warn('- total_weight already exists in grn_items or error:', e.message);
        }
        
        console.log('Schema updated successfully');
        process.exit(0);
    } catch (error) {
        console.error('Update failed:', error);
        process.exit(1);
    }
}

updateSchema();
