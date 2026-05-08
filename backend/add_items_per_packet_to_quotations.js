const db = require('./config/db');

const addItemsPerPacketToQuotations = async () => {
  try {
    console.log('Adding items_per_packet columns to quotation_items table...');
    
    // Check items_per_packet
    const [cols1] = await db.query("SHOW COLUMNS FROM quotation_items LIKE 'items_per_packet'");
    if (cols1.length === 0) {
      await db.query(`ALTER TABLE quotation_items ADD COLUMN items_per_packet DECIMAL(15, 4) DEFAULT 1`);
      console.log('Added items_per_packet');
    } else {
      console.log('Column items_per_packet already exists');
    }

    // Check vendor_items_per_packet
    const [cols2] = await db.query("SHOW COLUMNS FROM quotation_items LIKE 'vendor_items_per_packet'");
    if (cols2.length === 0) {
      await db.query(`ALTER TABLE quotation_items ADD COLUMN vendor_items_per_packet DECIMAL(15, 4) DEFAULT 1`);
      console.log('Added vendor_items_per_packet');
    } else {
      console.log('Column vendor_items_per_packet already exists');
    }

    console.log('Update completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Update failed:', error);
    process.exit(1);
  }
};

addItemsPerPacketToQuotations();
