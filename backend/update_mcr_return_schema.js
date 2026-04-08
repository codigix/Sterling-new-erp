const db = require('./config/db');

async function updateSchema() {
    try {
        console.log('Updating material_cutting_report_items table for off-cut returns...');
        
        const columns = [
            'ADD COLUMN return_to_stock TINYINT(1) DEFAULT 0',
            'ADD COLUMN return_l DECIMAL(15, 4) DEFAULT 0.0000',
            'ADD COLUMN return_w DECIMAL(15, 4) DEFAULT 0.0000',
            'ADD COLUMN return_t DECIMAL(15, 4) DEFAULT 0.0000'
        ];

        for (const column of columns) {
            try {
                const columnName = column.split(' ')[2];
                await db.query(`ALTER TABLE material_cutting_report_items ${column}`);
                console.log(`- Added ${columnName}`);
            } catch (e) {
                if (e.code === 'ER_DUP_COLUMN_NAME') {
                    console.warn(`- Column ${column.split(' ')[2]} already exists, skipping...`);
                } else {
                    console.error(`- Error adding column: ${e.message}`);
                }
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
