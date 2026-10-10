const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function runMigration() {
  console.log(`[Migration] Starting manual stock inventory schema update for database: ${process.env.DB_NAME}...`);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    // 1. Helper function to check and add column if missing
    const ensureColumn = async (table, column, definition) => {
      const [existing] = await connection.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
      if (existing.length === 0) {
        console.log(`  + Adding column \`${table}\`.\`${column}\`...`);
        await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
        console.log(`  ✓ Added \`${table}\`.\`${column}\``);
      } else {
        console.log(`  - Column \`${table}\`.\`${column}\` already exists.`);
      }
    };

    // 2. Helper to modify column nullability safely
    const modifyColumn = async (table, column, definition) => {
      try {
        console.log(`  * Modifying column \`${table}\`.\`${column}\` to ${definition}...`);
        await connection.query(`ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` ${definition}`);
        console.log(`  ✓ Modified \`${table}\`.\`${column}\``);
      } catch (err) {
        console.warn(`  ! Could not modify \`${table}\`.\`${column}\`: ${err.message}`);
      }
    };

    console.log('\n--- 1. Updating `inventory_serials` table ---');
    // Ensure foreign key / ID columns allow NULL for manual stock entries without PO / GRN
    await modifyColumn('inventory_serials', 'purchase_order_id', 'INT NULL DEFAULT NULL');
    await modifyColumn('inventory_serials', 'item_id', 'INT NULL DEFAULT NULL');
    await modifyColumn('inventory_serials', 'grn_id', 'INT NULL DEFAULT NULL');

    // Ensure dimension & manual tracking columns exist
    await ensureColumn('inventory_serials', 'issued_in_entry_id', 'INT NULL DEFAULT NULL');
    await ensureColumn('inventory_serials', 'length', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('inventory_serials', 'width', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('inventory_serials', 'thickness', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('inventory_serials', 'diameter', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('inventory_serials', 'outer_diameter', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('inventory_serials', 'height', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('inventory_serials', 'unit_weight', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('inventory_serials', 'total_weight', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('inventory_serials', 'density', 'DECIMAL(10,4) NULL DEFAULT 0.0000');
    await ensureColumn('inventory_serials', 'material_grade', 'VARCHAR(100) NULL DEFAULT NULL');
    await ensureColumn('inventory_serials', 'item_group', 'VARCHAR(100) NULL DEFAULT NULL');
    await ensureColumn('inventory_serials', 'material_type', 'VARCHAR(100) NULL DEFAULT NULL');
    await ensureColumn('inventory_serials', 'web_thickness', 'DECIMAL(15,4) NULL DEFAULT 0.0000');
    await ensureColumn('inventory_serials', 'flange_thickness', 'DECIMAL(15,4) NULL DEFAULT 0.0000');
    await ensureColumn('inventory_serials', 'side1', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('inventory_serials', 'side2', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('inventory_serials', 'side_s', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('inventory_serials', 'side_s1', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('inventory_serials', 'side_s2', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('inventory_serials', 'items_per_packet', 'DECIMAL(10,4) NULL DEFAULT 1.0000');
    await ensureColumn('inventory_serials', 'vendor_items_per_packet', 'DECIMAL(10,4) NULL DEFAULT 1.0000');

    console.log('\n--- 2. Updating `stock_entry_items` table ---');
    await modifyColumn('stock_entry_items', 'material_id', 'INT NULL DEFAULT NULL');
    await ensureColumn('stock_entry_items', 'batch_no', 'VARCHAR(100) NULL DEFAULT NULL');
    await ensureColumn('stock_entry_items', 'valuation_rate', 'DECIMAL(15,2) NULL DEFAULT 0.00');
    await ensureColumn('stock_entry_items', 'length', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_entry_items', 'width', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_entry_items', 'thickness', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_entry_items', 'diameter', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_entry_items', 'outer_diameter', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_entry_items', 'height', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_entry_items', 'unit_weight', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_entry_items', 'total_weight', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_entry_items', 'density', 'DECIMAL(10,4) NULL DEFAULT 0.0000');
    await ensureColumn('stock_entry_items', 'side1', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_entry_items', 'side2', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_entry_items', 'side_s', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_entry_items', 'side_s1', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_entry_items', 'side_s2', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_entry_items', 'web_thickness', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_entry_items', 'flange_thickness', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_entry_items', 'item_group', 'VARCHAR(100) NULL DEFAULT NULL');
    await ensureColumn('stock_entry_items', 'material_type', 'VARCHAR(100) NULL DEFAULT NULL');
    await ensureColumn('stock_entry_items', 'items_per_packet', 'DECIMAL(10,4) NULL DEFAULT 1.0000');
    await ensureColumn('stock_entry_items', 'vendor_items_per_packet', 'DECIMAL(10,4) NULL DEFAULT 1.0000');

    console.log('\n--- 3. Updating `stock_entries` table ---');
    await modifyColumn('stock_entries', 'grn_id', 'INT NULL DEFAULT NULL');
    await ensureColumn('stock_entries', 'project_name', 'VARCHAR(255) NULL DEFAULT NULL');
    await ensureColumn('stock_entries', 'vendor_name', 'VARCHAR(255) NULL DEFAULT NULL');

    console.log('\n--- 4. Updating `stock_ledger` table ---');
    await ensureColumn('stock_ledger', 'length', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_ledger', 'width', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_ledger', 'thickness', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_ledger', 'diameter', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_ledger', 'outer_diameter', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_ledger', 'height', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_ledger', 'unit_weight', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_ledger', 'total_weight', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_ledger', 'density', 'DECIMAL(10,4) NULL DEFAULT 0.0000');
    await ensureColumn('stock_ledger', 'side1', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_ledger', 'side2', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_ledger', 'side_s', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_ledger', 'side_s1', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_ledger', 'side_s2', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_ledger', 'web_thickness', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_ledger', 'flange_thickness', 'DECIMAL(15,4) NULL DEFAULT NULL');
    await ensureColumn('stock_ledger', 'item_group', 'VARCHAR(100) NULL DEFAULT NULL');
    await ensureColumn('stock_ledger', 'material_type', 'VARCHAR(100) NULL DEFAULT NULL');
    await ensureColumn('stock_ledger', 'items_per_packet', 'DECIMAL(10,4) NULL DEFAULT 1.0000');
    await ensureColumn('stock_ledger', 'vendor_items_per_packet', 'DECIMAL(10,4) NULL DEFAULT 1.0000');

    console.log('\n✅ Manual stock schema migration completed successfully!');
  } catch (err) {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
