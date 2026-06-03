const db = require("../config/db");

const getVendorInvoices = async (req, res) => {
  try {
    const { search, status, projectId } = req.query;
    let query = `
      SELECT vi.*, v.name as vendor_name, 
             COALESCE(rc.project_name, po_rc.project_name, oc_rc.project_name) as project_name, 
             po.po_number, oc.challan_no
      FROM vendor_invoices vi
      LEFT JOIN vendors v ON vi.vendor_id = v.id
      LEFT JOIN root_cards rc ON (vi.project_id = rc.id OR vi.project_id = rc.public_id)
      LEFT JOIN purchase_orders po ON vi.purchase_order_id = po.id
      LEFT JOIN outward_challans oc ON vi.outward_challan_id = oc.id
      LEFT JOIN root_cards po_rc ON po.project_id = po_rc.id
      LEFT JOIN root_cards oc_rc ON oc.root_card_id = oc_rc.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += " AND vi.status = ?";
      params.push(status);
    }

    if (projectId) {
      // Resolve internal ID if public_id is provided
      const [cards] = await db.query('SELECT id FROM root_cards WHERE id = ? OR public_id = ?', [projectId, projectId]);
      const effectiveId = cards.length > 0 ? cards[0].id : projectId;
      query += " AND vi.project_id = ?";
      params.push(effectiveId);
    }

    if (search) {
      query += " AND (vi.invoice_number LIKE ? OR v.name LIKE ? OR po.po_number LIKE ? OR oc.challan_no LIKE ?)";
      const searchVal = `%${search}%`;
      params.push(searchVal, searchVal, searchVal, searchVal);
    }

    query += " ORDER BY vi.created_at DESC";

    const [rows] = await db.query(query, params);
    res.json({ invoices: rows });
  } catch (error) {
    console.error("Error fetching vendor invoices:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getVendorInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(`
      SELECT vi.*, v.name as vendor_name, v.address as vendor_address, v.gstin as vendor_gst,
             COALESCE(rc.project_name, po_rc.project_name, oc_rc.project_name) as project_name,
             po.po_number, po.order_date as po_date,
             oc.challan_no, oc.challan_date as oc_date
      FROM vendor_invoices vi
      LEFT JOIN vendors v ON vi.vendor_id = v.id
      LEFT JOIN root_cards rc ON (vi.project_id = rc.id OR vi.project_id = rc.public_id)
      LEFT JOIN purchase_orders po ON vi.purchase_order_id = po.id
      LEFT JOIN outward_challans oc ON vi.outward_challan_id = oc.id
      LEFT JOIN root_cards po_rc ON po.project_id = po_rc.id
      LEFT JOIN root_cards oc_rc ON oc.root_card_id = oc_rc.id
      WHERE vi.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const invoice = rows[0];
    const [items] = await db.query(
      "SELECT * FROM vendor_invoice_items WHERE invoice_id = ?",
      [id]
    );
    invoice.items = items;

    res.json(invoice);
  } catch (error) {
    console.error("Error fetching vendor invoice details:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getPendingInvoices = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT vi.id, vi.invoice_number, vi.grand_total, vi.paid_amount, vi.balance_amount, 
             v.name as vendor_name, v.id as vendor_id, po.po_number, oc.challan_no
      FROM vendor_invoices vi
      JOIN vendors v ON vi.vendor_id = v.id
      LEFT JOIN purchase_orders po ON vi.purchase_order_id = po.id
      LEFT JOIN outward_challans oc ON vi.outward_challan_id = oc.id
      WHERE vi.status IN ('PENDING', 'OVERDUE') AND vi.balance_amount > 0
      ORDER BY vi.invoice_date ASC
    `);
    res.json({ invoices: rows });
  } catch (error) {
    console.error("Error fetching pending invoices:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getNextPaymentNumber = async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const [rows] = await db.query(
      "SELECT payment_number FROM vendor_payments WHERE payment_number LIKE ? ORDER BY id DESC LIMIT 1",
      [`PAY/${year}/%`]
    );

    let nextNumber = 1;
    if (rows.length > 0) {
      const parts = rows[0].payment_number.split('/');
      const lastNumber = parseInt(parts[parts.length - 1]);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    const formattedNumber = `PAY/${year}/${nextNumber.toString().padStart(3, '0')}`;
    res.json({ nextPaymentNumber: formattedNumber });
  } catch (error) {
    console.error("Error generating next payment number:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getVendorPayments = async (req, res) => {
  try {
    const { search, projectId } = req.query;
    let query = `
      SELECT vp.*, vi.invoice_number as ref_invoice_no, v.name as vendor_name, rc.project_name
      FROM vendor_payments vp
      JOIN vendor_invoices vi ON vp.invoice_id = vi.id
      JOIN vendors v ON vp.vendor_id = v.id
      LEFT JOIN root_cards rc ON (vi.project_id = rc.id OR vi.project_id = rc.public_id)
      WHERE 1=1
    `;
    const params = [];

    if (projectId) {
      // Resolve internal ID if public_id is provided
      const [cards] = await db.query('SELECT id FROM root_cards WHERE id = ? OR public_id = ?', [projectId, projectId]);
      const effectiveId = cards.length > 0 ? cards[0].id : projectId;
      query += " AND vi.project_id = ?";
      params.push(effectiveId);
    }

    if (search) {
      query += " AND (vp.payment_number LIKE ? OR vi.invoice_number LIKE ? OR v.name LIKE ?)";
      const searchVal = `%${search}%`;
      params.push(searchVal, searchVal, searchVal);
    }

    query += " ORDER BY vp.payment_date DESC";

    const [rows] = await db.query(query, params);
    res.json({ payments: rows });
  } catch (error) {
    console.error("Error fetching vendor payments:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getVendorPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(`
      SELECT vp.*, vi.invoice_number as ref_invoice_no, v.name as vendor_name, vi.grand_total as invoice_amount
      FROM vendor_payments vp
      JOIN vendor_invoices vi ON vp.invoice_id = vi.id
      JOIN vendors v ON vp.vendor_id = v.id
      WHERE vp.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching vendor payment details:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const createVendorPayment = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      payment_number,
      invoice_id,
      vendor_id,
      payment_date,
      amount_paid,
      payment_method,
      reference_number,
      notes
    } = req.body;

    // 1. Insert payment record
    const [paymentResult] = await connection.query(
      `INSERT INTO vendor_payments (
        payment_number, invoice_id, vendor_id, payment_date, 
        amount_paid, payment_method, reference_number, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED')`,
      [payment_number, invoice_id, vendor_id, payment_date, amount_paid, payment_method, reference_number, notes]
    );

    // 2. Update invoice balance and status
    const [invoiceRows] = await connection.query(
      "SELECT grand_total, paid_amount, vendor_id FROM vendor_invoices WHERE id = ?",
      [invoice_id]
    );

    if (invoiceRows.length === 0) {
      throw new Error("Invoice not found");
    }

    const newPaidAmount = parseFloat(invoiceRows[0].paid_amount) + parseFloat(amount_paid);
    const balanceAmount = parseFloat(invoiceRows[0].grand_total) - newPaidAmount;
    const status = balanceAmount <= 0 ? 'PAID' : 'PENDING';

    await connection.query(
      "UPDATE vendor_invoices SET paid_amount = ?, balance_amount = ?, status = ? WHERE id = ?",
      [newPaidAmount, balanceAmount, status, invoice_id]
    );

    // 3. Create Ledger Entries (Double Entry)
    const [vendorRows] = await connection.query("SELECT name FROM vendors WHERE id = ?", [vendor_id]);
    const vendorName = vendorRows[0]?.name || "Vendor";

    // Entry 1: Credit Vendor/Accounts Payable (Swapped for Statement Style)
    await connection.query(
      `INSERT INTO ledger_entries (date, reference_no, description, account_name, debit, credit, transaction_type, related_id)
       VALUES (?, ?, ?, ?, 0, ?, 'PAYMENT_MADE', ?)`,
      [payment_date, payment_number, `Payment to ${vendorName} for Inv #${req.body.invoice_number || 'N/A'}`, "Accounts Payable", amount_paid, paymentResult.insertId]
    );

    // Entry 2: Debit Bank/Cash (Swapped for Statement Style)
    await connection.query(
      `INSERT INTO ledger_entries (date, reference_no, description, account_name, debit, credit, transaction_type, related_id)
       VALUES (?, ?, ?, ?, ?, 0, 'PAYMENT_MADE', ?)`,
      [payment_date, payment_number, `Payment to ${vendorName}`, payment_method.includes("Bank") ? "Bank Account" : "Cash Account", amount_paid, paymentResult.insertId]
    );

    await connection.commit();
    res.status(201).json({ message: "Payment recorded successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating vendor payment:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    connection.release();
  }
};

const getNextInvoiceNumber = async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const [rows] = await db.query(
      "SELECT invoice_number FROM vendor_invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1",
      [`INV/${year}/%`]
    );

    let nextNumber = 1;
    if (rows.length > 0) {
      const lastNumber = parseInt(rows[0].invoice_number.split('/').pop());
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    const formattedNumber = `INV/${year}/${nextNumber.toString().padStart(3, '0')}`;
    res.json({ nextInvoiceNumber: formattedNumber });
  } catch (error) {
    console.error("Error generating next invoice number:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const createVendorInvoice = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      invoice_number,
      purchase_order_id,
      outward_challan_id,
      vendor_id,
      project_id,
      invoice_date,
      place_of_supply,
      transporter,
      lr_number,
      challan_number,
      challan_date,
      sub_total,
      taxable_value,
      cgst_amount,
      sgst_amount,
      igst_amount,
      grand_total,
      round_off,
      notes,
      items
    } = req.body;

    // Resolve internal ID if public_id is provided
    let effectiveProjectId = project_id;
    if (effectiveProjectId) {
      const [cards] = await connection.query('SELECT id FROM root_cards WHERE id = ? OR public_id = ?', [effectiveProjectId, effectiveProjectId]);
      if (cards.length > 0) effectiveProjectId = cards[0].id;
    }

    // Insert invoice header
    const [invoiceResult] = await connection.query(
      `INSERT INTO vendor_invoices (
        invoice_number, purchase_order_id, outward_challan_id, vendor_id, project_id, 
        invoice_date, place_of_supply, transporter, lr_number, 
        challan_number, challan_date, sub_total, taxable_value, 
        cgst_amount, sgst_amount, igst_amount, grand_total, 
        paid_amount, balance_amount, round_off, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'PENDING')`,
      [
        invoice_number, purchase_order_id || null, outward_challan_id || null, vendor_id, effectiveProjectId,
        invoice_date, place_of_supply, transporter, lr_number,
        challan_number, challan_date || null, sub_total, taxable_value,
        cgst_amount, sgst_amount, igst_amount, grand_total,
        grand_total, // balance_amount = grand_total initially
        round_off, notes
      ]
    );

    const invoiceId = invoiceResult.insertId;

    // Insert invoice items
    if (items && items.length > 0) {
      const itemValues = items.map(item => [
        invoiceId,
        item.po_item_id || null,
        item.challan_item_id || null,
        item.description,
        item.hsn_code,
        item.qty,
        item.unit,
        item.rate,
        item.amount
      ]);

      await connection.query(
        `INSERT INTO vendor_invoice_items (
          invoice_id, po_item_id, challan_item_id, description, hsn_code, 
          qty, unit, rate, amount
        ) VALUES ?`,
        [itemValues]
      );
    }

    await connection.commit();
    res.status(201).json({ message: "Vendor invoice recorded successfully", invoiceId });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating vendor invoice:", error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: "Invoice number already exists" });
    }
    res.status(500).json({ message: "Server error" });
  } finally {
    connection.release();
  }
};

const getEligibleOutwardChallans = async (req, res) => {
  try {
    const { vendorId } = req.query;
    let query = `
      SELECT oc.*, rc.project_name, oc.root_card_id as project_id
      FROM outward_challans oc
      LEFT JOIN root_cards rc ON oc.root_card_id = rc.id
      WHERE oc.status IN ('SUBMITTED', 'RECEIVED')
      AND oc.id NOT IN (SELECT outward_challan_id FROM vendor_invoices WHERE outward_challan_id IS NOT NULL)
    `;
    const params = [];

    if (vendorId) {
      query += " AND oc.vendor_id = ?";
      params.push(vendorId);
    }

    query += " ORDER BY oc.challan_date DESC";

    const [rows] = await db.query(query, params);
    res.json({ challans: rows });
  } catch (error) {
    console.error("Error fetching eligible outward challans:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getOutwardChallanDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(`
      SELECT oc.*, rc.project_name, oc.root_card_id as project_id
      FROM outward_challans oc
      LEFT JOIN root_cards rc ON oc.root_card_id = rc.id
      WHERE oc.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Challan not found" });
    }

    const challan = rows[0];
    const [items] = await db.query(
      "SELECT * FROM outward_challan_items WHERE challan_id = ?",
      [id]
    );
    challan.items = items;

    res.json(challan);
  } catch (error) {
    console.error("Error fetching outward challan details:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getCustomerInvoices = async (req, res) => {
  try {
    const { search, status, projectId } = req.query;
    let query = `
      SELECT ci.*, rc.project_name
      FROM customer_invoices ci
      LEFT JOIN root_cards rc ON (ci.project_id = rc.id OR ci.project_id = rc.public_id)
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += " AND ci.status = ?";
      params.push(status);
    }

    if (projectId) {
      // Resolve internal ID if public_id is provided
      const [cards] = await db.query('SELECT id FROM root_cards WHERE id = ? OR public_id = ?', [projectId, projectId]);
      const effectiveId = cards.length > 0 ? cards[0].id : projectId;
      query += " AND ci.project_id = ?";
      params.push(effectiveId);
    }

    if (search) {
      query += " AND (ci.invoice_number LIKE ? OR ci.customer_name LIKE ?)";
      const searchVal = `%${search}%`;
      params.push(searchVal, searchVal);
    }

    query += " ORDER BY ci.created_at DESC";

    const [rows] = await db.query(query, params);
    res.json({ invoices: rows });
  } catch (error) {
    console.error("Error fetching customer invoices:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getCustomerInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(`
      SELECT ci.*, rc.project_name
      FROM customer_invoices ci
      LEFT JOIN root_cards rc ON (ci.project_id = rc.id OR ci.project_id = rc.public_id)
      WHERE ci.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const invoice = rows[0];
    const [items] = await db.query(
      "SELECT * FROM customer_invoice_items WHERE invoice_id = ?",
      [id]
    );
    invoice.items = items;

    res.json(invoice);
  } catch (error) {
    console.error("Error fetching customer invoice details:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getNextCustomerInvoiceNumber = async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const [rows] = await db.query(
      "SELECT invoice_number FROM customer_invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1",
      [`CINV/${year}/%`]
    );

    let nextNumber = 1;
    if (rows.length > 0) {
      const parts = rows[0].invoice_number.split('/');
      const lastNumber = parseInt(parts[parts.length - 1]);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    const formattedNumber = `CINV/${year}/${nextNumber.toString().padStart(3, '0')}`;
    res.json({ nextInvoiceNumber: formattedNumber });
  } catch (error) {
    console.error("Error generating next customer invoice number:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const createCustomerInvoice = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      invoice_number,
      customer_name,
      project_id,
      invoice_date,
      place_of_supply,
      sub_total,
      taxable_value,
      cgst_amount,
      sgst_amount,
      igst_amount,
      grand_total,
      round_off,
      notes,
      items
    } = req.body;

    // Resolve internal ID if public_id is provided
    let effectiveProjectId = project_id;
    if (effectiveProjectId) {
      const [cards] = await connection.query('SELECT id FROM root_cards WHERE id = ? OR public_id = ?', [effectiveProjectId, effectiveProjectId]);
      if (cards.length > 0) effectiveProjectId = cards[0].id;
    }

    const [invoiceResult] = await connection.query(
      `INSERT INTO customer_invoices (
        invoice_number, customer_name, project_id, invoice_date, 
        place_of_supply, sub_total, taxable_value, cgst_amount, 
        sgst_amount, igst_amount, grand_total, paid_amount, 
        balance_amount, round_off, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'PENDING')`,
      [
        invoice_number, customer_name, effectiveProjectId, invoice_date,
        place_of_supply, sub_total, taxable_value, cgst_amount,
        sgst_amount, igst_amount, grand_total, grand_total,
        round_off, notes
      ]
    );

    const invoiceId = invoiceResult.insertId;

    if (items && items.length > 0) {
      const itemValues = items.map(item => [
        invoiceId,
        item.description,
        item.hsn_code,
        item.qty,
        item.unit,
        item.rate,
        item.amount
      ]);

      await connection.query(
        `INSERT INTO customer_invoice_items (
          invoice_id, description, hsn_code, qty, unit, rate, amount
        ) VALUES ?`,
        [itemValues]
      );
    }

    await connection.commit();
    res.status(201).json({ message: "Customer invoice recorded successfully", invoiceId });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating customer invoice:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    connection.release();
  }
};

const getCustomerPayments = async (req, res) => {
  try {
    const { search, projectId } = req.query;
    let query = `
      SELECT cp.*, ci.invoice_number as ref_invoice_no, rc.project_name
      FROM customer_payments cp
      LEFT JOIN customer_invoices ci ON cp.invoice_id = ci.id
      LEFT JOIN root_cards rc ON (ci.project_id = rc.id OR ci.project_id = rc.public_id)
      WHERE 1=1
    `;
    const params = [];

    if (projectId) {
      // Resolve internal ID if public_id is provided
      const [cards] = await db.query('SELECT id FROM root_cards WHERE id = ? OR public_id = ?', [projectId, projectId]);
      const effectiveId = cards.length > 0 ? cards[0].id : projectId;
      query += " AND ci.project_id = ?";
      params.push(effectiveId);
    }

    if (search) {
      query += " AND (cp.receipt_number LIKE ? OR ci.invoice_number LIKE ? OR cp.customer_name LIKE ?)";
      const searchVal = `%${search}%`;
      params.push(searchVal, searchVal, searchVal);
    }

    query += " ORDER BY cp.received_date DESC";

    const [rows] = await db.query(query, params);
    res.json({ payments: rows });
  } catch (error) {
    console.error("Error fetching customer payments:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getNextReceiptNumber = async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const [rows] = await db.query(
      "SELECT receipt_number FROM customer_payments WHERE receipt_number LIKE ? ORDER BY id DESC LIMIT 1",
      [`RCPT/${year}/%`]
    );

    let nextNumber = 1;
    if (rows.length > 0) {
      const parts = rows[0].receipt_number.split('/');
      const lastNumber = parseInt(parts[parts.length - 1]);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    const formattedNumber = `RCPT/${year}/${nextNumber.toString().padStart(3, '0')}`;
    res.json({ nextReceiptNumber: formattedNumber });
  } catch (error) {
    console.error("Error generating next receipt number:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const createCustomerPayment = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      receipt_number,
      invoice_id,
      customer_name,
      received_date,
      amount_received,
      payment_method,
      transaction_ref,
      notes
    } = req.body;

    const effectiveInvoiceId = (invoice_id && invoice_id !== "") ? parseInt(invoice_id) : null;
    const parsedAmountReceived = parseFloat(amount_received) || 0;

    const [paymentResult] = await connection.query(
      `INSERT INTO customer_payments (
        receipt_number, invoice_id, customer_name, received_date, 
        amount_received, payment_method, transaction_ref, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED')`,
      [receipt_number, effectiveInvoiceId, customer_name, received_date, parsedAmountReceived, payment_method, transaction_ref || null, notes || null]
    );

    if (effectiveInvoiceId) {
      const [invoiceRows] = await connection.query(
        "SELECT grand_total, paid_amount FROM customer_invoices WHERE id = ?",
        [effectiveInvoiceId]
      );

      if (invoiceRows.length > 0) {
        const currentPaid = parseFloat(invoiceRows[0].paid_amount) || 0;
        const grandTotal = parseFloat(invoiceRows[0].grand_total) || 0;
        const newPaidAmount = currentPaid + parsedAmountReceived;
        const balanceAmount = grandTotal - newPaidAmount;
        const status = balanceAmount <= 0 ? 'PAID' : (newPaidAmount > 0 ? 'PARTIAL' : 'PENDING');

        await connection.query(
          "UPDATE customer_invoices SET paid_amount = ?, balance_amount = ?, status = ? WHERE id = ?",
          [newPaidAmount, balanceAmount, status, effectiveInvoiceId]
        );
      }
    }

    // 3. Create Ledger Entries (Double Entry)
    // Entry 1: Credit Bank/Cash (Swapped for Statement Style)
    await connection.query(
      `INSERT INTO ledger_entries (date, reference_no, description, account_name, debit, credit, transaction_type, related_id)
       VALUES (?, ?, ?, ?, 0, ?, 'PAYMENT_RECEIVED', ?)`,
      [received_date, receipt_number, `Payment received from ${customer_name}`, payment_method.includes("Bank") ? "Bank Account" : "Cash Account", parsedAmountReceived, paymentResult.insertId]
    );

    // Entry 2: Debit Customer/Accounts Receivable (Swapped for Statement Style)
    await connection.query(
      `INSERT INTO ledger_entries (date, reference_no, description, account_name, debit, credit, transaction_type, related_id)
       VALUES (?, ?, ?, ?, ?, 0, 'PAYMENT_RECEIVED', ?)`,
      [received_date, receipt_number, `Payment received from ${customer_name}`, "Accounts Receivable", parsedAmountReceived, paymentResult.insertId]
    );

    await connection.commit();
    res.status(201).json({ message: "Payment recorded successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating customer payment:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  } finally {
    connection.release();
  }
};

const getLedgerEntries = async (req, res) => {
  try {
    const { search, startDate, endDate } = req.query;
    let query = "SELECT * FROM ledger_entries WHERE 1=1";
    const params = [];

    if (startDate) {
      query += " AND date >= ?";
      params.push(startDate);
    }

    if (endDate) {
      query += " AND date <= ?";
      params.push(endDate);
    }

    if (search) {
      query += " AND (reference_no LIKE ? OR description LIKE ? OR account_name LIKE ?)";
      const searchVal = `%${search}%`;
      params.push(searchVal, searchVal, searchVal);
    }

    query += " ORDER BY date DESC, created_at DESC";

    const [rows] = await db.query(query, params);
    res.json({ entries: rows });
  } catch (error) {
    console.error("Error fetching ledger entries:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getProjects = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, project_name, project_code, quantity, sales_price FROM root_cards ORDER BY created_at DESC"
    );
    res.json({ projects: rows });
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getInvoicesForSelection = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, invoice_number, customer_name, grand_total, balance_amount FROM customer_invoices WHERE status != 'PAID' ORDER BY created_at DESC"
    );
    res.json({ invoices: rows });
  } catch (error) {
    console.error("Error fetching invoices for selection:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getVendorInvoices,
  getVendorInvoiceById,
  getPendingInvoices,
  getNextPaymentNumber,
  getNextInvoiceNumber,
  getVendorPayments,
  getVendorPaymentById,
  createVendorPayment,
  createVendorInvoice,
  getCustomerInvoices,
  getCustomerInvoiceById,
  getNextCustomerInvoiceNumber,
  createCustomerInvoice,
  getCustomerPayments,
  getNextReceiptNumber,
  createCustomerPayment,
  getLedgerEntries,
  getProjects,
  getInvoicesForSelection,
  getEligibleOutwardChallans,
  getOutwardChallanDetails
};
