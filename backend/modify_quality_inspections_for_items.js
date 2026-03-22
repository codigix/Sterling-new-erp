const db = require('./config/db');

const modifyQualityInspectionsTable = async () => {
    try {
        console.log('Modifying quality_inspections table for per-item documents...');

        // 1. Add po_item_id column
        try {
            await db.query(`ALTER TABLE quality_inspections ADD COLUMN po_item_id INT AFTER grn_id`);
            console.log('- Added po_item_id to quality_inspections');
        } catch (e) {
            console.warn('- po_item_id already exists or error:', e.message);
        }

        // 2. Drop existing unique index on grn_id
        try {
            await db.query(`ALTER TABLE quality_inspections DROP INDEX idx_grn_id`);
            console.log('- Dropped old unique index idx_grn_id');
        } catch (e) {
            console.warn('- Old index idx_grn_id not found or error:', e.message);
        }

        // 3. Add new unique index on (grn_id, po_item_id)
        try {
            await db.query(`ALTER TABLE quality_inspections ADD UNIQUE INDEX idx_grn_item_id (grn_id, po_item_id)`);
            console.log('- Added new unique index on (grn_id, po_item_id)');
        } catch (e) {
            console.warn('- New index might already exist or error:', e.message);
        }

        console.log('Modification completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error modifying table:', error.message);
        process.exit(1);
    }
};

modifyQualityInspectionsTable();
