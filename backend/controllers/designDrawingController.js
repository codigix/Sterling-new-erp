const db = require('../config/db');
const path = require('path');
const fs = require('fs');

// Upload a new drawing
exports.uploadDrawing = async (req, res) => {
  try {
    console.log('Upload request body:', req.body);
    console.log('Upload request file:', req.file);
    
    const { root_card_id, name, type, description } = req.body;
    const created_by = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const file_path = req.file.filename;
    const initialStatus = type === 'Final Approved Drawing' ? 'Approved' : 'Pending Review';

    const [result] = await db.query(
      `INSERT INTO design_documents (root_card_id, name, type, version, file_path, description, status, created_by) 
       VALUES (?, ?, ?, 1, ?, ?, ?, ?)`,
      [root_card_id, name, type, file_path, description, initialStatus, created_by]
    );

    res.status(201).json({ 
      success: true, 
      message: 'Drawing uploaded successfully', 
      drawingId: result.insertId 
    });
  } catch (error) {
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
      return res.status(404).json({ success: false, message: 'Parent document not found' });
    }

    const doc = docs[0];
    const new_version = doc.last_version + 1;
    const file_path = req.file.filename;

    // Set all previous versions to 'Rejected' (or 'Obsolete' but user said Rejected)
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
    const isProduction = req.user.role === 'production';
    
    let query = `
      SELECT d.*, u.full_name as created_by_name, r.full_name as reviewer_name, 
             rc.project_name, rc.po_number
      FROM design_documents d
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN users r ON d.reviewer_id = r.id
      LEFT JOIN root_cards rc ON d.root_card_id = rc.id
      WHERE 1=1
    `;

    // Production can only see Approved drawings from root cards that have been sent to production or are in relevant states
    if (isProduction) {
      query += " AND d.status = 'Approved' AND rc.status IN ('RC_CREATED', 'PURCHASE_ORDER_RELEASED', 'MATERIAL_PLANNING', 'PRODUCTION_IN_PROGRESS', 'DIMENSIONAL_QC_PENDING', 'DIMENSIONAL_QC_APPROVED', 'PAINTING_IN_PROGRESS', 'FINAL_QC_PENDING', 'FINAL_QC_APPROVED', 'READY_FOR_DELIVERY')";
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
    const isProduction = req.user.role === 'production';

    let query = `
      SELECT d.*, u.full_name as created_by_name, r.full_name as reviewer_name,
             rc.project_name, rc.po_number
      FROM design_documents d
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN users r ON d.reviewer_id = r.id
      LEFT JOIN root_cards rc ON d.root_card_id = rc.id
      WHERE d.root_card_id = ?
    `;

    // Production can only see Approved drawings from root cards that have been sent to production or are in relevant states
    if (isProduction) {
      query += " AND d.status = 'Approved' AND rc.status IN ('RC_CREATED', 'PURCHASE_ORDER_RELEASED', 'MATERIAL_PLANNING', 'PRODUCTION_IN_PROGRESS', 'DIMENSIONAL_QC_PENDING', 'DIMENSIONAL_QC_APPROVED', 'PAINTING_IN_PROGRESS', 'FINAL_QC_PENDING', 'FINAL_QC_APPROVED', 'READY_FOR_DELIVERY')";
    }

    const [documents] = await db.query(query, [rootCardId]);
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
        'SELECT file_path FROM design_documents WHERE id = ? OR parent_id = ?',
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
          const fileName = path.basename(doc.file_path);
          const fullPath = path.join(process.env.UPLOAD_PATH || 'uploads', fileName);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        }
      });

      return res.json({ success: true, message: 'All versions of this drawing deleted successfully' });
    }

    // Original single delete logic
    const [docs] = await db.query('SELECT file_path FROM design_documents WHERE id = ?', [id]);
    
    if (docs.length === 0) {
      return res.status(404).json({ success: false, message: 'Drawing not found' });
    }

    const filePath = docs[0].file_path;

    // Delete from database
    await db.query('DELETE FROM design_documents WHERE id = ?', [id]);

    // Delete physical file
    if (filePath) {
      const fileName = path.basename(filePath);
      const fullPath = path.join(process.env.UPLOAD_PATH || 'uploads', fileName);
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
