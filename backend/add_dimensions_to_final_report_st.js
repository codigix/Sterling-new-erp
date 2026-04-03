const db = require('./config/db');

const addDimensionsToFinalReportST = async () => {
    try {
        const table = 'quality_final_report_st_numbers';
        const columns = [
            'ADD COLUMN length DECIMAL(15, 4) DEFAULT NULL',
            'ADD COLUMN width DECIMAL(15, 4) DEFAULT NULL',
            'ADD COLUMN thickness DECIMAL(15, 4) DEFAULT NULL',
            'ADD COLUMN diameter DECIMAL(15, 4) DEFAULT NULL',
            'ADD COLUMN outer_diameter DECIMAL(15, 4) DEFAULT NULL',
            'ADD COLUMN height DECIMAL(15, 4) DEFAULT NULL'
        ];

        console.log(`Adding dimensions to ${table} table...`);
        for (const column of columns) {
            try {
                const columnName = column.split(' ')[2];
                await db.query(`ALTER TABLE ${table} ${column}`);
                console.log(`Added ${columnName} to ${table}`);
            } catch (err) {
                if (err.code === 'ER_DUP_COLUMN_NAME') {
                    console.log(`Column already exists in ${table}, skipping...`);
                } else {
                    console.error(`Error adding column to ${table}:`, err.message);
                }
            }
        }

        console.log('Quality Final Report ST numbers table update completed');
        process.exit(0);
    } catch (error) {
        console.error('Failed to update Quality Final Report ST numbers table:', error);
        process.exit(1);
    }
};

addDimensionsToFinalReportST();
