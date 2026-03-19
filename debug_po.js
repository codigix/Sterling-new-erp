const axios = require('axios');
require('dotenv').config({ path: './backend/.env' });

(async () => {
  try {
    // We need a token or we can just check the DB again but more carefully
    const db = require('./backend/config/db');
    const [rows] = await db.query('SELECT * FROM purchase_orders WHERE po_number = "PO-2026-0001"');
    console.log('PO Data from DB:', JSON.stringify(rows[0], null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
