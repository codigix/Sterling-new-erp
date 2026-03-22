const db = require('./config/db');

const addItemCodeToSerials = async () => {
    try {
        console.log('Adding item_code column to inventory_serials and quality_final_report_st_numbers...');

        // 1. Add column to inventory_serials
        try {
            await db.query(`ALTER TABLE inventory_serials ADD COLUMN item_code VARCHAR(100) AFTER serial_number`);
            console.log('- Successfully added item_code column to inventory_serials');
        } catch (e) {
            console.warn('- item_code column might already exist in inventory_serials:', e.message);
        }

        // 2. Add column to quality_final_report_st_numbers
        try {
            await db.query(`ALTER TABLE quality_final_report_st_numbers ADD COLUMN item_code VARCHAR(100) AFTER st_code`);
            console.log('- Successfully added item_code column to quality_final_report_st_numbers');
        } catch (e) {
            console.warn('- item_code column might already exist in quality_final_report_st_numbers:', e.message);
        }

        // 3. Populate existing inventory_serials records
        const [serials] = await db.query('SELECT id, serial_number FROM inventory_serials WHERE item_code IS NULL OR item_code = ""');
        console.log(`- Found ${serials.length} inventory serials to update`);
        
        for (const s of serials) {
            const itemCode = s.serial_number.startsWith('ST-') ? s.serial_number.replace('ST-', '') : s.serial_number;
            await db.query('UPDATE inventory_serials SET item_code = ? WHERE id = ?', [itemCode, s.id]);
        }

        // 4. Populate existing quality_final_report_st_numbers records
        const [reportSerials] = await db.query('SELECT id, st_code FROM quality_final_report_st_numbers WHERE item_code IS NULL OR item_code = ""');
        console.log(`- Found ${reportSerials.length} report st numbers to update`);
        
        for (const rs of reportSerials) {
            const itemCode = rs.st_code.startsWith('ST-') ? rs.st_code.replace('ST-', '') : rs.st_code;
            await db.query('UPDATE quality_final_report_st_numbers SET item_code = ? WHERE id = ?', [itemCode, rs.id]);
        }

        console.log('Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error during migration:', error.message);
        process.exit(1);
    }
};

addItemCodeToSerials();
