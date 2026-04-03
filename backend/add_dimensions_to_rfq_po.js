const db = require('./config/db');

const addDimensionsToRfqAndPo = async () => {
    try {
        console.log('Adding dimensions to quotation_items and purchase_order_items tables...');

        const tables = ['quotation_items', 'purchase_order_items'];
        const columns = [
            'ADD COLUMN length DECIMAL(15, 4) DEFAULT NULL',
            'ADD COLUMN width DECIMAL(15, 4) DEFAULT NULL',
            'ADD COLUMN thickness DECIMAL(15, 4) DEFAULT NULL',
            'ADD COLUMN diameter DECIMAL(15, 4) DEFAULT NULL',
            'ADD COLUMN outer_diameter DECIMAL(15, 4) DEFAULT NULL',
            'ADD COLUMN height DECIMAL(15, 4) DEFAULT NULL'
        ];

        for (const table of tables) {
            console.log(`Updating table: ${table}`);
            for (const column of columns) {
                try {
                    const columnName = column.split(' ')[2];
                    await db.query(`ALTER TABLE ${table} ${column}`);
                    console.log(`Added ${columnName} to ${table}`);
                } catch (err) {
                    if (err.code === 'ER_DUP_COLUMN_NAME') {
                        console.log(`Column already exists in ${table}, skipping...`);
                    } else {
                        throw err;
                    }
                }
            }
        }

        console.log('Update completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Failed to update tables:', error);
        process.exit(1);
    }
};

addDimensionsToRfqAndPo();
