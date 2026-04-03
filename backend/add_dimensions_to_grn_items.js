const db = require('./config/db');

const addDimensionsToGrnItems = async () => {
    try {
        console.log('Adding dimensions to grn_items table...');

        const columns = [
            'ADD COLUMN length DECIMAL(15, 4) DEFAULT NULL',
            'ADD COLUMN width DECIMAL(15, 4) DEFAULT NULL',
            'ADD COLUMN thickness DECIMAL(15, 4) DEFAULT NULL',
            'ADD COLUMN diameter DECIMAL(15, 4) DEFAULT NULL',
            'ADD COLUMN outer_diameter DECIMAL(15, 4) DEFAULT NULL',
            'ADD COLUMN height DECIMAL(15, 4) DEFAULT NULL'
        ];

        for (const column of columns) {
            try {
                const columnName = column.split(' ')[2];
                await db.query(`ALTER TABLE grn_items ${column}`);
                console.log(`Added ${columnName} to grn_items`);
            } catch (err) {
                if (err.code === 'ER_DUP_COLUMN_NAME') {
                    console.log(`Column already exists in grn_items, skipping...`);
                } else {
                    throw err;
                }
            }
        }

        console.log('Update completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Failed to update table:', error);
        process.exit(1);
    }
};

addDimensionsToGrnItems();
