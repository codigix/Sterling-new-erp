const db = require('../config/db');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Helper to sanitize project names for folder creation
const sanitizeFolderName = (name) => {
  if (!name) return 'unknown';
  return name.replace(/[^a-zA-Z0-9\s-_]/g, '_').trim().replace(/\s+/g, '_');
};

const createRootCard = async (req, res) => {
  const {
    poNumber,
    poDate,
    projectName,
    projectCode,
    quantity,
    salesPrice,
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
    const publicId = crypto.randomUUID();

    const [result] = await db.query(
      `INSERT INTO root_cards 
      (id, public_id, po_number, po_date, project_name, project_code, quantity, sales_price, delivery_date, total, currency, priority, status, inspection, inspection_authority, ld, items, documents, notes, project_scope) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomId,
        publicId,
        poNumber,
        poDate || null,
        projectName,
        projectCode || null,
        quantity || 1,
        salesPrice || 0,
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
    const message = `A new root card has been created for project: ${projectName}. Please check your root cards tab.`;

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
      rootCard: { id: randomId, public_id: publicId, poNumber, projectName },
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
      // Production can see all root cards to track progress and plan ahead
      const productionAllowedStatuses = [
        'pending',
        'RC_CREATED',
        'DESIGN_IN_PROGRESS',
        'QUALITY_QAP_PENDING',
        'DESIGN_QAP_REVIEW',
        'DESIGN_APPROVED',
        'BOM_PREPARATION', 
        'PARTIALLY_RELEASED',
        'MATERIAL_RELEASED',
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
        'READY_FOR_DELIVERY',
        'Production completed and send to Quality fot QC',
        'send to production for complete final produciton',
        'final Prodcution completed and send to quality for final qc',
        'Redy for Dispatch'
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
    const [rows] = await db.query('SELECT * FROM root_cards WHERE id = ? OR public_id = ?', [id, id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Root Card not found' });
    }

    const rootCard = rows[0];
    const internalId = rootCard.id;

    // Fetch steps
    const [stepRows] = await db.query('SELECT step_key, step_data FROM root_card_steps WHERE root_card_id = ?', [internalId]);
    
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
    // Resolve internal ID if public_id is provided
    const [cards] = await db.query('SELECT id FROM root_cards WHERE id = ? OR public_id = ?', [id, id]);
    if (cards.length === 0) {
      return res.status(404).json({ message: 'Root Card not found' });
    }
    const internalId = cards[0].id;

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
        [internalId, stepKey, JSON.stringify(stepData || {}), assignedTo || null, status || 'pending']
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
    // Resolve internal ID if public_id is provided
    const [cards] = await db.query('SELECT id FROM root_cards WHERE id = ? OR public_id = ?', [id, id]);
    if (cards.length === 0) {
      return res.status(404).json({ message: 'Root Card not found' });
    }
    const internalId = cards[0].id;

    const [rows] = await db.query(
      'SELECT * FROM root_card_steps WHERE root_card_id = ? AND step_key = ?',
      [internalId, stepKey]
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
    salesPrice,
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
      quantity = ?, sales_price = ?, delivery_date = ?, total = ?, currency = ?, priority = ?, 
      status = ?, inspection = ?, inspection_authority = ?, ld = ?, 
      items = ?, documents = ?, notes = ?, project_scope = ?,
      updated_at = CURRENT_TIMESTAMP
      WHERE id = ? OR public_id = ?`,
      [
        poNumber,
        poDate || null,
        projectName,
        projectCode || null,
        quantity || 1,
        salesPrice || 0,
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
        id,
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
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Find internal ID first
    const [cards] = await connection.query('SELECT id, project_name FROM root_cards WHERE id = ? OR public_id = ?', [id, id]);
    if (cards.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Root Card not found' });
    }
    const internalId = cards[0].id;
    const projectName = cards[0].project_name;

    // 1. Delete associated inspections
    await connection.query('DELETE FROM project_inspections WHERE root_card_id = ?', [internalId]);

    // 2. Delete the root card
    const [result] = await connection.query('DELETE FROM root_cards WHERE id = ?', [internalId]);
    
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Root Card not found' });
    }

    await connection.commit();

    // Clean up physical project directory inside design_drawings (drawings, QAPs, ATPs, revisions)
    const uploadsDir = path.resolve(process.env.UPLOAD_PATH);
    const sanitizedProjectName = sanitizeFolderName(projectName);
    const projectDir = path.join(uploadsDir, `design_drawings/${internalId}_${sanitizedProjectName}`);
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }

    res.json({ message: 'Root Card deleted successfully' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error deleting root card:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    if (connection) connection.release();
  }
};

const sendToDesignEngineering = async (req, res) => {
  const { id } = req.params;
  try {
    // Resolve internal ID if public_id is provided
    const [cards] = await db.query('SELECT id, project_name, timelines FROM root_cards WHERE id = ? OR public_id = ?', [id, id]);
    if (cards.length === 0) {
      return res.status(404).json({ message: 'Root Card not found' });
    }

    const internalId = cards[0].id;
    const projectName = cards[0].project_name;
    const timelinesVal = cards[0].timelines;

    let hasTimeline = false;
    if (timelinesVal) {
      let tObj = timelinesVal;
      if (typeof tObj === 'string') {
        try { tObj = JSON.parse(tObj); } catch (e) { tObj = null; }
      }
      if (tObj) {
        hasTimeline = Object.values(tObj).some(dates => dates && (dates.startDate || dates.endDate));
      }
    }

    if (!hasTimeline) {
      return res.status(400).json({ message: 'Please set timelines before sending the Route Card to Design Engineering' });
    }
    
    // Update root card status
    await db.query(
      'UPDATE root_cards SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['DESIGN_IN_PROGRESS', internalId]
    );

    const title = 'Design Engineering Phase Started';
    const message = `Project "${projectName}" has been sent for Design Engineering. Please start uploading design drawings.`;

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
    // Resolve internal ID if public_id is provided
    const [cards] = await db.query('SELECT id, project_name FROM root_cards WHERE id = ? OR public_id = ?', [id, id]);
    if (cards.length === 0) {
      return res.status(404).json({ message: 'Root Card not found' });
    }

    const internalId = cards[0].id;
    const projectName = cards[0].project_name;
    
    // Update root card status
    await db.query(
      'UPDATE root_cards SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['BOM_PREPARATION', internalId]
    );

    const title = 'BOM Preparation Started';
    const message = `Project "${projectName}" has been sent for Production (BOM Preparation). All approved drawings and QAP are now available.`;

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
    // Resolve internal ID if public_id is provided
    const [cards] = await db.query('SELECT id, project_name FROM root_cards WHERE id = ? OR public_id = ?', [id, id]);
    if (cards.length === 0) {
      return res.status(404).json({ message: 'Root Card not found' });
    }

    const internalId = cards[0].id;
    const projectName = cards[0].project_name;
    
    // Fetch approved drawings to store in step data for quick access
    const [drawings] = await db.query(
      'SELECT file_path, name FROM design_documents WHERE root_card_id = ? AND status = "Approved" ORDER BY version DESC',
      [internalId]
    );

    if (drawings.length > 0) {
      // Store the latest approved drawings in the design_engineering step data
      const [existingStep] = await db.query(
        'SELECT step_data FROM root_card_steps WHERE root_card_id = ? AND step_key = ?',
        [internalId, 'design_engineering']
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
        [internalId, 'design_engineering', JSON.stringify(stepData), 'completed']
      );
    }

    // Update root card status
    await db.query(
      'UPDATE root_cards SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['QUALITY_QAP_PENDING', internalId]
    );

    const title = 'QAP Upload Required';
    const message = `Project "${projectName}" has been sent for QAP upload by Quality department.`;

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
    // Resolve internal ID if public_id is provided
    const [cards] = await db.query('SELECT id, project_name FROM root_cards WHERE id = ? OR public_id = ?', [id, id]);
    if (cards.length === 0) {
      return res.status(404).json({ message: 'Root Card not found' });
    }

    const internalId = cards[0].id;
    const projectName = cards[0].project_name;
    
    // Update root card status - Back to DESIGN_QAP_REVIEW so Design Engineer can send to Production
    await db.query(
      'UPDATE root_cards SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['DESIGN_QAP_REVIEW', internalId]
    );

    const title = 'QAP Uploaded - Ready for Production Hand-off';
    const message = `Quality department has uploaded the QAP for "${projectName}". Please review and send to Production.`;

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
    // Resolve internal ID, status and fetch project_name if public_id is provided
    const [cards] = await db.query('SELECT id, project_name, status FROM root_cards WHERE id = ? OR public_id = ?', [id, id]);
    if (cards.length === 0) {
      // Clean up uploaded files if root card not found
      files.forEach(file => {
        const tempPath = path.resolve(process.env.UPLOAD_PATH, file.filename);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      });
      return res.status(404).json({ message: 'Root Card not found' });
    }
    const internalId = cards[0].id;
    const projectName = cards[0].project_name;
    const currentStatus = cards[0].status;

    // Reject if the route card has not been sent to Quality
    const preQualityStatuses = ['RC_CREATED', 'pending', 'DESIGN_IN_PROGRESS'];
    if (preQualityStatuses.includes(currentStatus)) {
      files.forEach(file => {
        const tempPath = path.resolve(process.env.UPLOAD_PATH, file.filename);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      });
      return res.status(403).json({ message: 'Access Denied: This Route Card has not been sent to the Quality Department yet.' });
    }

    // Determine project subdirectory path inside design_drawings
    const uploadsDir = path.resolve(process.env.UPLOAD_PATH);
    const sanitizedProjectName = sanitizeFolderName(projectName);
    const relativeFolder = `design_drawings/${internalId}_${sanitizedProjectName}/qap_and_atp`;
    const targetDir = path.join(uploadsDir, relativeFolder);

    // Create directory recursively if it does not exist
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // We can either update a column if it exists, or update the quality step data
    const [existingStep] = await db.query(
      'SELECT step_data FROM root_card_steps WHERE root_card_id = ? AND step_key = ?',
      [internalId, 'quality']
    );

    let stepData = {};
    if (existingStep.length > 0) {
      stepData = existingStep[0].step_data || {};
    }

    if (!Array.isArray(stepData.qap_files)) {
      stepData.qap_files = [];
    }

    // Move files to target directory and add relative path to the list
    files.forEach(file => {
      const oldPath = path.join(uploadsDir, file.filename);
      const newPath = path.join(targetDir, file.filename);
      fs.renameSync(oldPath, newPath);

      const storedPath = `${relativeFolder}/${file.filename}`;

      stepData.qap_files.push({
        path: storedPath,
        uploaded_at: new Date(),
        uploaded_by: req.user?.id,
        original_name: file.originalname
      });
    });

    // For legacy support, keep the last one in the main column if needed
    const lastFile = files[files.length - 1];
    stepData.qap_path = `${relativeFolder}/${lastFile.filename}`;
    stepData.qap_uploaded_at = new Date();
    stepData.qap_uploaded_by = req.user?.id;

    await db.query(
      `INSERT INTO root_card_steps (root_card_id, step_key, step_data, status)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       step_data = VALUES(step_data),
       updated_at = CURRENT_TIMESTAMP`,
      [internalId, 'quality', JSON.stringify(stepData), 'in_progress']
    );

    res.json({ 
      success: true, 
      message: `${files.length} QAP files uploaded successfully`, 
      qapFiles: stepData.qap_files
    });
  } catch (error) {
    // Clean up uploaded files in case of error
    files.forEach(file => {
      const tempPath = path.resolve(process.env.UPLOAD_PATH, file.filename);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    });
    console.error('Error uploading QAP:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const uploadATP = async (req, res) => {
  const { id } = req.params;
  const files = req.files || (req.file ? [req.file] : []);
  
  if (files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  try {
    // Resolve internal ID, status and fetch project_name if public_id is provided
    const [cards] = await db.query('SELECT id, project_name, status FROM root_cards WHERE id = ? OR public_id = ?', [id, id]);
    if (cards.length === 0) {
      // Clean up uploaded files if root card not found
      files.forEach(file => {
        const tempPath = path.resolve(process.env.UPLOAD_PATH, file.filename);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      });
      return res.status(404).json({ message: 'Root Card not found' });
    }
    const internalId = cards[0].id;
    const projectName = cards[0].project_name;
    const currentStatus = cards[0].status;

    // Reject if the route card has not been sent to Quality
    const preQualityStatuses = ['RC_CREATED', 'pending', 'DESIGN_IN_PROGRESS'];
    if (preQualityStatuses.includes(currentStatus)) {
      files.forEach(file => {
        const tempPath = path.resolve(process.env.UPLOAD_PATH, file.filename);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      });
      return res.status(403).json({ message: 'Access Denied: This Route Card has not been sent to the Quality Department yet.' });
    }

    // Determine project subdirectory path inside design_drawings
    const uploadsDir = path.resolve(process.env.UPLOAD_PATH);
    const sanitizedProjectName = sanitizeFolderName(projectName);
    const relativeFolder = `design_drawings/${internalId}_${sanitizedProjectName}/qap_and_atp`;
    const targetDir = path.join(uploadsDir, relativeFolder);

    // Create directory recursively if it does not exist
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const [existingStep] = await db.query(
      'SELECT step_data FROM root_card_steps WHERE root_card_id = ? AND step_key = ?',
      [internalId, 'quality']
    );

    let stepData = {};
    if (existingStep.length > 0) {
      stepData = existingStep[0].step_data || {};
    }

    if (!Array.isArray(stepData.atp_files)) {
      stepData.atp_files = [];
    }

    // Move files to target directory and add relative path to the list
    files.forEach(file => {
      const oldPath = path.join(uploadsDir, file.filename);
      const newPath = path.join(targetDir, file.filename);
      fs.renameSync(oldPath, newPath);

      const storedPath = `${relativeFolder}/${file.filename}`;

      stepData.atp_files.push({
        path: storedPath,
        uploaded_at: new Date(),
        uploaded_by: req.user?.id,
        original_name: file.originalname
      });
    });

    const lastFile = files[files.length - 1];
    stepData.atp_path = `${relativeFolder}/${lastFile.filename}`;
    stepData.atp_uploaded_at = new Date();
    stepData.atp_uploaded_by = req.user?.id;

    await db.query(
      `INSERT INTO root_card_steps (root_card_id, step_key, step_data, status)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       step_data = VALUES(step_data),
       updated_at = CURRENT_TIMESTAMP`,
      [internalId, 'quality', JSON.stringify(stepData), 'in_progress']
    );

    res.json({ 
      success: true, 
      message: `${files.length} ATP files uploaded successfully`, 
      atpFiles: stepData.atp_files
    });
  } catch (error) {
    // Clean up uploaded files in case of error
    files.forEach(file => {
      const tempPath = path.resolve(process.env.UPLOAD_PATH, file.filename);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    });
    console.error('Error uploading ATP:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllRootCardRequirements = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM root_cards WHERE status != 'RC_CREATED'");
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching root card requirements:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getRootCardRequirementsById = async (req, res) => {
  const { id } = req.params;
  try {
    // Resolve internal ID if public_id is provided
    const [rows] = await db.query('SELECT * FROM root_cards WHERE id = ? OR public_id = ?', [id, id]);
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
    // Resolve internal ID if public_id is provided
    const [cards] = await db.query('SELECT id FROM root_cards WHERE id = ? OR public_id = ?', [id, id]);
    if (cards.length === 0) {
      return res.status(404).json({ message: 'Root Card not found' });
    }
    const internalId = cards[0].id;

    // For now, we update the items field if that's where requirements come from
    await db.query(
      'UPDATE root_cards SET items = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [JSON.stringify(materials), procurementStatus === 'pending' ? 'RC_CREATED' : 'RC_CREATED', internalId]
    );
    res.json({ success: true, message: 'Requirements updated successfully' });
  } catch (error) {
    console.error('Error updating root card requirements:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateRootCardStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    // Resolve internal ID if public_id is provided
    const [cards] = await db.query('SELECT id, project_name FROM root_cards WHERE id = ? OR public_id = ?', [id, id]);
    if (cards.length === 0) {
      return res.status(404).json({ message: 'Root Card not found' });
    }
    const internalId = cards[0].id;
    const projectName = cards[0].project_name;

    const [result] = await db.query(
      'UPDATE root_cards SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, internalId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Root Card not found' });
    }

    // Send notification to relevant department based on status
    let department = '';
    let message = `Status for project "${projectName}" has been updated to ${status.replace(/_/g, ' ')}.`;
    let link = `/admin/root-cards/${id}?mode=view`;

    if (status === 'DESIGN_IN_PROGRESS') department = 'Design Engineer';
    else if (status === 'PRODUCTION_IN_PROGRESS') department = 'Production';
    else if (status.startsWith('MATERIAL_')) department = 'Inventory';
    else if (status.includes('QC_')) department = 'Quality';
    else if (status === 'PURCHASE_ORDER_RELEASED' || status === 'PROCUREMENT_IN_PROGRESS') department = 'Procurement';

    if (department) {
      await db.query(
        'INSERT INTO notifications (department, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
        [department, 'Root Card Status Updated', message, 'info', link]
      );
    }

    res.json({ success: true, message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating root card status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateRootCardTimelines = async (req, res) => {
  const { id } = req.params;
  const { timelines } = req.body; // e.g., { Design: { startDate, endDate }, Production: { startDate, endDate }, ... }

  try {
    // Resolve internal ID and project_name if public_id is provided
    const [cards] = await db.query('SELECT id, project_name FROM root_cards WHERE id = ? OR public_id = ?', [id, id]);
    if (cards.length === 0) {
      return res.status(404).json({ message: 'Root Card not found' });
    }
    const internalId = cards[0].id;
    const projectName = cards[0].project_name;

    // Update the timelines field in the database
    const [result] = await db.query(
      'UPDATE root_cards SET timelines = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [JSON.stringify(timelines), internalId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Root Card not found' });
    }

    // Send notifications to departments
    const departmentRoleMap = {
      Design: 'Design Engineer',
      Production: 'Production',
      Procurement: 'Procurement',
      Inventory: 'Inventory',
      Quality: 'Quality'
    };

    for (const [deptKey, dates] of Object.entries(timelines)) {
      const role = departmentRoleMap[deptKey];
      if (role && dates && dates.startDate && dates.endDate) {
        const title = 'Project Timeline Assigned';
        const message = `Timeline for Project "${projectName}" has been assigned. Start: ${dates.startDate}, End: ${dates.endDate}.`;
        
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
    }

    res.json({ success: true, message: 'Timelines updated and notifications sent successfully' });
  } catch (error) {
    console.error('Error updating root card timelines:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getNextProjectCode = async (req, res) => {
  try {
    // Query database to get all current project codes
    const [rows] = await db.query('SELECT project_code FROM root_cards');
    
    const serials = new Set();
    for (const row of rows) {
      const code = row.project_code;
      if (!code) continue;
      
      // Match only purely numeric project codes (ignoring legacy codes with prefixes)
      const match = code.trim().match(/^\d+$/);
      if (match) {
        const val = parseInt(match[0], 10);
        if (!isNaN(val)) {
          serials.add(val);
        }
      }
    }

    // Find the smallest missing positive integer starting from 1
    let nextSeq = 1;
    while (serials.has(nextSeq)) {
      nextSeq++;
    }
    const serial = String(nextSeq).padStart(3, '0');

    res.json({
      success: true,
      projectCode: serial,
      sequence: nextSeq
    });
  } catch (error) {
    console.error('Error generating next project code:', error);
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
  uploadATP,
  getAllRootCardRequirements,
  getRootCardRequirementsById,
  updateRootCardRequirements,
  updateRootCardStatus,
  updateRootCardTimelines,
  getNextProjectCode
};
