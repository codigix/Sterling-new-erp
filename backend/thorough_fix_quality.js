const db = require('./config/db');

const thoroughFix = async () => {
    try {
        console.log('Performing thorough cleanup of quality_inspections...');

        // 1. Get all grn_ids that have multiple inspection headers
        const [duplicates] = await db.query(`
            SELECT grn_id, COUNT(*) as count 
            FROM quality_inspections 
            GROUP BY grn_id 
            HAVING count > 1
        `);

        for (const row of duplicates) {
            const { grn_id } = row;
            console.log(`Fixing duplicates for GRN ID: ${grn_id}`);

            // Get all IDs for this GRN, sorted by latest
            const [headers] = await db.query(
                'SELECT id FROM quality_inspections WHERE grn_id = ? ORDER BY id DESC',
                [grn_id]
            );

            const latestId = headers[0].id;
            const olderIds = headers.slice(1).map(h => h.id);

            if (olderIds.length > 0) {
                // Update results to point to latest header
                await db.query(
                    'UPDATE quality_inspection_results SET inspection_id = ? WHERE inspection_id IN (?)',
                    [latestId, olderIds]
                );

                // Delete older headers
                await db.query(
                    'DELETE FROM quality_inspections WHERE id IN (?)',
                    [olderIds]
                );
            }
        }

        // 2. Add the unique constraint
        try {
            await db.query(`ALTER TABLE quality_inspections ADD UNIQUE INDEX idx_grn_id (grn_id)`);
            console.log('- Successfully added UNIQUE index on grn_id');
        } catch (e) {
            console.log('- UNIQUE index check:', e.message);
        }

        console.log('Thorough fix completed');
        process.exit(0);
    } catch (error) {
        console.error('Error during thorough fix:', error.message);
        process.exit(1);
    }
};

thoroughFix();
