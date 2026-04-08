const db = require('./config/db');

async function updateSchema() {
    try {
        console.log('Adding material_grade to inventory_serials...');
        
        try {
            await db.query(`ALTER TABLE inventory_serials ADD COLUMN material_grade VARCHAR(100) DEFAULT NULL`);
            console.log('- Added material_grade');
        } catch (e) {
            if (e.code === 'ER_DUP_COLUMN_NAME') {
                console.warn('- material_grade already exists, skipping...');
            } else {
                console.error('- Error adding material_grade:', e.message);
            }
        }
        
        console.log('Schema updated successfully');
        process.exit(0);
    } catch (error) {
        console.error('Update failed:', error);
        process.exit(1);
    }
}

updateSchema();
