const db = require('../config/db');

(async () => {
  const [rows] = await db.query(
    'SELECT item_code, voucher_no, actual_qty, balance_qty, uom, total_weight FROM stock_ledger WHERE voucher_no = "STE-2026-0016"'
  );
  console.table(rows);
  process.exit(0);
})();
