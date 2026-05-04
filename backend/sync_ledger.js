const db = require("./config/db");

const syncHistoricalLedger = async () => {
  try {
    console.log("Syncing historical payments to ledger...");

    // 1. Sync Vendor Payments
    const [vPayments] = await db.query(`
      SELECT vp.*, v.name as vendor_name, vi.invoice_number
      FROM vendor_payments vp
      JOIN vendors v ON vp.vendor_id = v.id
      JOIN vendor_invoices vi ON vp.invoice_id = vi.id
    `);

    for (const p of vPayments) {
      // Check if already exists to avoid duplicates
      const [exists] = await db.query("SELECT id FROM ledger_entries WHERE related_id = ? AND transaction_type = 'PAYMENT_MADE'", [p.id]);
      if (exists.length === 0) {
        // Debit Accounts Payable
        await db.query(
          "INSERT INTO ledger_entries (date, reference_no, description, account_name, debit, credit, transaction_type, related_id) VALUES (?, ?, ?, ?, ?, 0, 'PAYMENT_MADE', ?)",
          [p.payment_date, p.payment_number, `Payment to ${p.vendor_name} for Inv #${p.invoice_number}`, "Accounts Payable", p.amount_paid, p.id]
        );
        // Credit Bank
        await db.query(
          "INSERT INTO ledger_entries (date, reference_no, description, account_name, debit, credit, transaction_type, related_id) VALUES (?, ?, ?, ?, 0, ?, 'PAYMENT_MADE', ?)",
          [p.payment_date, p.payment_number, `Payment to ${p.vendor_name}`, p.payment_method.includes("Bank") ? "Bank Account" : "Cash Account", p.amount_paid, p.id]
        );
      }
    }

    // 2. Sync Customer Payments
    const [cPayments] = await db.query("SELECT * FROM customer_payments");
    for (const p of cPayments) {
      const [exists] = await db.query("SELECT id FROM ledger_entries WHERE related_id = ? AND transaction_type = 'PAYMENT_RECEIVED'", [p.id]);
      if (exists.length === 0) {
        // Debit Bank
        await db.query(
          "INSERT INTO ledger_entries (date, reference_no, description, account_name, debit, credit, transaction_type, related_id) VALUES (?, ?, ?, ?, ?, 0, 'PAYMENT_RECEIVED', ?)",
          [p.received_date, p.receipt_number, `Payment received from ${p.customer_name}`, p.payment_method.includes("Bank") ? "Bank Account" : "Cash Account", p.amount_received, p.id]
        );
        // Credit Accounts Receivable
        await db.query(
          "INSERT INTO ledger_entries (date, reference_no, description, account_name, debit, credit, transaction_type, related_id) VALUES (?, ?, ?, ?, 0, ?, 'PAYMENT_RECEIVED', ?)",
          [p.received_date, p.receipt_number, `Payment received from ${p.customer_name}`, "Accounts Receivable", p.amount_received, p.id]
        );
      }
    }

    console.log("Historical sync completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error syncing ledger:", error);
    process.exit(1);
  }
};

syncHistoricalLedger();
