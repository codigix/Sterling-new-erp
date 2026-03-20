const db = require('./config/db');

const updateQualityTables = async () => {
    try {
        console.log('Updating Quality Inspection tables for consolidated uploads...');

        // 1. Add rejected_document_path to quality_inspections (renaming or adding alongside common_document_path)
        try {
            await db.query(`ALTER TABLE quality_inspections ADD COLUMN rejected_document_path VARCHAR(255) AFTER common_document_path`);
            console.log('- Added rejected_document_path to quality_inspections');
        } catch (e) {
            console.warn('- rejected_document_path already exists or error:', e.message);
        }

        // 2. Rename common_document_path to accepted_document_path for clarity (optional, but let's keep common for accepted)
        // If we want to rename: ALTER TABLE quality_inspections CHANGE common_document_path accepted_document_path VARCHAR(255)

        console.log('Update completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error updating tables:', error.message);
        process.exit(1);
    }
};

updateQualityTables();
