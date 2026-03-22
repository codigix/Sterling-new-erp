const db = require('./config/db');

const addItemCodeToGrnItems = async () => {
    try {
        console.log('Adding item_code column to grn_items table and populating existing records...');

        try {
            await db.query(`ALTER TABLE grn_items ADD COLUMN item_code VARCHAR(100) AFTER po_item_id`);
            console.log('- Successfully added item_code column to grn_items');
        } catch (e) {
            console.warn('- item_code column might already exist:', e.message);
        }

        // Helper function (internalized here for script standalone use)
        const generateItemCode = (materialName) => {
            let typeCode = "GEN";
            const upperName = (materialName || "").toUpperCase();
            if (upperName.includes("PLATE")) typeCode = "PLT";
            else if (upperName.includes("ROUND BAR") || upperName.includes("RB")) typeCode = "RB";
            else if (upperName.includes("PIPE")) typeCode = "PIPE";

            const sizeMatch = (materialName || "").match(/(\d+)x(\d+)x(\d+)/);
            let shortSize = "SIZE";
            if (sizeMatch) {
                const dims = [sizeMatch[1], sizeMatch[2], sizeMatch[3]].map(d => {
                    const val = parseInt(d);
                    return (val >= 100 && val % 100 === 0) ? (val / 100).toString() : val.toString();
                });
                shortSize = dims.join("x");
            }
            return `${typeCode}-${shortSize}`;
        };

        // Populate existing null item_codes
        const [rows] = await db.query('SELECT id, material_name FROM grn_items WHERE item_code IS NULL OR item_code = ""');
        console.log(`- Found ${rows.length} existing records without item_code`);

        for (const row of rows) {
            const itemCode = generateItemCode(row.material_name);
            await db.query('UPDATE grn_items SET item_code = ? WHERE id = ?', [itemCode, row.id]);
        }

        if (rows.length > 0) {
            console.log('- Successfully populated existing item_code values');
        }

        console.log('Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error during migration:', error.message);
        process.exit(1);
    }
};

addItemCodeToGrnItems();
