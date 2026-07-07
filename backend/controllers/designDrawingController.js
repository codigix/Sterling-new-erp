const db = require('../config/db');
const path = require('path');
const fs = require('fs');

// Helper to sanitize project names for folder creation
const sanitizeFolderName = (name) => {
  if (!name) return 'unknown';
  return name.replace(/[^a-zA-Z0-9\s-_]/g, '_').trim().replace(/\s+/g, '_');
};

// Upload a new drawing
exports.uploadDrawing = async (req, res) => {
  try {
    console.log('Upload request body:', req.body);
    console.log('Upload request file:', req.file);
    
    const { root_card_id, name, type, description } = req.body;
    const created_by = req.user.id;
    
    // Resolve internal ID and fetch project name if public_id is provided
    const [cards] = await db.query('SELECT id, project_name FROM root_cards WHERE id = ? OR public_id = ?', [root_card_id, root_card_id]);
    
    if (cards.length === 0) {
      if (req.file) {
        const tempPath = path.resolve(process.env.UPLOAD_PATH, req.file.filename);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
      return res.status(404).json({ success: false, message: 'Root card not found' });
    }
    
    const effectiveId = cards[0].id;
    const projectName = cards[0].project_name;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Determine target project directory inside design_drawings
    const uploadsDir = path.resolve(process.env.UPLOAD_PATH);
    const sanitizedProjectName = sanitizeFolderName(projectName);
    const relativeFolder = `design_drawings/${effectiveId}_${sanitizedProjectName}`;
    const targetDir = path.join(uploadsDir, relativeFolder);

    // Create folder automatically if it doesn't exist
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Move file from root uploadsDir to project-specific folder
    const oldPath = path.join(uploadsDir, req.file.filename);
    const newPath = path.join(targetDir, req.file.filename);
    fs.renameSync(oldPath, newPath);

    const file_path = `${relativeFolder}/${req.file.filename}`;
    const initialStatus = type === 'Final Approved Drawing' ? 'Approved' : 'Pending Review';

    const [result] = await db.query(
      `INSERT INTO design_documents (root_card_id, name, type, version, file_path, description, status, created_by) 
       VALUES (?, ?, ?, 1, ?, ?, ?, ?)`,
      [effectiveId, name, type, file_path, description, initialStatus, created_by]
    );

    res.status(201).json({ 
      success: true, 
      message: 'Drawing uploaded successfully', 
      drawingId: result.insertId 
    });
  } catch (error) {
    if (req.file) {
      const tempPath = path.resolve(process.env.UPLOAD_PATH, req.file.filename);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
    console.error('Error uploading drawing:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Create a new revision
exports.createRevision = async (req, res) => {
  try {
    const { parent_id } = req.params;
    const { description } = req.body;
    const created_by = req.user.id;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded for revision' });
    }

    // Get the latest version for this parent_id
    const [docs] = await db.query(
      `SELECT root_card_id, name, type, MAX(version) as last_version 
       FROM design_documents 
       WHERE id = ? OR parent_id = ? 
       GROUP BY root_card_id, name, type`,
      [parent_id, parent_id]
    );

    if (docs.length === 0) {
      const tempPath = path.resolve(process.env.UPLOAD_PATH, req.file.filename);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      return res.status(404).json({ success: false, message: 'Parent document not found' });
    }

    const doc = docs[0];
    const new_version = doc.last_version + 1;

    // Fetch root card project details
    const [cards] = await db.query('SELECT id, project_name FROM root_cards WHERE id = ?', [doc.root_card_id]);
    const projectName = cards.length > 0 ? cards[0].project_name : 'unknown';
    const effectiveId = cards.length > 0 ? cards[0].id : doc.root_card_id;

    // Determine target project directory inside design_drawings
    const uploadsDir = path.resolve(process.env.UPLOAD_PATH);
    const sanitizedProjectName = sanitizeFolderName(projectName);
    const relativeFolder = `design_drawings/${effectiveId}_${sanitizedProjectName}`;
    const targetDir = path.join(uploadsDir, relativeFolder);

    // Create folder automatically if it doesn't exist
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Move file from root uploadsDir to project-specific folder
    const oldPath = path.join(uploadsDir, req.file.filename);
    const newPath = path.join(targetDir, req.file.filename);
    fs.renameSync(oldPath, newPath);

    const file_path = `${relativeFolder}/${req.file.filename}`;

    // Set all previous versions to 'Rejected' (or 'Obsolete')
    await db.query(
      `UPDATE design_documents 
       SET status = 'Rejected', reviewer_comment = 'Auto-rejected by new revision' 
       WHERE (id = ? OR parent_id = ?)`,
      [parent_id, parent_id]
    );

    const [result] = await db.query(
      `INSERT INTO design_documents (root_card_id, name, type, version, file_path, description, status, created_by, parent_id) 
       VALUES (?, ?, ?, ?, ?, ?, 'Pending Review', ?, ?)`,
      [doc.root_card_id, doc.name, doc.type, new_version, file_path, description, created_by, parent_id]
    );

    res.status(201).json({ 
      success: true, 
      message: 'Revision created and submitted for review successfully', 
      documentId: result.insertId 
    });
  } catch (error) {
    if (req.file) {
      const tempPath = path.resolve(process.env.UPLOAD_PATH, req.file.filename);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
    console.error('Error creating revision:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Approve or Reject a drawing
exports.reviewDrawing = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewer_comment } = req.body;
    const reviewer_id = req.user.id;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be Approved or Rejected' });
    }

    await db.query(
      `UPDATE design_documents 
       SET status = ?, reviewer_comment = ?, reviewer_id = ? 
       WHERE id = ?`,
      [status, reviewer_comment, reviewer_id, id]
    );

    res.json({ success: true, message: `Drawing ${status.toLowerCase()} successfully` });
  } catch (error) {
    console.error('Error reviewing drawing:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get drawing history
exports.getDrawingHistory = async (req, res) => {
  try {
    const { id } = req.params;

    // Get the parent drawing ID (if this IS the parent, use its own ID)
    const [parentDoc] = await db.query(
      'SELECT id, parent_id FROM design_documents WHERE id = ?',
      [id]
    );

    if (parentDoc.length === 0) {
      return res.status(404).json({ success: false, message: 'Drawing not found' });
    }

    const parentId = parentDoc[0].parent_id || parentDoc[0].id;

    const [history] = await db.query(
      `SELECT d.*, u.full_name as created_by_name, r.full_name as reviewer_name 
       FROM design_documents d
       LEFT JOIN users u ON d.created_by = u.id
       LEFT JOIN users r ON d.reviewer_id = r.id
       WHERE d.id = ? OR d.parent_id = ?
       ORDER BY d.version DESC`,
      [parentId, parentId]
    );

    res.json({ success: true, history });
  } catch (error) {
    console.error('Error fetching drawing history:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get all drawings (optionally for a specific Root Card)
exports.getAllDrawings = async (req, res) => {
  try {
    const isProduction = req.user && (req.user.role?.toLowerCase().includes('production') || req.user.department?.toLowerCase() === 'production');
    
    let query = `
      SELECT d.*, u.full_name as created_by_name, r.full_name as reviewer_name, 
             rc.project_name, rc.po_number
      FROM design_documents d
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN users r ON d.reviewer_id = r.id
      LEFT JOIN root_cards rc ON d.root_card_id = rc.id
      WHERE 1=1
    `;

    // Production can only see Approved drawings AND only if Root Card is in Production phase or further
    if (isProduction) {
      const productionAllowedStatuses = [
        'Released', 'Production', 'Partially Completed', 'MATERIAL_PLANNING', 
        'PURCHASE_ORDER_RELEASED', 'PARTIALLY_RELEASED', 'MATERIAL_RELEASED', 
        'PRODUCTION_IN_PROGRESS', 'DIMENSIONAL_QC_PENDING', 'DIMENSIONAL_QC_APPROVED',
        'PHASE_2_QC_PENDING', 'PHASE_2_QC_APPROVED', 'UNDER INSPECTION',
        'DESIGN_RELEASED', 'READY_FOR_PRODUCTION', 'READY_FOR_PHASE_2', 'QC_APPROVED',
        'Production completed and send to Quality fot QC',
        'send to production for complete final produciton',
        'final Prodcution completed and send to quality for final qc',
        'Redy for Dispatch',
        'BOM_PREPARATION', 
        'PROCUREMENT_IN_PROGRESS', 
        'MATERIAL_RECEIVED', 
        'MATERIAL_QC_PENDING', 
        'MATERIAL_QC_APPROVED', 
        'PAINTING_IN_PROGRESS', 
        'FINAL_QC_PENDING', 
        'FINAL_QC_APPROVED', 
        'READY_FOR_DELIVERY'
      ];
      query += ` AND d.status = 'Approved' AND rc.status IN ('${productionAllowedStatuses.join("', '")}')`;
    }

    query += " ORDER BY d.created_at DESC";

    const [documents] = await db.query(query);
    res.json({ success: true, drawings: documents });
  } catch (error) {
    console.error('Error fetching all drawings:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get all drawings for a Root Card
exports.getRootCardDrawings = async (req, res) => {
  try {
    const { rootCardId } = req.params;
    const isProduction = req.user && (req.user.role?.toLowerCase().includes('production') || req.user.department?.toLowerCase() === 'production');

    // Resolve internal ID if public_id is provided
    const [cards] = await db.query('SELECT id FROM root_cards WHERE id = ? OR public_id = ?', [rootCardId, rootCardId]);
    const effectiveId = cards.length > 0 ? cards[0].id : rootCardId;

    let query = `
      SELECT d.*, u.full_name as created_by_name, r.full_name as reviewer_name,
             rc.project_name, rc.po_number
      FROM design_documents d
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN users r ON d.reviewer_id = r.id
      LEFT JOIN root_cards rc ON d.root_card_id = rc.id
      WHERE d.root_card_id = ?
    `;

    // Production can only see Approved drawings AND only if Root Card is in Production phase or further
    if (isProduction) {
      const productionAllowedStatuses = [
        'Released', 'Production', 'Partially Completed', 'MATERIAL_PLANNING', 
        'PURCHASE_ORDER_RELEASED', 'PARTIALLY_RELEASED', 'MATERIAL_RELEASED', 
        'PRODUCTION_IN_PROGRESS', 'DIMENSIONAL_QC_PENDING', 'DIMENSIONAL_QC_APPROVED',
        'PHASE_2_QC_PENDING', 'PHASE_2_QC_APPROVED', 'UNDER INSPECTION',
        'DESIGN_RELEASED', 'READY_FOR_PRODUCTION', 'READY_FOR_PHASE_2', 'QC_APPROVED',
        'Production completed and send to Quality fot QC',
        'send to production for complete final produciton',
        'final Prodcution completed and send to quality for final qc',
        'Redy for Dispatch',
        'BOM_PREPARATION', 
        'PROCUREMENT_IN_PROGRESS', 
        'MATERIAL_RECEIVED', 
        'MATERIAL_QC_PENDING', 
        'MATERIAL_QC_APPROVED', 
        'PAINTING_IN_PROGRESS', 
        'FINAL_QC_PENDING', 
        'FINAL_QC_APPROVED', 
        'READY_FOR_DELIVERY'
      ];
      query += ` AND d.status = 'Approved' AND rc.status IN ('${productionAllowedStatuses.join("', '")}')`;
    }

    const [documents] = await db.query(query + " ORDER BY d.created_at DESC", [effectiveId]);
    res.json({ success: true, drawings: documents });
  } catch (error) {
    console.error('Error fetching root card drawings:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Submit a Draft for review
exports.submitForReview = async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.query(
      "UPDATE design_documents SET status = 'Pending Review' WHERE id = ? AND status = 'Draft'",
      [id]
    );

    res.json({ success: true, message: 'Drawing submitted for review' });
  } catch (error) {
    console.error('Error submitting for review:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Delete a drawing
exports.deleteDrawing = async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteAll } = req.query;

    const uploadsDir = path.resolve(process.env.UPLOAD_PATH);

    if (deleteAll === 'true') {
      // Find the parent_id if it's a revision, or use the id if it's the parent
      const [parentDoc] = await db.query(
        'SELECT id, parent_id FROM design_documents WHERE id = ?',
        [id]
      );

      if (parentDoc.length === 0) {
        return res.status(404).json({ success: false, message: 'Drawing not found' });
      }

      const parentId = parentDoc[0].parent_id || parentDoc[0].id;

      // Get all file paths to delete physical files
      const [allDocs] = await db.query(
        'SELECT file_path, dwg_path, step_path FROM design_documents WHERE id = ? OR parent_id = ?',
        [parentId, parentId]
      );

      // Delete from database
      await db.query(
        'DELETE FROM design_documents WHERE id = ? OR parent_id = ?',
        [parentId, parentId]
      );

      // Delete physical files
      allDocs.forEach(doc => {
        if (doc.file_path) {
          const fullPath = path.join(uploadsDir, doc.file_path);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        }
        if (doc.dwg_path) {
          const fullPath = path.join(uploadsDir, doc.dwg_path);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        }
        if (doc.step_path) {
          const fullPath = path.join(uploadsDir, doc.step_path);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        }
      });

      return res.json({ success: true, message: 'All versions of this drawing deleted successfully' });
    }

    // Original single delete logic
    const [docs] = await db.query('SELECT file_path, dwg_path, step_path FROM design_documents WHERE id = ?', [id]);
    
    if (docs.length === 0) {
      return res.status(404).json({ success: false, message: 'Drawing not found' });
    }

    const doc = docs[0];

    // Delete from database
    await db.query('DELETE FROM design_documents WHERE id = ?', [id]);

    // Delete physical file
    if (doc.file_path) {
      const fullPath = path.join(uploadsDir, doc.file_path);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
    if (doc.dwg_path) {
      const fullPath = path.join(uploadsDir, doc.dwg_path);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
    if (doc.step_path) {
      const fullPath = path.join(uploadsDir, doc.step_path);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    res.json({ success: true, message: 'Drawing version deleted successfully' });
  } catch (error) {
    console.error('Error deleting drawing:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Upload technical files (.dwg and .step) for an approved drawing
exports.uploadTechnicalFiles = async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files;

    if (!files || (!files.dwg_file && !files.step_file)) {
      return res.status(400).json({ success: false, message: 'No technical files uploaded' });
    }

    // Check if drawing exists and is approved
    const [docs] = await db.query('SELECT status, root_card_id FROM design_documents WHERE id = ?', [id]);
    if (docs.length === 0) {
      // Clean up uploaded files
      if (files.dwg_file) {
        const tempPath = path.resolve(process.env.UPLOAD_PATH, files.dwg_file[0].filename);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
      if (files.step_file) {
        const tempPath = path.resolve(process.env.UPLOAD_PATH, files.step_file[0].filename);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
      return res.status(404).json({ success: false, message: 'Drawing not found' });
    }

    if (docs[0].status !== 'Approved') {
      // Clean up uploaded files
      if (files.dwg_file) {
        const tempPath = path.resolve(process.env.UPLOAD_PATH, files.dwg_file[0].filename);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
      if (files.step_file) {
        const tempPath = path.resolve(process.env.UPLOAD_PATH, files.step_file[0].filename);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
      return res.status(400).json({ success: false, message: 'Technical files can only be uploaded for approved drawings' });
    }

    const rootCardId = docs[0].root_card_id;

    // Fetch project details for folder path
    const [cards] = await db.query('SELECT id, project_name FROM root_cards WHERE id = ?', [rootCardId]);
    const projectName = cards.length > 0 ? cards[0].project_name : 'unknown';
    const effectiveId = cards.length > 0 ? cards[0].id : rootCardId;

    // Determine target project directory inside design_drawings
    const uploadsDir = path.resolve(process.env.UPLOAD_PATH);
    const sanitizedProjectName = sanitizeFolderName(projectName);
    const relativeFolder = `design_drawings/${effectiveId}_${sanitizedProjectName}`;
    const targetDir = path.join(uploadsDir, relativeFolder);

    // Create folder automatically if it doesn't exist
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const updates = [];
    const values = [];

    if (files.dwg_file) {
      const oldPath = path.join(uploadsDir, files.dwg_file[0].filename);
      const newPath = path.join(targetDir, files.dwg_file[0].filename);
      fs.renameSync(oldPath, newPath);

      updates.push('dwg_path = ?');
      values.push(`${relativeFolder}/${files.dwg_file[0].filename}`);
    }

    if (files.step_file) {
      const oldPath = path.join(uploadsDir, files.step_file[0].filename);
      const newPath = path.join(targetDir, files.step_file[0].filename);
      fs.renameSync(oldPath, newPath);

      updates.push('step_path = ?');
      values.push(`${relativeFolder}/${files.step_file[0].filename}`);
    }

    values.push(id);

    await db.query(
      `UPDATE design_documents SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ success: true, message: 'Technical files uploaded successfully' });
  } catch (error) {
    if (files) {
      if (files.dwg_file) {
        const tempPath = path.resolve(process.env.UPLOAD_PATH, files.dwg_file[0].filename);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
      if (files.step_file) {
        const tempPath = path.resolve(process.env.UPLOAD_PATH, files.step_file[0].filename);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
    }
    console.error('Error uploading technical files:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
