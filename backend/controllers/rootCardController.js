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
  const { assignedOnly, includeSteps } = req.query;
  try {
    let query = 'SELECT * FROM root_cards';
    let queryParams = [];
    const isProduction = req.user && (req.user.role?.toLowerCase().includes('production') || req.user.department?.toLowerCase() === 'production');

    if (assignedOnly === 'true' && req.user && req.user.id) {
      // Find root cards where this user is assigned to ANY step
      query = `
        SELECT DISTINCT rc.* 
        FROM root_cards rc
        LEFT JOIN root_card_steps rcs ON rc.id = rcs.root_card_id
        WHERE rcs.assigned_to = ? 
      `;
      queryParams.push(req.user.id);
    } else if (isProduction) {
      // Production can only see root cards that have been sent to production
      const productionAllowedStatuses = [
        'BOM_PREPARATION', 
        'MATERIAL_PLANNING', 
        'PURCHASE_ORDER_RELEASED', 
        'PROCUREMENT_IN_PROGRESS', 
        'MATERIAL_RECEIVED', 
        'MATERIAL_QC_PENDING', 
        'MATERIAL_QC_APPROVED', 
        'PRODUCTION_IN_PROGRESS', 
        'DIMENSIONAL_QC_PENDING', 
        'DIMENSIONAL_QC_APPROVED', 
        'PAINTING_IN_PROGRESS', 
        'FINAL_QC_PENDING', 
        'FINAL_QC_APPROVED', 
        'READY_FOR_DELIVERY'
      ];
      query = `SELECT * FROM root_cards WHERE status IN ('${productionAllowedStatuses.join("', '")}')`;
    }

    query += ' ORDER BY created_at DESC';
    const [rows] = await db.query(query, queryParams);

    if (includeSteps === 'true' && rows.length > 0) {
      // Fetch all steps for these root cards in one query
      const rootCardIds = rows.map(r => r.id);
      const [stepRows] = await db.query(
        'SELECT root_card_id, step_key, step_data FROM root_card_steps WHERE root_card_id IN (?)',
        [rootCardIds]
      );

      // Group steps by root_card_id
      const stepsByRootCard = stepRows.reduce((acc, row) => {
        if (!acc[row.root_card_id]) acc[row.root_card_id] = {};
        acc[row.root_card_id][row.step_key] = row.step_data;
        return acc;
      }, {});

      // Merge steps into root card rows
      rows.forEach(row => {
        row.steps = stepsByRootCard[row.id] || {};
      });
    }

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
      ['Design Engineer', title, message, 'info', `/design-engineer/root-cards/${id}?mode=edit`]
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
      ['BOM_PREPARATION', id]
    );

    const title = 'BOM Preparation Started';
    const message = `Root Card ${id} for project "${projectName}" has been sent for Production (BOM Preparation). All approved drawings and QAP are now available.`;

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

const sendToQuality = async (req, res) => {
  const { id } = req.params;
  try {
    // Check if root card exists
    const [cards] = await db.query('SELECT project_name FROM root_cards WHERE id = ?', [id]);
    if (cards.length === 0) {
      return res.status(404).json({ message: 'Root Card not found' });
    }

    const projectName = cards[0].project_name;
    
    // Fetch approved drawings to store in step data for quick access
    const [drawings] = await db.query(
      'SELECT file_path, name FROM design_documents WHERE root_card_id = ? AND status = "Approved" ORDER BY version DESC',
      [id]
    );

    if (drawings.length > 0) {
      // Store the latest approved drawings in the design_engineering step data
      const [existingStep] = await db.query(
        'SELECT step_data FROM root_card_steps WHERE root_card_id = ? AND step_key = ?',
        [id, 'design_engineering']
      );

      let stepData = {};
      if (existingStep.length > 0) {
        stepData = existingStep[0].step_data || {};
      }

      stepData.approved_drawings = drawings;
      
      await db.query(
        `INSERT INTO root_card_steps (root_card_id, step_key, step_data, status)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         step_data = VALUES(step_data),
         updated_at = CURRENT_TIMESTAMP`,
        [id, 'design_engineering', JSON.stringify(stepData), 'completed']
      );
    }

    // Update root card status
    await db.query(
      'UPDATE root_cards SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['QUALITY_QAP_PENDING', id]
    );

    const title = 'QAP Upload Required';
    const message = `Root Card ${id} for project "${projectName}" has been sent for QAP upload by Quality department.`;

    // Send notification to Quality department
    await db.query(
      'INSERT INTO notifications (department, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
      ['Quality', title, message, 'info', `/department/quality/qap-upload`]
    );

    res.json({ success: true, message: 'Notification sent to Quality department', notificationsSent: 1 });
  } catch (error) {
    console.error('Error sending to Quality:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const returnToDesignEngineering = async (req, res) => {
  const { id } = req.params;
  try {
    // Check if root card exists
    const [cards] = await db.query('SELECT project_name FROM root_cards WHERE id = ?', [id]);
    if (cards.length === 0) {
      return res.status(404).json({ message: 'Root Card not found' });
    }

    const projectName = cards[0].project_name;
    
    // Update root card status - Back to DESIGN_QAP_REVIEW so Design Engineer can send to Production
    await db.query(
      'UPDATE root_cards SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['DESIGN_QAP_REVIEW', id]
    );

    const title = 'QAP Uploaded - Ready for Production Hand-off';
    const message = `Quality department has uploaded the QAP for Root Card ${id} ("${projectName}"). Please review and send to Production.`;

    // Send notification to Design Engineering
    await db.query(
      'INSERT INTO notifications (department, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
      ['Design Engineer', title, message, 'info', `/design-engineer/qap-review`]
    );

    res.json({ success: true, message: 'QAP uploaded and sent to Design Engineering for Production hand-off', notificationsSent: 1 });
  } catch (error) {
    console.error('Error returning to Design Engineering:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const uploadQAP = async (req, res) => {
  const { id } = req.params;
  const files = req.files || (req.file ? [req.file] : []);
  
  if (files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  try {
    // We can either update a column if it exists, or update the quality step data
    // Let's update the quality step data for consistency with how other steps work
    const [existingStep] = await db.query(
      'SELECT step_data FROM root_card_steps WHERE root_card_id = ? AND step_key = ?',
      [id, 'quality']
    );

    let stepData = {};
    if (existingStep.length > 0) {
      stepData = existingStep[0].step_data || {};
    }

    if (!Array.isArray(stepData.qap_files)) {
      stepData.qap_files = [];
    }

    // Add all uploaded files to the list
    files.forEach(file => {
      stepData.qap_files.push({
        path: file.filename,
        uploaded_at: new Date(),
        uploaded_by: req.user?.id,
        original_name: file.originalname
      });
    });

    // For legacy support, keep the last one in the main column if needed
    const lastFile = files[files.length - 1];
    stepData.qap_path = lastFile.filename;
    stepData.qap_uploaded_at = new Date();
    stepData.qap_uploaded_by = req.user?.id;

    await db.query(
      `INSERT INTO root_card_steps (root_card_id, step_key, step_data, status)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       step_data = VALUES(step_data),
       updated_at = CURRENT_TIMESTAMP`,
      [id, 'quality', JSON.stringify(stepData), 'in_progress']
    );

    res.json({ 
      success: true, 
      message: `${files.length} QAP files uploaded successfully`, 
      qapFiles: stepData.qap_files
    });
  } catch (error) {
    console.error('Error uploading QAP:', error);
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
  sendToQuality,
  returnToDesignEngineering,
  uploadQAP,
  getAllRootCardRequirements,
  getRootCardRequirementsById,
  updateRootCardRequirements
};
