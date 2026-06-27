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
             v.state as vendor_state, v.city as vendor_city, v.pincode as vendor_pincode,
             v.bank_name as vendor_bank_name, v.account_number as vendor_account_number,
             v.ifsc_code as vendor_ifsc_code, v.pan_number as vendor_pan,
             COALESCE(rc.project_name, po_rc.project_name, oc_rc.project_name) as project_name,
             po.po_number, po.order_date as po_date,
             oc.challan_no, oc.challan_date as oc_date, oc.operation_name
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
    const [items] = await db.query(`
      SELECT vii.*, 
             COALESCE(poi.material_grade, s.material_grade, s_poi.material_grade, sei_poi.material_grade) as material_grade,
             COALESCE(poi.make, s_poi.make, sei_poi.make) as make,
             COALESCE(poi.remark, s_poi.remark, sei_poi.remark) as remark,
             COALESCE(poi.length, s.length, sei.length) as length,
             COALESCE(poi.width, s.width, sei.width) as width,
             COALESCE(poi.thickness, s.thickness, sei.thickness) as thickness,
             COALESCE(poi.diameter, s.diameter, sei.diameter) as diameter,
             COALESCE(poi.outer_diameter, s.outer_diameter, sei.outer_diameter) as outer_diameter,
             COALESCE(poi.height, s.height, sei.height) as height,
             COALESCE(poi.side1, s.side1, sei.side1) as side1,
             COALESCE(poi.side2, s.side2, sei.side2) as side2,
             COALESCE(poi.side_s, s.side_s, sei.side_s) as side_s,
             COALESCE(poi.side_s1, s.side_s1, sei.side_s1) as side_s1,
             COALESCE(poi.side_s2, s.side_s2, sei.side_s2) as side_s2,
             COALESCE(poi.web_thickness, s.web_thickness, sei.web_thickness) as web_thickness,
             COALESCE(poi.flange_thickness, s.flange_thickness, sei.flange_thickness) as flange_thickness
      FROM vendor_invoice_items vii
      LEFT JOIN purchase_order_items poi ON vii.po_item_id = poi.id
      LEFT JOIN outward_challan_items oci ON vii.challan_item_id = oci.id
      -- If batch_no is a serial number
      LEFT JOIN inventory_serials s ON (oci.batch_no = s.serial_number AND oci.item_code = s.item_code)
      LEFT JOIN purchase_order_items s_poi ON s.item_id = s_poi.id
      -- If batch_no is an entry_no (stock entry number)
      LEFT JOIN stock_entries se ON oci.batch_no = se.entry_no
      LEFT JOIN stock_entry_items sei ON (se.id = sei.stock_entry_id AND oci.item_code = sei.item_code)
      LEFT JOIN purchase_order_items sei_poi ON sei.material_id = sei_poi.id
      WHERE vii.invoice_id = ?
    `, [id]);
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
      SELECT oc.*, rc.project_name, oc.root_card_id as project_id,
             v.gstin as vendor_gstin, v.state as vendor_state, v.city as vendor_city,
             v.pincode as vendor_pincode, v.address as vendor_address
      FROM outward_challans oc
      LEFT JOIN root_cards rc ON oc.root_card_id = rc.id
      LEFT JOIN vendors v ON oc.vendor_id = v.id
      WHERE oc.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Challan not found" });
    }

    const challan = rows[0];
    const [items] = await db.query(`
      SELECT oci.*, 
             COALESCE(s.material_grade, s_poi.material_grade, sei_poi.material_grade) as material_grade,
             COALESCE(s_poi.make, sei_poi.make) as make,
             COALESCE(s_poi.remark, sei_poi.remark) as remark,
             COALESCE(s.length, sei.length) as length,
             COALESCE(s.width, sei.width) as width,
             COALESCE(s.thickness, sei.thickness) as thickness,
             COALESCE(s.diameter, sei.diameter) as diameter,
             COALESCE(s.outer_diameter, sei.outer_diameter) as outer_diameter,
             COALESCE(s.height, sei.height) as height,
             COALESCE(s.side1, sei.side1) as side1,
             COALESCE(s.side2, sei.side2) as side2,
             COALESCE(s.side_s, sei.side_s) as side_s,
             COALESCE(s.side_s1, sei.side_s1) as side_s1,
             COALESCE(s.side_s2, sei.side_s2) as side_s2,
             COALESCE(s.web_thickness, sei.web_thickness) as web_thickness,
             COALESCE(s.flange_thickness, sei.flange_thickness) as flange_thickness
      FROM outward_challan_items oci
      -- If batch_no is a serial number
      LEFT JOIN inventory_serials s ON (oci.batch_no = s.serial_number AND oci.item_code = s.item_code)
      LEFT JOIN purchase_order_items s_poi ON s.item_id = s_poi.id
      -- If batch_no is an entry_no (stock entry number)
      LEFT JOIN stock_entries se ON oci.batch_no = se.entry_no
      LEFT JOIN stock_entry_items sei ON (se.id = sei.stock_entry_id AND oci.item_code = sei.item_code)
      LEFT JOIN purchase_order_items sei_poi ON sei.material_id = sei_poi.id
      WHERE oci.challan_id = ?
    `, [id]);
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
      SELECT ci.*, rc.project_name, rc.project_code
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
      SELECT ci.*, rc.project_name, rc.project_code
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
  console.log("createCustomerInvoice received body:", req.body);
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
      items,
      customer_address,
      customer_state_code,
      customer_gstin,
      challan_number,
      challan_date,
      po_number,
      po_date,
      transporter,
      lr_number
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
        balance_amount, round_off, notes, status,
        customer_address, customer_state_code, customer_gstin,
        challan_number, challan_date, po_number, po_date,
        transporter, lr_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoice_number, customer_name, effectiveProjectId, invoice_date,
        place_of_supply, sub_total, taxable_value, cgst_amount,
        sgst_amount, igst_amount, grand_total, grand_total,
        round_off, notes,
        customer_address || null, customer_state_code || null, customer_gstin || null,
        challan_number || null, challan_date ? (challan_date.split('T')[0] || null) : null,
        po_number || null, po_date ? (po_date.split('T')[0] || null) : null,
        transporter || null, lr_number || null
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
      notes,
      gst_tds,
      it_tds
    } = req.body;

    const effectiveInvoiceId = (invoice_id && invoice_id !== "") ? parseInt(invoice_id) : null;
    const parsedAmountReceived = parseFloat(amount_received) || 0;
    const parsedGstTds = parseFloat(gst_tds) || 0;
    const parsedItTds = parseFloat(it_tds) || 0;

    const [paymentResult] = await connection.query(
      `INSERT INTO customer_payments (
        receipt_number, invoice_id, customer_name, received_date, 
        amount_received, payment_method, transaction_ref, notes, status,
        gst_tds, it_tds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?)`,
      [
        receipt_number, 
        effectiveInvoiceId, 
        customer_name, 
        received_date, 
        parsedAmountReceived, 
        payment_method, 
        transaction_ref || null, 
        notes || null,
        parsedGstTds,
        parsedItTds
      ]
    );

    if (effectiveInvoiceId) {
      const [invoiceRows] = await connection.query(
        "SELECT grand_total, paid_amount, gst_tds, it_tds FROM customer_invoices WHERE id = ?",
        [effectiveInvoiceId]
      );

      if (invoiceRows.length > 0) {
        const currentPaid = parseFloat(invoiceRows[0].paid_amount) || 0;
        const grandTotal = parseFloat(invoiceRows[0].grand_total) || 0;
        const currentGstTds = parseFloat(invoiceRows[0].gst_tds) || 0;
        const currentItTds = parseFloat(invoiceRows[0].it_tds) || 0;

        const newPaidAmount = currentPaid + parsedAmountReceived;
        const newGstTds = currentGstTds + parsedGstTds;
        const newItTds = currentItTds + parsedItTds;

        const balanceAmount = grandTotal - newPaidAmount - newGstTds - newItTds;
        const totalSettled = newPaidAmount + newGstTds + newItTds;
        const status = balanceAmount <= 0 ? 'PAID' : (totalSettled > 0 ? 'PARTIAL' : 'PENDING');

        await connection.query(
          "UPDATE customer_invoices SET paid_amount = ?, balance_amount = ?, gst_tds = ?, it_tds = ?, status = ? WHERE id = ?",
          [newPaidAmount, balanceAmount, newGstTds, newItTds, status, effectiveInvoiceId]
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

    // Entry 1.1: Credit GST TDS Receivable (if applicable)
    if (parsedGstTds > 0) {
      await connection.query(
        `INSERT INTO ledger_entries (date, reference_no, description, account_name, debit, credit, transaction_type, related_id)
         VALUES (?, ?, ?, 'GST TDS Receivable', 0, ?, 'PAYMENT_RECEIVED', ?)`,
        [received_date, receipt_number, `GST TDS deducted by ${customer_name}`, parsedGstTds, paymentResult.insertId]
      );
    }

    // Entry 1.2: Credit TDS Receivable (if applicable)
    if (parsedItTds > 0) {
      await connection.query(
        `INSERT INTO ledger_entries (date, reference_no, description, account_name, debit, credit, transaction_type, related_id)
         VALUES (?, ?, ?, 'TDS Receivable', 0, ?, 'PAYMENT_RECEIVED', ?)`,
        [received_date, receipt_number, `Income Tax TDS deducted by ${customer_name}`, parsedItTds, paymentResult.insertId]
      );
    }

    // Entry 2: Debit Customer/Accounts Receivable (Swapped for Statement Style)
    const totalAdjusted = parsedAmountReceived + parsedGstTds + parsedItTds;
    await connection.query(
      `INSERT INTO ledger_entries (date, reference_no, description, account_name, debit, credit, transaction_type, related_id)
       VALUES (?, ?, ?, ?, ?, 0, 'PAYMENT_RECEIVED', ?)`,
      [received_date, receipt_number, `Payment received from ${customer_name}`, "Accounts Receivable", totalAdjusted, paymentResult.insertId]
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

const updateCustomerInvoice = async (req, res) => {
  const { id } = req.params;
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
      items,
      customer_address,
      customer_state_code,
      customer_gstin,
      challan_number,
      challan_date,
      po_number,
      po_date,
      transporter,
      lr_number
    } = req.body;

    // Resolve internal ID if public_id is provided
    let effectiveProjectId = project_id;
    if (effectiveProjectId) {
      const [cards] = await connection.query('SELECT id FROM root_cards WHERE id = ? OR public_id = ?', [effectiveProjectId, effectiveProjectId]);
      if (cards.length > 0) effectiveProjectId = cards[0].id;
    }

    // Get current paid amount and TDS to calculate new balance
    const [currentRows] = await connection.query(
      "SELECT paid_amount, gst_tds, it_tds FROM customer_invoices WHERE id = ?",
      [id]
    );
    const paidAmount = currentRows.length > 0 ? parseFloat(currentRows[0].paid_amount) || 0 : 0;
    const gstTds = currentRows.length > 0 ? parseFloat(currentRows[0].gst_tds) || 0 : 0;
    const itTds = currentRows.length > 0 ? parseFloat(currentRows[0].it_tds) || 0 : 0;
    const balanceAmount = grand_total - paidAmount - gstTds - itTds;
    const totalSettled = paidAmount + gstTds + itTds;
    const status = balanceAmount <= 0 ? 'PAID' : (totalSettled > 0 ? 'PARTIAL' : 'PENDING');

    await connection.query(
      `UPDATE customer_invoices SET 
        invoice_number = ?, customer_name = ?, project_id = ?, invoice_date = ?, 
        place_of_supply = ?, sub_total = ?, taxable_value = ?, cgst_amount = ?, 
        sgst_amount = ?, igst_amount = ?, grand_total = ?, balance_amount = ?, 
        round_off = ?, notes = ?, status = ?, customer_address = ?, 
        customer_state_code = ?, customer_gstin = ?,
        challan_number = ?, challan_date = ?, po_number = ?, po_date = ?,
        transporter = ?, lr_number = ?
      WHERE id = ?`,
      [
        invoice_number, customer_name, effectiveProjectId, invoice_date,
        place_of_supply, sub_total, taxable_value, cgst_amount,
        sgst_amount, igst_amount, grand_total, balanceAmount,
        round_off, notes, status, customer_address || null,
        customer_state_code || null, customer_gstin || null,
        challan_number || null, challan_date ? (challan_date.split('T')[0] || null) : null,
        po_number || null, po_date ? (po_date.split('T')[0] || null) : null,
        transporter || null, lr_number || null,
        id
      ]
    );

    // Delete existing items
    await connection.query("DELETE FROM customer_invoice_items WHERE invoice_id = ?", [id]);

    // Insert new items
    if (items && items.length > 0) {
      const itemValues = items.map(item => [
        id,
        item.description,
        item.hsn_code || null,
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
    res.json({ message: "Customer invoice updated successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("Error updating customer invoice:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    connection.release();
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
  updateCustomerInvoice,
  getCustomerPayments,
  getNextReceiptNumber,
  createCustomerPayment,
  getLedgerEntries,
  getProjects,
  getInvoicesForSelection,
  getEligibleOutwardChallans,
  getOutwardChallanDetails,
  getProjectDocuments,
  createProjectDocument,
  updateProjectDocument,
  deleteProjectDocument,
  getReminders,
  createReminder,
  deleteReminder,
  getDashboardStats,
  calculateInitialReminderDate
};

async function getProjectDocuments(req, res) {
  try {
    const { search, projectId } = req.query;
    let query = `
      SELECT pd.*, rc.project_name, rc.project_code, u.full_name as uploaded_by_name
      FROM project_documents pd
      LEFT JOIN root_cards rc ON pd.project_id = rc.id
      LEFT JOIN users u ON pd.uploaded_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (projectId) {
      const [cards] = await db.query('SELECT id FROM root_cards WHERE id = ? OR public_id = ?', [projectId, projectId]);
      const effectiveId = cards.length > 0 ? cards[0].id : projectId;
      query += " AND pd.project_id = ?";
      params.push(effectiveId);
    }

    if (search) {
      query += " AND (pd.document_name LIKE ? OR rc.project_name LIKE ? OR rc.project_code LIKE ?)";
      const searchVal = `%${search}%`;
      params.push(searchVal, searchVal, searchVal);
    }

    query += " ORDER BY pd.created_at DESC";

    const [rows] = await db.query(query, params);
    res.json({ success: true, documents: rows });
  } catch (error) {
    console.error("Error fetching project documents:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

async function createProjectDocument(req, res) {
  try {
    const { project_id, document_name } = req.body;
    const uploaded_by = req.user.id;

    if (!project_id || !document_name) {
      return res.status(400).json({ success: false, message: "Project and Document Name are required" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const [cards] = await db.query('SELECT id FROM root_cards WHERE id = ? OR public_id = ?', [project_id, project_id]);
    const effectiveId = cards.length > 0 ? cards[0].id : project_id;

    const file_path = req.file.filename;
    const file_name = req.file.originalname;

    const [result] = await db.query(
      `INSERT INTO project_documents (project_id, document_name, file_path, file_name, uploaded_by)
       VALUES (?, ?, ?, ?, ?)`,
      [effectiveId, document_name, file_path, file_name, uploaded_by]
    );

    res.status(201).json({
      success: true,
      message: "Project document uploaded successfully",
      documentId: result.insertId
    });
  } catch (error) {
    console.error("Error creating project document:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

async function updateProjectDocument(req, res) {
  try {
    const { id } = req.params;
    const { project_id, document_name } = req.body;
    const path = require('path');
    const fs = require('fs');

    if (!project_id || !document_name) {
      return res.status(400).json({ success: false, message: "Project and Document Name are required" });
    }

    const [cards] = await db.query('SELECT id FROM root_cards WHERE id = ? OR public_id = ?', [project_id, project_id]);
    const effectiveId = cards.length > 0 ? cards[0].id : project_id;

    const [docs] = await db.query('SELECT file_path FROM project_documents WHERE id = ?', [id]);
    if (docs.length === 0) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    let file_path = docs[0].file_path;
    let file_name = null;

    if (req.file) {
      file_path = req.file.filename;
      file_name = req.file.originalname;

      const oldFileName = path.basename(docs[0].file_path);
      const oldFullPath = path.join(process.env.UPLOAD_PATH || 'uploads', oldFileName);
      if (fs.existsSync(oldFullPath)) {
        fs.unlinkSync(oldFullPath);
      }
    }

    if (req.file) {
      await db.query(
        `UPDATE project_documents 
         SET project_id = ?, document_name = ?, file_path = ?, file_name = ?
         WHERE id = ?`,
        [effectiveId, document_name, file_path, file_name, id]
      );
    } else {
      await db.query(
        `UPDATE project_documents 
         SET project_id = ?, document_name = ?
         WHERE id = ?`,
        [effectiveId, document_name, id]
      );
    }

    res.json({ success: true, message: "Document updated successfully" });
  } catch (error) {
    console.error("Error updating project document:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

async function deleteProjectDocument(req, res) {
  try {
    const { id } = req.params;
    const path = require('path');
    const fs = require('fs');

    const [docs] = await db.query('SELECT file_path FROM project_documents WHERE id = ?', [id]);
    if (docs.length === 0) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    const filePath = docs[0].file_path;

    await db.query('DELETE FROM project_documents WHERE id = ?', [id]);

    if (filePath) {
      const fileName = path.basename(filePath);
      const fullPath = path.join(process.env.UPLOAD_PATH || 'uploads', fileName);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    res.json({ success: true, message: "Document deleted successfully" });
  } catch (error) {
    console.error("Error deleting project document:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

function calculateInitialReminderDate(recurrence, day, month, selectedDate) {
  if (recurrence === 'once') {
    return selectedDate;
  }
  
  // Get "today" in local components, but map it to a UTC date representing today at midnight UTC
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const targetDate = todayUTC; // targetDate is today

  if (recurrence === 'monthly') {
    let year = targetDate.getUTCFullYear();
    let m = targetDate.getUTCMonth(); // 0-11
    
    const maxDays = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
    const candidateDay = Math.min(day || 1, maxDays);
    const candidateDate = new Date(Date.UTC(year, m, candidateDay));
    
    if (candidateDate >= targetDate) {
      return candidateDate.toISOString().split('T')[0];
    } else {
      m += 1;
      if (m > 11) {
        m = 0;
        year += 1;
      }
      const maxDaysNext = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
      const targetDayNext = Math.min(day || 1, maxDaysNext);
      return new Date(Date.UTC(year, m, targetDayNext)).toISOString().split('T')[0];
    }
  }

  if (recurrence === 'yearly') {
    let year = targetDate.getUTCFullYear();
    const targetMonth = (month || 1) - 1; // 0-based
    
    const maxDays = new Date(Date.UTC(year, targetMonth + 1, 0)).getUTCDate();
    const targetDay = Math.min(day || 1, maxDays);
    const candidateDate = new Date(Date.UTC(year, targetMonth, targetDay));
    
    if (candidateDate >= targetDate) {
      return candidateDate.toISOString().split('T')[0];
    } else {
      year += 1;
      const maxDaysNext = new Date(Date.UTC(year, targetMonth + 1, 0)).getUTCDate();
      const targetDayNext = Math.min(day || 1, maxDaysNext);
      return new Date(Date.UTC(year, targetMonth, targetDayNext)).toISOString().split('T')[0];
    }
  }

  return selectedDate;
}

async function getReminders(req, res) {
  try {
    const { search, recurrence, is_triggered, sortBy, sortOrder, page, limit } = req.query;
    
    let query = `
      SELECT id, title, description, DATE_FORMAT(reminder_date, "%Y-%m-%d") as reminder_date, 
             email, recurrence, recurrence_day, recurrence_month, is_triggered, created_at 
      FROM financial_reminders 
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += " AND (title LIKE ? OR description LIKE ? OR email LIKE ?)";
      const searchVal = `%${search}%`;
      params.push(searchVal, searchVal, searchVal);
    }

    if (recurrence) {
      query += " AND recurrence = ?";
      params.push(recurrence);
    }

    if (is_triggered !== undefined && is_triggered !== '') {
      query += " AND is_triggered = ?";
      params.push(parseInt(is_triggered));
    }

    // Sorting
    const safeSortColumns = ['title', 'reminder_date', 'email', 'recurrence', 'is_triggered', 'created_at'];
    const effectiveSortBy = safeSortColumns.includes(sortBy) ? sortBy : 'reminder_date';
    const effectiveSortOrder = sortOrder && sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${effectiveSortBy} ${effectiveSortOrder}`;

    // Total count before pagination
    let countQuery = `SELECT COUNT(*) as count FROM (${query}) as subquery`;
    const [[countResult]] = await db.query(countQuery, params);
    const total = countResult.count;

    // Pagination
    if (page && limit) {
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;
      query += " LIMIT ? OFFSET ?";
      params.push(limitNum, offset);
    }

    const [rows] = await db.query(query, params);
    
    res.json({ 
      success: true, 
      reminders: rows, 
      total,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : rows.length
    });
  } catch (error) {
    console.error("Error fetching financial reminders:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

async function createReminder(req, res) {
  try {
    const { title, description, reminder_date, email, recurrence, recurrence_day, recurrence_month } = req.body;
    if (!title || !email || (!reminder_date && recurrence === 'once') || (recurrence === 'monthly' && !recurrence_day) || (recurrence === 'yearly' && (!recurrence_day || !recurrence_month))) {
      return res.status(400).json({ success: false, message: "Missing required reminder fields" });
    }

    const finalReminderDate = calculateInitialReminderDate(
      recurrence || 'once',
      recurrence_day ? parseInt(recurrence_day) : null,
      recurrence_month ? parseInt(recurrence_month) : null,
      reminder_date
    );

    await db.query(
      'INSERT INTO financial_reminders (title, description, reminder_date, email, recurrence, recurrence_day, recurrence_month) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        title,
        description || '',
        finalReminderDate,
        email,
        recurrence || 'once',
        recurrence_day ? parseInt(recurrence_day) : null,
        recurrence_month ? parseInt(recurrence_month) : null
      ]
    );

    res.status(201).json({ success: true, message: "Reminder set successfully" });
  } catch (error) {
    console.error("Error creating financial reminder:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

async function deleteReminder(req, res) {
  try {
    const { id } = req.params;
    const [result] = await db.query('DELETE FROM financial_reminders WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Reminder not found" });
    }

    res.json({ success: true, message: "Reminder deleted successfully" });
  } catch (error) {
    console.error("Error deleting financial reminder:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

async function getDashboardStats(req, res) {
  try {
    const now = new Date();
    
    // Date boundaries
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Format dates for SQL
    const formatDate = (d) => d.toISOString().split('T')[0];
    
    const tms = formatDate(thisMonthStart);
    const tme = formatDate(thisMonthEnd);
    const lms = formatDate(lastMonthStart);
    const lme = formatDate(lastMonthEnd);

    // 1. Total Receivable (Current Outstanding Customer Invoices)
    const [[receivableRow]] = await db.query(
      "SELECT COALESCE(SUM(balance_amount), 0) as total FROM customer_invoices WHERE status != 'CANCELLED'"
    );
    const totalReceivable = parseFloat(receivableRow.total);

    // Receivable Change (New customer invoices this month vs last month)
    const [[receivableThisMonthRow]] = await db.query(
      "SELECT COALESCE(SUM(grand_total), 0) as total FROM customer_invoices WHERE status != 'CANCELLED' AND invoice_date BETWEEN ? AND ?",
      [tms, tme]
    );
    const [[receivableLastMonthRow]] = await db.query(
      "SELECT COALESCE(SUM(grand_total), 0) as total FROM customer_invoices WHERE status != 'CANCELLED' AND invoice_date BETWEEN ? AND ?",
      [lms, lme]
    );
    const recThisMonth = parseFloat(receivableThisMonthRow.total);
    const recLastMonth = parseFloat(receivableLastMonthRow.total);
    const recChangePercent = recLastMonth > 0 ? ((recThisMonth - recLastMonth) / recLastMonth) * 100 : 0;

    // 2. Total Payable (Current Outstanding Vendor Invoices)
    const [[payableRow]] = await db.query(
      "SELECT COALESCE(SUM(balance_amount), 0) as total FROM vendor_invoices WHERE status != 'CANCELLED'"
    );
    const totalPayable = parseFloat(payableRow.total);

    // Payable Change (New vendor invoices this month vs last month)
    const [[payableThisMonthRow]] = await db.query(
      "SELECT COALESCE(SUM(grand_total), 0) as total FROM vendor_invoices WHERE status != 'CANCELLED' AND invoice_date BETWEEN ? AND ?",
      [tms, tme]
    );
    const [[payableLastMonthRow]] = await db.query(
      "SELECT COALESCE(SUM(grand_total), 0) as total FROM vendor_invoices WHERE status != 'CANCELLED' AND invoice_date BETWEEN ? AND ?",
      [lms, lme]
    );
    const payThisMonth = parseFloat(payableThisMonthRow.total);
    const payLastMonth = parseFloat(payableLastMonthRow.total);
    const payChangePercent = payLastMonth > 0 ? ((payThisMonth - payLastMonth) / payLastMonth) * 100 : 0;

    // 3. Current Cash (Total customer payments - Total vendor payments)
    const [[custPaymentsRow]] = await db.query(
      "SELECT COALESCE(SUM(amount_received), 0) as total FROM customer_payments WHERE status != 'CANCELLED'"
    );
    const [[vendPaymentsRow]] = await db.query(
      "SELECT COALESCE(SUM(amount_paid), 0) as total FROM vendor_payments WHERE status != 'CANCELLED'"
    );
    const totalCustPayments = parseFloat(custPaymentsRow.total);
    const totalVendPayments = parseFloat(vendPaymentsRow.total);
    const currentCash = totalCustPayments - totalVendPayments;

    // Cash flow this month
    const [[custPayThisMonthRow]] = await db.query(
      "SELECT COALESCE(SUM(amount_received), 0) as total FROM customer_payments WHERE status != 'CANCELLED' AND received_date BETWEEN ? AND ?",
      [tms, tme]
    );
    const [[vendPayThisMonthRow]] = await db.query(
      "SELECT COALESCE(SUM(amount_paid), 0) as total FROM vendor_payments WHERE status != 'CANCELLED' AND payment_date BETWEEN ? AND ?",
      [tms, tme]
    );
    const cashInThisMonth = parseFloat(custPayThisMonthRow.total);
    const cashOutThisMonth = parseFloat(vendPayThisMonthRow.total);
    const cashFlowThisMonth = cashInThisMonth - cashOutThisMonth;

    // Cash flow last month
    const [[custPayLastMonthRow]] = await db.query(
      "SELECT COALESCE(SUM(amount_received), 0) as total FROM customer_payments WHERE status != 'CANCELLED' AND received_date BETWEEN ? AND ?",
      [lms, lme]
    );
    const [[vendPayLastMonthRow]] = await db.query(
      "SELECT COALESCE(SUM(amount_paid), 0) as total FROM vendor_payments WHERE status != 'CANCELLED' AND payment_date BETWEEN ? AND ?",
      [lms, lme]
    );
    const cashInLastMonth = parseFloat(custPayLastMonthRow.total);
    const cashOutLastMonth = parseFloat(vendPayLastMonthRow.total);
    const cashFlowLastMonth = cashInLastMonth - cashOutLastMonth;
    const cashChangePercent = cashFlowLastMonth > 0 ? ((cashFlowThisMonth - cashFlowLastMonth) / cashFlowLastMonth) * 100 : 0;

    // 4. Monthly Revenue (Sum of customer invoices grand_total for this month)
    const [[revenueThisMonthRow]] = await db.query(
      "SELECT COALESCE(SUM(grand_total), 0) as total FROM customer_invoices WHERE status != 'CANCELLED' AND invoice_date BETWEEN ? AND ?",
      [tms, tme]
    );
    const [[revenueLastMonthRow]] = await db.query(
      "SELECT COALESCE(SUM(grand_total), 0) as total FROM customer_invoices WHERE status != 'CANCELLED' AND invoice_date BETWEEN ? AND ?",
      [lms, lme]
    );
    const revenueThisMonth = parseFloat(revenueThisMonthRow.total);
    const revenueLastMonth = parseFloat(revenueLastMonthRow.total);
    const revChangePercent = revenueLastMonth > 0 ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 : 0;

    res.json({
      success: true,
      stats: {
        receivable: {
          value: totalReceivable,
          change: (recChangePercent >= 0 ? "+" : "") + recChangePercent.toFixed(1) + "%",
          positive: recChangePercent >= 0
        },
        payable: {
          value: totalPayable,
          change: (payChangePercent >= 0 ? "+" : "") + payChangePercent.toFixed(1) + "%",
          positive: payChangePercent < 0 // A decrease in payable is a positive trend
        },
        cash: {
          value: currentCash,
          change: (cashChangePercent >= 0 ? "+" : "") + cashChangePercent.toFixed(1) + "%",
          positive: cashChangePercent >= 0
        },
        revenue: {
          value: revenueThisMonth,
          change: (revChangePercent >= 0 ? "+" : "") + revChangePercent.toFixed(1) + "%",
          positive: revChangePercent >= 0
        }
      }
    });
  } catch (error) {
    console.error("Error fetching accounting dashboard stats:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}
