const db = require('./config/db');

async function updateSchema() {
    try {
        console.log('Updating material_requests table...');
        
        // Add type column to material_requests
        try {
            await db.query(`ALTER TABLE material_requests ADD COLUMN type VARCHAR(50) DEFAULT 'production' AFTER remarks`);
            console.log('- Added type column to material_requests');
        } catch (e) {
            console.warn('- type column already exists or error:', e.message);
        }

        console.log('Schema updated successfully');
        process.exit(0);
    } catch (error) {
        console.error('Update failed:', error);
        process.exit(1);
    }
}

updateSchema();
