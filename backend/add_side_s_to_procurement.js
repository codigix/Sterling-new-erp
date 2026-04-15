const db = require('./config/db');

const addSideSColsToProcurement = async () => {
    try {
        console.log('Adding side_s, side_s1, side_s2 to procurement tables...');

        const tables = ['quotation_items', 'purchase_order_items'];
        const columns = [
            'ADD COLUMN side_s DECIMAL(15, 4) DEFAULT NULL',
            'ADD COLUMN side_s1 DECIMAL(15, 4) DEFAULT NULL',
            'ADD COLUMN side_s2 DECIMAL(15, 4) DEFAULT NULL'
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

addSideSColsToProcurement();
