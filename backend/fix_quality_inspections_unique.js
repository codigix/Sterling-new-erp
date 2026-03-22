const db = require('./config/db');

const fixQualityInspectionsTable = async () => {
    try {
        console.log('Adding UNIQUE constraint to grn_id in quality_inspections...');

        // 1. First, cleanup any existing duplicate rows for same grn_id (keep the latest one)
        await db.query(`
            DELETE q1 FROM quality_inspections q1
            INNER JOIN quality_inspections q2 
            WHERE q1.id < q2.id AND q1.grn_id = q2.id
        `).catch(err => console.warn('Cleanup warning:', err.message));

        // 2. Add the unique constraint
        try {
            await db.query(`ALTER TABLE quality_inspections ADD UNIQUE INDEX idx_grn_id (grn_id)`);
            console.log('- Successfully added UNIQUE index on grn_id');
        } catch (e) {
            console.warn('- UNIQUE index might already exist:', e.message);
        }

        console.log('Fix completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing table:', error.message);
        process.exit(1);
    }
};

fixQualityInspectionsTable();
