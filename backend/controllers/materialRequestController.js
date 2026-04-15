const db = require('../config/db');

const createMaterialRequest = async (req, res) => {
  const { bomId, projectId, rootCardId, remarks, items } = req.body;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Fetch BOM details for snapshot
    const [bomRows] = await connection.query('SELECT bom_number FROM boms WHERE id = ?', [bomId]);
    const bomNumberSnapshot = bomRows.length > 0 ? bomRows[0].bom_number : 'N/A';

    // Fetch Project Name snapshot
    let projectNameSnapshot = 'N/A';
    if (rootCardId) {
      const [rcRows] = await connection.query('SELECT project_name FROM root_cards WHERE id = ?', [rootCardId]);
      if (rcRows.length > 0) projectNameSnapshot = rcRows[0].project_name;
    }

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
      [bomId, requestNumber, 'pending', 'Production', projectId || null, rootCardId || null, req.user?.id || null, remarks || '', bomNumberSnapshot, projectNameSnapshot]
    );

    const requestId = requestResult.insertId;

    // 1.1 Update BOM status to 'request_sent'
    await connection.query('UPDATE boms SET status = ? WHERE id = ?', ['request_sent', bomId]);

    // 1.2 Update Root Card status to 'MATERIAL_PLANNING'
    if (rootCardId) {
      await connection.query(
        'UPDATE root_cards SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
        ['MATERIAL_PLANNING', rootCardId]
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
        item.totalWeight || item.total_weight || 0
      ]);

      await connection.query(
        `INSERT INTO material_request_items 
        (material_request_id, item_name, item_group, material_grade, part_detail, make, required_quantity, uom, remark, warehouse, operation, length, width, thickness, diameter, outer_diameter, height, side1, side2, web_thickness, flange_thickness, material_type, density, unit_weight, total_weight) 
        VALUES ?`,
        [itemValues]
      );
    }

    // 3. Create notification for Procurement
    try {
        const notifMessage = `New Material Request ${requestNumber} received from Production for project ${projectNameSnapshot !== 'N/A' ? projectNameSnapshot : 'N/A'}`;
        const metadata = JSON.stringify({ rootCardId: rootCardId, requestId: requestId });
        const link = `/department/procurement/material-requests?rootCardId=${rootCardId}`;

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
        query += " AND mr.project_id = ?";
        params.push(projectId);
    }
    if (rootCardId) {
        query += " AND mr.root_card_id = ?";
        params.push(rootCardId);
    }

    query += " ORDER BY mr.created_at DESC";

    const [requests] = await db.query(query, params);
    res.json({ success: true, materialRequests: requests, data: requests });
  } catch (error) {
    console.error('Error fetching material requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
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

    res.json({ 
      success: true, 
      data: {
        ...requestRows[0],
        items,
        quotation: quotations.length > 0 ? quotations[0] : null
      },
      materialRequest: {
        ...requestRows[0],
        items,
        quotation: quotations.length > 0 ? quotations[0] : null
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
