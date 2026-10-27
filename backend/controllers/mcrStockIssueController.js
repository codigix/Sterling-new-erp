const db = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

// "Take from Stock" for the Material Cutting Report (MCR).
// The MCR form lists QC-accepted pieces from inventory (getStockPiecesForMCR); picking one only adds
// it to the form. Nothing leaves stock until the MCR is finalized: saveMCR then calls
// issuePiecesInTransaction for the picked pieces that were actually used in the report, inside the
// MCR's own transaction. That writes exactly what GRN "Release Material" writes (a 'Material Issue'
// stock entry, a stock ledger OUT row, pieces marked 'Used' + linked to that entry), so the existing
// cutting / consumed / off-cut flow works unchanged.

// QC values that mean a piece passed QC ("C"/"CUT" = cut in an MCR; only accepted material is cut)
const ACCEPTED_QC = ['Accepted', 'C', 'CUT'];

// Find the stock-ledger line (item code + name + unit + project + vendor) a piece belongs to, so the
// OUT row reduces that same line in Inventory's stock balance
const resolveStockLine = async (conn, serial, cache) => {
  const cacheKey = `${serial.grn_id || ''}|${String(serial.item_name).trim()}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  let line = null;
  if (serial.grn_id) {
    const [rows] = await conn.query(
      `SELECT l.item_code, l.material_name, l.uom, l.project_name, l.vendor_name
       FROM stock_ledger l
       JOIN grns g ON g.id = ?
       WHERE l.actual_qty > 0 AND TRIM(l.material_name) = TRIM(?) AND l.remarks = CONCAT('Receipt against ', g.grn_number)
       ORDER BY l.id DESC LIMIT 1`,
      [serial.grn_id, serial.item_name]
    );
    line = rows[0] || null;
  }
  if (!line) {
    // Off-cuts and manual entries: the line for this material that still has stock
    const [rows] = await conn.query(
      `SELECT item_code, material_name, uom, project_name, vendor_name, SUM(actual_qty) AS balance
       FROM stock_ledger
       WHERE TRIM(material_name) = TRIM(?)
       GROUP BY item_code, material_name, uom, project_name, vendor_name
       HAVING balance > 0
       ORDER BY balance DESC LIMIT 1`,
      [serial.item_name]
    );
    line = rows[0] || null;
  }

  if (line) {
    const [bal] = await conn.query(
      `SELECT COALESCE(SUM(actual_qty), 0) AS balance FROM stock_ledger
       WHERE item_code = ? AND material_name = ? AND uom <=> ? AND project_name <=> ? AND vendor_name <=> ?`,
      [line.item_code, line.material_name, line.uom, line.project_name, line.vendor_name]
    );
    line = { ...line, balance: parseFloat(bal[0].balance) || 0 };
  }
  cache.set(cacheKey, line);
  return line;
};

const PIECE_FIELDS = `s.serial_number, s.item_code AS serial_item_code, s.item_name, s.grn_id, s.purchase_order_id,
  s.status, s.inspection_status, s.location, s.length, s.width, s.thickness, s.diameter, s.outer_diameter, s.height,
  s.web_thickness, s.flange_thickness, s.side1, s.side2, s.side_s, s.side_s1, s.side_s2,
  s.unit_weight, s.total_weight, s.density, s.material_grade, s.item_group, s.material_type,
  s.items_per_packet, s.vendor_items_per_packet`;

// @route GET api/production/mcr/stock-pieces?project_names=A,B
// QC-accepted pieces in stock that can be used in an MCR (read-only; nothing is reserved)
const getStockPiecesForMCR = async (req, res) => {
  try {
    const [pieces] = await db.query(
      `SELECT ${PIECE_FIELDS} FROM inventory_serials s
       WHERE s.status = 'Available' AND s.inspection_status IN (?)
         AND (s.total_weight > 0.001 OR s.total_weight IS NULL)
       ORDER BY s.item_name, s.serial_number`,
      [ACCEPTED_QC]
    );

    const cache = new Map();
    const usedPerLine = new Map();
    const result = [];
    for (const piece of pieces) {
      const line = await resolveStockLine(db, piece, cache);
      if (!line) continue; // not on any stock line (ghost record) → can't be issued
      const lineKey = [line.item_code, line.material_name, line.uom, line.project_name, line.vendor_name].join('|');
      const used = usedPerLine.get(lineKey) || 0;
      if (used >= line.balance) continue; // more pieces than the ledger balance → only list what's in stock
      usedPerLine.set(lineKey, used + 1);
      result.push({
        ...piece,
        item_name: String(piece.item_name).trim(),
        item_code: line.item_code,
        uom: line.uom,
        source_project: line.project_name ? String(line.project_name).trim() : null,
        vendor_name: line.vendor_name
      });
    }

    // Root card ids of the MCR plan's projects (the form tags picked pieces with them)
    let projects = [];
    const names = String(req.query.project_names || '').split(',').map((n) => n.trim()).filter(Boolean);
    if (names.length > 0) {
      const [rows] = await db.query(
        'SELECT id AS root_card_id, project_name FROM root_cards WHERE TRIM(project_name) IN (?)',
        [names]
      );
      projects = rows.map((r) => ({ root_card_id: r.root_card_id, project_name: String(r.project_name).trim() }));
    }

    res.json({ success: true, pieces: result, projects });
  } catch (error) {
    console.error('Error fetching stock pieces for MCR:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Next STE-YYYY-NNNN number (same format as GRN release)
const nextEntryNo = async (conn) => {
  const year = new Date().getFullYear();
  const [rows] = await conn.query(
    'SELECT entry_no FROM stock_entries WHERE entry_no LIKE ? ORDER BY id DESC LIMIT 1',
    [`STE-${year}-%`]
  );
  let next = 1;
  if (rows.length > 0) {
    const last = parseInt(rows[0].entry_no.split('-').pop(), 10);
    if (!isNaN(last)) next = last + 1;
  }
  // Guard against a gap/duplicate from concurrent entries
  for (;;) {
    const candidate = `STE-${year}-${String(next).padStart(4, '0')}`;
    const [exists] = await conn.query('SELECT id FROM stock_entries WHERE entry_no = ?', [candidate]);
    if (exists.length === 0) return candidate;
    next += 1;
  }
};

const issueError = (status, message) => Object.assign(new Error(message), { status });

// Stock-out of picked pieces for a project. Runs on the caller's connection/transaction (saveMCR)
// and throws an error with .status (400/409) if anything is wrong, so the whole MCR save rolls back.
const issuePiecesInTransaction = async (connection, { projectName, serialNumbers, userName, ip }) => {
  const serials = [...new Set((serialNumbers || []).filter(Boolean))];
  if (serials.length === 0) return null;
  if (!projectName || !String(projectName).trim()) throw issueError(400, 'Project for the stock pieces is missing');

  const [cards] = await connection.query(
    'SELECT id, project_name FROM root_cards WHERE TRIM(project_name) = TRIM(?) LIMIT 1',
    [projectName]
  );
  if (cards.length === 0) throw issueError(400, `Project "${projectName}" not found`);
  const targetProject = cards[0].project_name;

  // Lock the pieces so two people cannot use the same piece
  const [pieces] = await connection.query(
    `SELECT ${PIECE_FIELDS} FROM inventory_serials s WHERE s.serial_number IN (?) FOR UPDATE`,
    [serials]
  );
  const problems = [];
  serials.forEach((sn) => {
    const p = pieces.find((x) => x.serial_number === sn);
    if (!p) problems.push(`${sn}: not found`);
    else if (p.status !== 'Available') problems.push(`${sn}: no longer in stock (status ${p.status})`);
    else if (!ACCEPTED_QC.includes(p.inspection_status)) problems.push(`${sn}: not QC accepted (${p.inspection_status || 'Pending'})`);
  });
  if (problems.length > 0) throw issueError(409, `Stock pieces could not be used: ${problems.join('; ')}`);

  // Group pieces by the stock line they come from (+ exact item name for the MCR list)
  const cache = new Map();
  const groups = new Map();
  for (const piece of pieces) {
    const line = await resolveStockLine(connection, piece, cache);
    if (!line) throw issueError(409, `${piece.serial_number}: no stock balance found in Inventory`);
    const key = [line.item_code, line.material_name, line.uom, line.project_name, line.vendor_name, String(piece.item_name).trim()].join('|');
    if (!groups.has(key)) groups.set(key, { line, itemName: piece.item_name, pieces: [] });
    groups.get(key).pieces.push(piece);
  }
  for (const g of groups.values()) {
    if (g.pieces.length > g.line.balance) {
      throw issueError(409, `Only ${g.line.balance} ${g.line.uom || ''} of ${String(g.itemName).trim()} left in Inventory stock`);
    }
  }

  const sourceProjects = [...new Set([...groups.values()].map((g) => (g.line.project_name || 'General stock').trim()))];
  const vendors = [...new Set([...groups.values()].map((g) => g.line.vendor_name).filter(Boolean))];
  const entryNo = await nextEntryNo(connection);
  const today = new Date().toISOString().split('T')[0];
  const targetLabel = String(targetProject).trim();

  const [entry] = await connection.query(
    `INSERT INTO stock_entries (entry_no, entry_type, entry_date, remarks, grn_id, project_name, vendor_name, status)
     VALUES (?, 'Material Issue', ?, ?, NULL, ?, ?, 'submitted')`,
    [entryNo, today, `Issued from stock for MCR (from ${sourceProjects.join(', ')})`, targetProject, vendors.length === 1 ? vendors[0] : null]
  );
  const entryId = entry.insertId;

  for (const g of groups.values()) {
    const first = g.pieces[0];
    const qty = g.pieces.length;
    const totalWeight = g.pieces.reduce((sum, p) => sum + (parseFloat(p.total_weight || p.unit_weight) || 0), 0);
    const unitWeight = parseFloat(first.unit_weight) || (qty > 0 ? totalWeight / qty : 0);

    await connection.query(
      `INSERT INTO stock_entry_items (
         stock_entry_id, item_code, item_name, quantity, uom, valuation_rate,
         length, width, thickness, diameter, outer_diameter, height,
         unit_weight, total_weight, density, item_group, web_thickness,
         flange_thickness, side_s, side_s1, side_s2, side1, side2, material_type,
         items_per_packet, vendor_items_per_packet
       ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entryId, g.line.item_code, g.itemName, qty, g.line.uom || 'Nos',
        first.length, first.width, first.thickness, first.diameter, first.outer_diameter, first.height,
        unitWeight, totalWeight, first.density || 0, first.item_group, first.web_thickness,
        first.flange_thickness, first.side_s, first.side_s1, first.side_s2, first.side1, first.side2, first.material_type,
        first.items_per_packet || 1, first.vendor_items_per_packet || first.items_per_packet || 1
      ]
    );

    // Stock ledger OUT on the same line the pieces were received on (same pattern as GRN release)
    const [lastBalance] = await connection.query(
      'SELECT balance_qty FROM stock_ledger WHERE item_code = ? ORDER BY id DESC LIMIT 1',
      [g.line.item_code]
    );
    const newBalance = (parseFloat(lastBalance[0]?.balance_qty) || 0) - qty;
    await connection.query(
      `INSERT INTO stock_ledger (
         item_code, material_name, posting_date, posting_time, voucher_type, voucher_no,
         actual_qty, uom, balance_qty, project_name, vendor_name, valuation_rate, remarks,
         length, width, thickness, diameter, outer_diameter, height, unit_weight, total_weight, density,
         item_group, web_thickness, flange_thickness, side_s, side_s1, side_s2, side1, side2, material_type,
         items_per_packet, vendor_items_per_packet
       ) VALUES (?, ?, ?, CURTIME(), 'Stock Entry', ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        g.line.item_code, g.line.material_name, today, entryNo,
        -qty, g.line.uom, newBalance, g.line.project_name, g.line.vendor_name,
        `Issued from stock to ${targetLabel} for MCR`,
        first.length, first.width, first.thickness, first.diameter, first.outer_diameter, first.height,
        unitWeight, -totalWeight, first.density || 0,
        first.item_group, first.web_thickness, first.flange_thickness, first.side_s, first.side_s1, first.side_s2,
        first.side1, first.side2, first.material_type,
        first.items_per_packet || 1, first.vendor_items_per_packet || first.items_per_packet || 1
      ]
    );
  }

  // Pieces now belong to this issue entry (the MCR cutting step then updates them as usual)
  const [updated] = await connection.query(
    "UPDATE inventory_serials SET status = 'Used', issued_in_entry_id = ? WHERE serial_number IN (?) AND status = 'Available'",
    [entryId, serials]
  );
  if (updated.affectedRows !== serials.length) {
    throw issueError(409, 'Some stock pieces were just used by someone else. Please refresh and try again.');
  }

  await connection.query(
    'INSERT INTO notifications (department, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
    [
      'Inventory',
      'Material taken from stock by Production',
      `${serials.length} piece(s) used from stock for ${targetLabel} in an MCR (${entryNo}): ${serials.join(', ')}`,
      'info',
      '/department/inventory/stock-entries'
    ]
  );

  // Audit is written by the caller after commit (logAudit uses its own connection, outside this transaction)
  return { entryNo, entryId, targetProject: targetLabel, serials, userName, ip };
};

// Call after the MCR transaction has committed
const logStockIssueAudit = (issue) =>
  logAudit(
    // audit_logs.type is an enum (auth/admin/export/account/security/system)
    issue.userName || 'Production', 'Issue From Stock', 'system',
    `${issue.entryNo}: ${issue.serials.join(', ')} used from stock for ${issue.targetProject} (MCR)`, issue.ip, 'success'
  ).catch(() => {});

module.exports = { getStockPiecesForMCR, issuePiecesInTransaction, logStockIssueAudit };
