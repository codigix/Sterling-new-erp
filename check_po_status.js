const db = require('./backend/config/db');
(async () => {
  const [rows] = await db.query('SELECT po_number, status, inventory_status FROM purchase_orders');
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
})();
