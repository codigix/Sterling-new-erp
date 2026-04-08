const db = require('./config/db');

async function fixTable() {
    try {
        console.log('--- Fixing MCR Items Table ---');
        
        try {
            await db.query('ALTER TABLE material_cutting_report_items ADD COLUMN item_group VARCHAR(100)');
            console.log('✓ item_group added');
        } catch (e) {
            console.log('i item_group probably exists');
        }

        try {
            await db.query('ALTER TABLE material_cutting_report_items ADD COLUMN material_grade VARCHAR(100)');
            console.log('✓ material_grade added');
        } catch (e) {
            console.log('i material_grade probably exists');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error fixing MCR table:', error);
        process.exit(1);
    }
}

fixTable();
