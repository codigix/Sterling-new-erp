const db = require('../config/db');

const createMaterialRequest = async (req, res) => {
  const { bomId, projectId, rootCardId, remarks, items } = req.body;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Resolve internal ID if public_id is provided
    const [cards] = await connection.query('SELECT id, project_name FROM root_cards WHERE id = ? OR public_id = ?', [rootCardId, rootCardId]);
    const effectiveRootCardId = cards.length > 0 ? cards[0].id : rootCardId;

    // Resolve internal BOM ID if public_id is provided
    const [bomLookup] = await connection.query('SELECT id, bom_number FROM boms WHERE id = ? OR public_id = ?', [bomId, bomId]);
    const effectiveBomId = bomLookup.length > 0 ? bomLookup[0].id : bomId;
    const bomNumberSnapshot = bomLookup.length > 0 ? bomLookup[0].bom_number : 'N/A';

    // Project Name snapshot
    const projectNameSnapshot = cards.length > 0 ? cards[0].project_name : 'N/A';

    // Generate Request Number
    const year = new Date().getFullYear();
    const pattern = `MR-${year}-%`;
    const [lastRequest] = await connection.query(
      'SELECT request_number FROM material_requests WHERE request_number LIKE ? ORDER BY request_number DESC LIMIT 1',
      [pattern]
    );

    let nextNum = 1;
    if (lastRequest.length > 0) {
      const lastRequestNumber = lastRequest[0].request_number;
      const parts = lastRequestNumber.split('-');
      if (parts.length >= 3) {
        const lastNum = parseInt(parts[2]);
        if (!isNaN(lastNum)) {
          nextNum = lastNum + 1;
        }
      }
    }
    const requestNumber = `MR-${year}-${nextNum.toString().padStart(4, '0')}`;

    // 1. Insert into material_requests
    const [requestResult] = await connection.query(
      `INSERT INTO material_requests 
      (bom_id, request_number, status, department, project_id, root_card_id, created_by, remarks, bom_number, project_name) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [effectiveBomId, requestNumber, 'pending', 'Production', projectId || null, effectiveRootCardId || null, req.user?.id || null, remarks || '', bomNumberSnapshot, projectNameSnapshot]
    );

    const requestId = requestResult.insertId;

    // 1.1 Update BOM status to 'request_sent'
    await connection.query('UPDATE boms SET status = ? WHERE id = ?', ['request_sent', effectiveBomId]);

    // 1.2 Update Root Card status to 'MATERIAL_PLANNING'
    if (effectiveRootCardId) {
      await connection.query(
        'UPDATE root_cards SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
        ['MATERIAL_PLANNING', effectiveRootCardId]
      );
    }

    // 2. Insert items
    if (items && items.length > 0) {
      const itemValues = items.map(item => [
        requestId,
        item.itemName,
        item.itemGroup || null,
        item.materialGrade || null,
        item.partDetail || null,
        item.make || null,
        item.quantity || 0,
        item.uom || '',
        item.remark || '',
        item.warehouse || null,
        item.operation || null,
        item.length || 0,
        item.width || 0,
        item.thickness || 0,
        item.diameter || 0,
        item.outerDiameter || 0,
        item.height || 0,
        item.side1 || 0,
        item.side2 || 0,
        item.web_thickness || item.webThickness || 0,
        item.flange_thickness || item.flangeThickness || 0,
        item.materialType || item.material_type || null,
        item.density || 0,
        item.unitWeight || item.unit_weight || item.calculatedWeight || 0,
        item.totalWeight || item.total_weight || 0,
        item.itemsPerPacket || item.items_per_packet || 1
      ]);

      await connection.query(
        `INSERT INTO material_request_items 
        (material_request_id, item_name, item_group, material_grade, part_detail, make, required_quantity, uom, remark, warehouse, operation, length, width, thickness, diameter, outer_diameter, height, side1, side2, web_thickness, flange_thickness, material_type, density, unit_weight, total_weight, items_per_packet) 
        VALUES ?`,
        [itemValues]
      );
    }

    // 3. Create notification for Procurement
    try {
        const notifMessage = `New Material Request ${requestNumber} received from Production for project ${projectNameSnapshot !== 'N/A' ? projectNameSnapshot : 'N/A'}`;
        const metadata = JSON.stringify({ rootCardId: effectiveRootCardId, requestId: requestId });
        const link = `/department/procurement/material-requests?rootCardId=${effectiveRootCardId}`;

        await connection.query(
            `INSERT INTO notifications (user_id, title, message, type, department, link, metadata) 
             SELECT id, 'New Material Request', ?, 'material_request', 'procurement', ?, ?
             FROM users WHERE LOWER(role) = 'procurement' OR LOWER(role) = 'admin'`,
            [notifMessage, link, metadata]
        );
    } catch (notifErr) {
        console.error('Error creating notification:', notifErr);
    }

    await connection.commit();
    res.status(201).json({ message: 'Material request sent successfully', requestId, requestNumber });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating material request:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

const getMaterialRequests = async (req, res) => {
  try {
    const { department, status, projectId, rootCardId, type } = req.query;
    let query = `
      SELECT mr.*, 
             COALESCE(mr.bom_number, b.bom_number) as bom_number, 
             COALESCE(mr.project_name, rc.project_name) as project_name 
      FROM material_requests mr
      LEFT JOIN boms b ON mr.bom_id = b.id
      LEFT JOIN root_cards rc ON mr.root_card_id = rc.id
      WHERE 1=1
    `;
    const params = [];

    if (department) {
      query += " AND mr.department = ?";
      params.push(department);
    }
    if (status) {
      query += " AND mr.status = ?";
      params.push(status);
    }
    if (type) {
      query += " AND mr.type = ?";
      params.push(type);
    }
    if (projectId) {
        // Resolve internal ID if public_id is provided
        const [cards] = await db.query('SELECT id FROM root_cards WHERE id = ? OR public_id = ?', [projectId, projectId]);
        const effectiveId = cards.length > 0 ? cards[0].id : projectId;
        
        query += " AND mr.project_id = ?";
        params.push(effectiveId);
    }
    if (rootCardId) {
        // Resolve internal ID if public_id is provided
        const [cards] = await db.query('SELECT id FROM root_cards WHERE id = ? OR public_id = ?', [rootCardId, rootCardId]);
        const effectiveId = cards.length > 0 ? cards[0].id : rootCardId;
        
        query += " AND mr.root_card_id = ?";
        params.push(effectiveId);
    }

    query += " ORDER BY mr.created_at DESC";

    const [requests] = await db.query(query, params);
    res.json({ success: true, materialRequests: requests, data: requests });
  } catch (error) {
    console.error('Error fetching material requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// For shortage requests auto-created on GRN material release, resolve the GRN named in the
// remarks ("Shortage from GRN <no> (PO: <no>)") and return where the shortage came from.
// Uses the same accepted/rejected rules as releaseGRNMaterial. Returns null if it can't be resolved.
const getShortageSource = async (request) => {
  const match = /GRN\s+(\S+)/i.exec(request.remarks || '');
  if (!match) return null;

  const [grnRows] = await db.query(
    `SELECT g.id, g.grn_number, g.posting_date, g.status, g.inspection_type,
            po.id AS po_id, po.po_number, v.name AS vendor_name, iv.name AS inspection_vendor_name
     FROM grns g
     LEFT JOIN purchase_orders po ON g.purchase_order_id = po.id
     LEFT JOIN vendors v ON g.vendor_id = v.id
     LEFT JOIN vendors iv ON g.inspection_vendor_id = iv.id
     WHERE g.grn_number = ?`,
    [match[1]]
  );
  if (grnRows.length === 0) return null;
  const grn = grnRows[0];

  const [items] = await db.query(
    `SELECT gi.po_item_id, gi.item_code, gi.material_name, gi.item_group, gi.ordered_qty, gi.received_qty, gi.unit,
            qi.status AS inspection_status, qi.remarks AS inspection_remarks,
            qi.common_document_path, qi.rejected_document_path
     FROM grn_items gi
     LEFT JOIN quality_inspections qi ON qi.grn_id = gi.grn_id AND qi.po_item_id = gi.po_item_id
     WHERE gi.grn_id = ?`,
    [grn.id]
  );
  const [serials] = await db.query(
    'SELECT item_id, inspection_status FROM inventory_serials WHERE grn_id = ?',
    [grn.id]
  );

  const sourceItems = items.map((item) => {
    const itemSerials = serials.filter((s) => s.item_id === item.po_item_id);
    const received = parseFloat(item.received_qty) || 0;
    let accepted = 0;
    let rejected = 0;
    if ((item.unit || '').toLowerCase() === 'nos') {
      accepted = itemSerials.filter((s) => s.inspection_status === 'Accepted').length;
      rejected = itemSerials.filter((s) => s.inspection_status === 'Rejected').length;
    } else if (itemSerials.some((s) => s.inspection_status === 'Accepted')) {
      accepted = received;
    } else if (itemSerials.some((s) => s.inspection_status === 'Rejected')) {
      rejected = received;
    }
    const ordered = parseFloat(item.ordered_qty) || 0;

    return {
      item_code: item.item_code,
      material_name: item.material_name,
      item_group: item.item_group,
      unit: item.unit,
      ordered_qty: ordered,
      received_qty: received,
      accepted_qty: accepted,
      rejected_qty: rejected,
      shortage_qty: Math.max(0, ordered - accepted),
      inspection_status: item.inspection_status,
      inspection_remarks: item.inspection_remarks,
      accepted_report: item.common_document_path,
      rejected_report: item.rejected_document_path
    };
  });

  return {
    grn_id: grn.id,
    grn_number: grn.grn_number,
    grn_date: grn.posting_date,
    grn_status: grn.status,
    inspection_type: grn.inspection_type,
    inspection_vendor_name: grn.inspection_vendor_name,
    po_id: grn.po_id,
    po_number: grn.po_number,
    vendor_name: grn.vendor_name,
    items: sourceItems
  };
};

const getMaterialRequestById = async (req, res) => {
  const { id } = req.params;
  try {
    const [requestRows] = await db.query(`
      SELECT mr.*, 
             COALESCE(mr.bom_number, b.bom_number) as bom_number, 
             COALESCE(mr.project_name, rc.project_name) as project_name, 
             rc.po_number
      FROM material_requests mr
      LEFT JOIN boms b ON mr.bom_id = b.id
      LEFT JOIN root_cards rc ON mr.root_card_id = rc.id
      WHERE mr.id = ?
    `, [id]);

    if (requestRows.length === 0) {
      return res.status(404).json({ message: 'Material request not found' });
    }

    const [items] = await db.query('SELECT * FROM material_request_items WHERE material_request_id = ?', [id]);

    // Fetch approved quotation if any
    const [quotations] = await db.query(
      `SELECT id, quotation_number, vendor_id, total_amount, received_quotation_path, status 
       FROM quotations 
       WHERE material_request_id = ? AND status = 'approved' AND type = 'inbound'
       ORDER BY created_at DESC LIMIT 1`, 
      [id]
    );

    let shortageSource = null;
    if (requestRows[0].type === 'shortage') {
      try {
        shortageSource = await getShortageSource(requestRows[0]);
      } catch (sourceError) {
        // Source info is display-only; never fail the request details because of it
        console.error('Error resolving shortage source:', sourceError.message);
      }
    }

    res.json({
      success: true,
      data: {
        ...requestRows[0],
        items,
        quotation: quotations.length > 0 ? quotations[0] : null,
        shortageSource
      },
      materialRequest: {
        ...requestRows[0],
        items,
        quotation: quotations.length > 0 ? quotations[0] : null,
        shortageSource
      }
    });
  } catch (error) {
    console.error('Error fetching material request details:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateRequestStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await db.query('UPDATE material_requests SET status = ? WHERE id = ?', [status, id]);
        res.json({ success: true, message: 'Status updated successfully' });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
  createMaterialRequest,
  getMaterialRequests,
  getMaterialRequestById,
  updateRequestStatus
};
