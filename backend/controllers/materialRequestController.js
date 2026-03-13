const db = require('../config/db');

const createMaterialRequest = async (req, res) => {
  const { bomId, projectId, rootCardId, remarks, items } = req.body;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Generate Request Number
    const year = new Date().getFullYear();
    const [countRows] = await connection.query('SELECT COUNT(*) as count FROM material_requests');
    const nextNum = (countRows[0].count + 1).toString().padStart(4, '0');
    const requestNumber = `MR-${year}-${nextNum}`;

    // 1. Insert into material_requests
    const [requestResult] = await connection.query(
      `INSERT INTO material_requests 
      (bom_id, request_number, status, department, project_id, root_card_id, created_by, remarks) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [bomId, requestNumber, 'pending', 'Production', projectId || null, rootCardId || null, req.user?.id || null, remarks || '']
    );

    const requestId = requestResult.insertId;

    // 1.1 Update BOM status to 'request_sent'
    await connection.query('UPDATE boms SET status = ? WHERE id = ?', ['request_sent', bomId]);

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
        item.remark || ''
      ]);

      await connection.query(
        `INSERT INTO material_request_items 
        (material_request_id, item_name, item_group, material_grade, part_detail, make, required_quantity, uom, remark) 
        VALUES ?`,
        [itemValues]
      );
    }

    // 3. Create notification for Procurement
    try {
        await connection.query(
            `INSERT INTO notifications (user_id, title, message, type, department) 
             SELECT id, 'New Material Request', ?, 'material_request', 'procurement' 
             FROM users WHERE LOWER(role) = 'procurement' OR LOWER(role) = 'admin'`,
            [`New Material Request ${requestNumber} received from Production`]
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
    const { department, status, projectId } = req.query;
    let query = `
      SELECT mr.*, b.bom_number, rc.project_name 
      FROM material_requests mr
      JOIN boms b ON mr.bom_id = b.id
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
    if (projectId) {
        query += " AND mr.project_id = ?";
        params.push(projectId);
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
      SELECT mr.*, b.bom_number, rc.project_name, rc.po_number
      FROM material_requests mr
      JOIN boms b ON mr.bom_id = b.id
      LEFT JOIN root_cards rc ON mr.root_card_id = rc.id
      WHERE mr.id = ?
    `, [id]);

    if (requestRows.length === 0) {
      return res.status(404).json({ message: 'Material request not found' });
    }

    const [items] = await db.query('SELECT * FROM material_request_items WHERE material_request_id = ?', [id]);

    res.json({ 
      success: true, 
      data: {
        ...requestRows[0],
        items
      },
      materialRequest: {
        ...requestRows[0],
        items
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
