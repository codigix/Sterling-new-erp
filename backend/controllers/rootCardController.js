const db = require('../config/db');

const createRootCard = async (req, res) => {
  const {
    poNumber,
    poDate,
    projectName,
    projectCode,
    quantity,
    deliveryDate,
    total,
    currency,
    priority,
    status,
    inspection,
    inspectionAuthority,
    ld,
    items,
    documents,
    notes,
    projectScope
  } = req.body;

  try {
    // Generate a random ID in the format RC-XXXX
    const randomId = `RC-${Math.floor(1000 + Math.random() * 9000)}`;

    const [result] = await db.query(
      `INSERT INTO root_cards 
      (id, po_number, po_date, project_name, project_code, quantity, delivery_date, total, currency, priority, status, inspection, inspection_authority, ld, items, documents, notes, project_scope) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomId,
        poNumber,
        poDate || null,
        projectName,
        projectCode || null,
        quantity || 1,
        deliveryDate || null,
        total || 0,
        currency || 'INR',
        priority || 'medium',
        'RC_CREATED',
        inspection || null,
        inspectionAuthority || null,
        ld || null,
        JSON.stringify(items || []),
        JSON.stringify(documents || []),
        notes || '',
        JSON.stringify(projectScope || {})
      ]
    );

    // Send notifications to departments
    const roles = ['Design Engineer', 'Production', 'Procurement', 'Quality', 'Inventory'];
    const title = 'New Root Card Created';
    const message = `A new root card ${randomId} has been created for project: ${projectName}. Please check your root cards tab.`;

    try {
      for (const role of roles) {
        let link = '/';
        if (role === 'Design Engineer') link = '/design-engineer/root-cards';
        else if (role === 'Production') link = '/department/production/root-cards';
        else if (role === 'Procurement') link = '/department/procurement/root-cards';
        else if (role === 'Inventory') link = '/department/inventory/root-cards';
        else if (role === 'Quality') link = '/department/quality/root-cards';

        await db.query(
          'INSERT INTO notifications (department, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
          [role, title, message, 'info', link]
        );
      }
    } catch (error) {
      console.error('Error sending notifications to departments:', error);
    }

    res.status(201).json({
      message: 'Root Card created successfully',
      rootCard: { id: randomId, poNumber, projectName },
      notificationsSent: roles.length
    });
  } catch (error) {
    console.error('Error creating root card:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Root Card with this PO Number already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllRootCards = async (req, res) => {
  const { assignedOnly } = req.query;
  try {
    let query = 'SELECT * FROM root_cards';
    let queryParams = [];
    const isProduction = req.user && (req.user.role?.toLowerCase().includes('production') || req.user.department?.toLowerCase() === 'production');

    if (assignedOnly === 'true' && req.user && req.user.id) {
      // Find root cards where this user is assigned to ANY step
      // OR root cards that are in relevant statuses for production/design
      query = `
        SELECT DISTINCT rc.* 
        FROM root_cards rc
        LEFT JOIN root_card_steps rcs ON rc.id = rcs.root_card_id
        WHERE rcs.assigned_to = ? 
        OR rc.status IN ('pending', 'RC_CREATED', 'DESIGN_IN_PROGRESS', 'DESIGN_APPROVED', 'BOM_PREPARATION', 'MATERIAL_PLANNING', 'PURCHASE_ORDER_RELEASED', 'PROCUREMENT_IN_PROGRESS', 'MATERIAL_RECEIVED', 'MATERIAL_QC_PENDING', 'MATERIAL_QC_APPROVED', 'MATERIAL_RELEASED', 'PARTIALLY_RELEASED', 'PRODUCTION_IN_PROGRESS', 'DIMENSIONAL_QC_PENDING', 'DIMENSIONAL_QC_APPROVED', 'PAINTING_IN_PROGRESS', 'FINAL_QC_PENDING', 'FINAL_QC_APPROVED', 'READY_FOR_DELIVERY', 'APPROVED', 'COMPLETED')
      `;
      queryParams.push(req.user.id);
    } else if (isProduction) {
      // Production can see root cards from early stages to monitor incoming work
      query = "SELECT * FROM root_cards WHERE status IN ('pending', 'RC_CREATED', 'DESIGN_IN_PROGRESS', 'DESIGN_APPROVED', 'BOM_PREPARATION', 'PURCHASE_ORDER_RELEASED', 'MATERIAL_PLANNING', 'PROCUREMENT_IN_PROGRESS', 'MATERIAL_RECEIVED', 'MATERIAL_QC_PENDING', 'MATERIAL_QC_APPROVED', 'MATERIAL_RELEASED', 'PARTIALLY_RELEASED', 'PRODUCTION_IN_PROGRESS', 'DIMENSIONAL_QC_PENDING', 'DIMENSIONAL_QC_APPROVED', 'PAINTING_IN_PROGRESS', 'FINAL_QC_PENDING', 'FINAL_QC_APPROVED', 'READY_FOR_DELIVERY', 'APPROVED', 'COMPLETED')";
    }

    query += ' ORDER BY created_at DESC';
    const [rows] = await db.query(query, queryParams);
    res.json({ rootCards: rows });
  } catch (error) {
    console.error('Error fetching root cards:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getRootCardById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM root_cards WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Root Card not found' });
    }

    const rootCard = rows[0];

    // Fetch steps
    const [stepRows] = await db.query('SELECT step_key, step_data FROM root_card_steps WHERE root_card_id = ?', [id]);
    
    rootCard.steps = {};
    stepRows.forEach(row => {
      // step_data is already parsed as JSON by mysql2 if stored as JSON type
      rootCard.steps[row.step_key] = row.step_data;
    });

    res.json({ rootCard });
  } catch (error) {
    console.error('Error fetching root card:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const saveAllSteps = async (req, res) => {
  const { id } = req.params;
  const { steps } = req.body; // Array of { stepKey, stepData, assignedTo, status }

  if (!Array.isArray(steps)) {
    return res.status(400).json({ message: 'Steps must be an array' });
  }

  try {
    const results = [];
    for (const step of steps) {
      const { stepKey, stepData, assignedTo, status } = step;
      
      const [result] = await db.query(
        `INSERT INTO root_card_steps (root_card_id, step_key, step_data, assigned_to, status)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         step_data = VALUES(step_data),
         assigned_to = VALUES(assigned_to),
         status = VALUES(status),
         updated_at = CURRENT_TIMESTAMP`,
        [id, stepKey, JSON.stringify(stepData || {}), assignedTo || null, status || 'pending']
      );
      results.push({ stepKey, success: true });
    }

    res.json({ message: 'All steps saved successfully', results });
  } catch (error) {
    console.error('Error saving steps:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getStepData = async (req, res) => {
  const { id, stepKey } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT * FROM root_card_steps WHERE root_card_id = ? AND step_key = ?',
      [id, stepKey]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Step data not found' });
    }
    res.json({ data: rows[0].step_data });
  } catch (error) {
    console.error('Error fetching step data:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateRootCard = async (req, res) => {
  const { id } = req.params;
  const {
    poNumber,
    poDate,
    projectName,
    projectCode,
    quantity,
    deliveryDate,
    total,
    currency,
    priority,
    status,
    inspection,
    inspectionAuthority,
    ld,
    items,
    documents,
    notes,
    projectScope
  } = req.body;

  try {
    const [result] = await db.query(
      `UPDATE root_cards SET 
      po_number = ?, po_date = ?, project_name = ?, project_code = ?, 
      quantity = ?, delivery_date = ?, total = ?, currency = ?, priority = ?, 
      status = ?, inspection = ?, inspection_authority = ?, ld = ?, 
      items = ?, documents = ?, notes = ?, project_scope = ?,
      updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        poNumber,
        poDate || null,
        projectName,
        projectCode || null,
        quantity || 1,
        deliveryDate || null,
        total || 0,
        currency || 'INR',
        priority || 'medium',
        status || 'RC_CREATED',
        inspection || null,
        inspectionAuthority || null,
        ld || null,
        JSON.stringify(items || []),
        JSON.stringify(documents || []),
        notes || '',
        JSON.stringify(projectScope || {}),
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Root Card not found' });
    }

    res.json({ message: 'Root Card updated successfully' });
  } catch (error) {
    console.error('Error updating root card:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Root Card with this PO Number already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteRootCard = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM root_cards WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Root Card not found' });
    }
    res.json({ message: 'Root Card deleted successfully' });
  } catch (error) {
    console.error('Error deleting root card:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const sendToDesignEngineering = async (req, res) => {
  const { id } = req.params;
  try {
    // Check if root card exists
    const [cards] = await db.query('SELECT project_name FROM root_cards WHERE id = ?', [id]);
    if (cards.length === 0) {
      return res.status(404).json({ message: 'Root Card not found' });
    }

    const projectName = cards[0].project_name;
    
    // Update root card status
    await db.query(
      'UPDATE root_cards SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['DESIGN_IN_PROGRESS', id]
    );

    const title = 'Design Engineering Phase Started';
    const message = `Root Card ${id} for project "${projectName}" has been sent for Design Engineering. Please start uploading design drawings.`;

    // Send notification to Design Engineering role
    await db.query(
      'INSERT INTO notifications (department, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
      ['Design Engineer', title, message, 'info', `/design-engineer/root-cards/${id}?mode=view`]
    );

    res.json({ success: true, message: 'Notification sent to Design Engineering department', notificationsSent: 1 });
  } catch (error) {
    console.error('Error sending to Design Engineering:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const sendToProduction = async (req, res) => {
  const { id } = req.params;
  try {
    // Check if root card exists
    const [cards] = await db.query('SELECT project_name FROM root_cards WHERE id = ?', [id]);
    if (cards.length === 0) {
      return res.status(404).json({ message: 'Root Card not found' });
    }

    const projectName = cards[0].project_name;
    
    // Update root card status
    await db.query(
      'UPDATE root_cards SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['PRODUCTION_IN_PROGRESS', id]
    );

    const title = 'Production Phase Started';
    const message = `Root Card ${id} for project "${projectName}" has been sent for Production. All approved drawings are now available.`;

    // Send notification to Production department
    await db.query(
      'INSERT INTO notifications (department, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
      ['Production', title, message, 'info', `/department/production/root-cards/${id}?mode=view`]
    );

    res.json({ success: true, message: 'Notification sent to Production department', notificationsSent: 1 });
  } catch (error) {
    console.error('Error sending to Production:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllRootCardRequirements = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM root_cards');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching root card requirements:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getRootCardRequirementsById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM root_cards WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Root Card not found' });
    }
    
    // For now, let's assume requirements are stored in a field or we return the items
    const rootCard = rows[0];
    const materials = typeof rootCard.items === 'string' ? JSON.parse(rootCard.items) : (rootCard.items || []);
    
    res.json({ 
      success: true, 
      data: {
        ...rootCard,
        materials: materials
      }
    });
  } catch (error) {
    console.error('Error fetching root card requirements by id:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateRootCardRequirements = async (req, res) => {
  const { id } = req.params;
  const { materials, procurementStatus } = req.body;
  try {
    // For now, we update the items field if that's where requirements come from
    await db.query(
      'UPDATE root_cards SET items = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [JSON.stringify(materials), procurementStatus === 'pending' ? 'RC_CREATED' : 'RC_CREATED', id]
    );
    res.json({ success: true, message: 'Requirements updated successfully' });
  } catch (error) {
    console.error('Error updating root card requirements:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createRootCard,
  getAllRootCards,
  getRootCardById,
  updateRootCard,
  saveAllSteps,
  getStepData,
  deleteRootCard,
  sendToDesignEngineering,
  sendToProduction,
  getAllRootCardRequirements,
  getRootCardRequirementsById,
  updateRootCardRequirements
};
