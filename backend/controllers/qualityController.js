const db = require('../config/db');

exports.getQualityTasks = async (req, res) => {
  try {
    const { salesOrderId } = req.query;
    // For now, return some dummy data or fetch from database
    const [rows] = await db.query('SELECT * FROM root_cards WHERE status = "QC_PENDING"');
    res.json({ tasks: rows || [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getGRNInspections = async (req, res) => {
  try {
    const { salesOrderId } = req.query;
    
    // Fetch GRNs that are ready for QC
    const [rows] = await db.query(`
      SELECT g.*, v.name as vendor, po.po_number as poNumber,
      rc.project_name as projectName, rc.id as rootCardId,
      (SELECT COUNT(*) FROM grn_items WHERE grn_id = g.id) as items
      FROM grns g
      LEFT JOIN vendors v ON g.vendor_id = v.id
      LEFT JOIN purchase_orders po ON g.purchase_order_id = po.id
      LEFT JOIN quotations q ON po.quotation_id = q.id
      LEFT JOIN root_cards rc ON q.root_card_id = rc.id
      WHERE g.status = 'qc_pending'
      ORDER BY g.created_at DESC
    `);
    
    const grnInspections = rows.map(grn => ({
      id: grn.grn_number,
      dbId: grn.id,
      poNumber: grn.poNumber,
      vendor: grn.vendor,
      projectName: grn.projectName,
      rootCardId: grn.rootCardId,
      qcStatus: grn.status,
      inspectionType: grn.inspection_type,
      receivedDate: grn.posting_date ? new Date(grn.posting_date).toISOString().split('T')[0] : 'N/A',
      items: grn.items,
      acceptedItems: 0, // Should be calculated once inspection starts
      rejectedItems: 0
    }));

    // Calculate stats
    const totalGRN = grnInspections.length;
    const pendingGRN = grnInspections.filter(g => g.qcStatus === 'qc_pending').length;

    res.json({ grnInspections, stats: { totalGRN, pendingGRN } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getQCReadyRootCards = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT DISTINCT rc.id, rc.project_name as projectName, rc.project_code as projectCode
      FROM root_cards rc
      JOIN quotations q ON q.root_card_id = rc.id
      JOIN purchase_orders po ON po.quotation_id = q.id
      JOIN grns g ON g.purchase_order_id = po.id
      WHERE g.status = 'qc_pending'
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getGRNMaterialsForInspection = async (req, res) => {
  try {
    const { rootCardId } = req.query;
    
    if (!rootCardId) {
      return res.status(400).json({ message: 'Root Card ID is required' });
    }

    const [rows] = await db.query(`
      SELECT 
        gi.*, 
        g.grn_number, 
        g.posting_date,
        g.inspection_type,
        g.vendor_id,
        po.po_number,
        v.name as vendor_name,
        poi.item_group
      FROM grn_items gi
      JOIN grns g ON gi.grn_id = g.id
      JOIN purchase_orders po ON g.purchase_order_id = po.id
      JOIN vendors v ON g.vendor_id = v.id
      JOIN quotations q ON po.quotation_id = q.id
      JOIN purchase_order_items poi ON gi.po_item_id = poi.id
      WHERE q.root_card_id = ? AND g.status = 'qc_pending'
    `, [rootCardId]);

    // Fetch serials for these GRN items
    const grnIds = [...new Set(rows.map(r => r.grn_id))];
    let serials = [];
    if (grnIds.length > 0) {
      const [serialRows] = await db.query(
        `SELECT s.*, qir.document_path 
         FROM inventory_serials s 
         LEFT JOIN quality_inspection_results qir ON s.serial_number = qir.serial_number 
         WHERE s.grn_id IN (?)
         ORDER BY qir.id DESC`,
        [grnIds]
      );
      // Ensure we get the latest result per serial if multiple exist (unlikely but possible)
      const uniqueSerials = [];
      const seen = new Set();
      serialRows.forEach(s => {
        if (!seen.has(s.serial_number)) {
          seen.add(s.serial_number);
          uniqueSerials.push(s);
        }
      });
      serials = uniqueSerials;
    }

    // Fetch common documents for these GRNs
    let commonDocs = [];
    if (grnIds.length > 0) {
      const [docRows] = await db.query(
        'SELECT grn_id, common_document_path FROM quality_inspections WHERE grn_id IN (?) AND common_document_path IS NOT NULL',
        [grnIds]
      );
      commonDocs = docRows;
    }

    const materials = rows.map(item => {
      const grnCommonDoc = commonDocs.find(cd => cd.grn_id === item.grn_id);
      return {
        ...item,
        common_document_path: grnCommonDoc ? grnCommonDoc.common_document_path : null,
        serials: serials.filter(s => s.grn_id === item.grn_id && s.item_id === item.po_item_id).map(s => ({
          serial_number: s.serial_number,
          status: s.status,
          inspection_status: s.inspection_status || 'Pending',
          document_path: s.document_path
        }))
      };
    });

    res.json(materials);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getStageQC = async (req, res) => {
  try {
    const { salesOrderId } = req.query;
    res.json({ stageQC: [], stats: { totalStageQC: 0, pendingStageQC: 0 } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sendToQC = async (req, res) => {
  const { id } = req.params;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Update GRN status
    await connection.query(
      'UPDATE grns SET status = "qc_pending" WHERE id = ?',
      [id]
    );

    // 2. Get GRN info for notification
    const [grnRows] = await connection.query(
      'SELECT grn_number, vendor_id FROM grns WHERE id = ?',
      [id]
    );
    
    if (grnRows.length === 0) {
      throw new Error('GRN not found');
    }

    const grn = grnRows[0];

    // 3. Create notification for Quality department
    await connection.query(
      `INSERT INTO notifications (department, title, message, type) 
       VALUES (?, ?, ?, ?)`,
      [
        'Quality',
        'New GRN for Inspection',
        `GRN ${grn.grn_number} has been submitted and is ready for quality inspection.`,
        'info'
      ]
    );

    await connection.commit();
    res.json({ message: 'GRN sent to Quality department successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error sending GRN to QC:', error);
    res.status(500).json({ message: error.message });
  } finally {
    connection.release();
  }
};

exports.updateGRNInspectionType = async (req, res) => {
    const { id } = req.params;
    const { inspection_type } = req.body;
    try {
        await db.query('UPDATE grns SET inspection_type = ? WHERE id = ?', [inspection_type, id]);
        res.json({ message: 'Inspection type updated successfully' });
    } catch (error) {
        console.error('Error updating inspection type:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getGRNStNumbers = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT s.*, gi.material_name as itemName, gi.po_item_id
            FROM inventory_serials s
            JOIN grn_items gi ON s.grn_id = gi.grn_id AND s.item_id = gi.po_item_id
            WHERE s.grn_id = ?
        `, [id]);
        
        // Group by item
        const grouped = rows.reduce((acc, row) => {
            if (!acc[row.itemName]) {
                acc[row.itemName] = {
                    itemName: row.itemName,
                    item_id: row.item_id,
                    serials: []
                };
            }
            acc[row.itemName].serials.push({
                serial_number: row.serial_number,
                status: row.status,
                inspection_status: row.inspection_status || 'Pending'
            });
            return acc;
        }, {});

        res.json(Object.values(grouped));
    } catch (error) {
        console.error('Error fetching ST numbers:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.submitQualityInspection = async (req, res) => {
    const { grn_id, inspection_type, results, remarks } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Create inspection header
        const [inspResult] = await connection.query(
            'INSERT INTO quality_inspections (grn_id, inspection_type, status, remarks) VALUES (?, ?, ?, ?)',
            [grn_id, inspection_type, 'Completed', remarks]
        );
        const inspectionId = inspResult.insertId;

        // 2. Insert results and update serial status
        for (const item of results) {
            await connection.query(
                'INSERT INTO quality_inspection_results (inspection_id, serial_number, status, notes) VALUES (?, ?, ?, ?)',
                [inspectionId, item.serial_number, item.status, item.notes]
            );

            // Update inventory_serials
            const finalStatus = item.status === 'Accepted' ? 'Available' : 'Rejected';
            await connection.query(
                'UPDATE inventory_serials SET status = ?, inspection_status = ? WHERE serial_number = ?',
                [finalStatus, item.status, item.serial_number]
            );
        }

        // 3. Update GRN status if all serials are inspected
        const [pendingRows] = await connection.query(
            'SELECT COUNT(*) as count FROM inventory_serials WHERE grn_id = ? AND inspection_status = "Pending"',
            [grn_id]
        );
        
        if (pendingRows[0].count === 0) {
            await connection.query('UPDATE grns SET status = "qc_completed" WHERE id = ?', [grn_id]);
        }

        await connection.commit();
        res.json({ message: 'Inspection results submitted successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error submitting inspection:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.createOutsourceChallan = async (req, res) => {
    const { grn_id, vendor_id, challan_date, serial_numbers } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Generate Challan Number
        const year = new Date().getFullYear();
        const [lastChallan] = await connection.query('SELECT challan_number FROM quality_inspection_challans ORDER BY id DESC LIMIT 1');
        let nextNum = '0001';
        if (lastChallan.length > 0) {
            const lastNum = parseInt(lastChallan[0].challan_number.split('-').pop());
            nextNum = (lastNum + 1).toString().padStart(4, '0');
        }
        const challan_number = `QC-CH-${year}-${nextNum}`;

        // 1. Create Challan
        const [result] = await connection.query(
            'INSERT INTO quality_inspection_challans (grn_id, vendor_id, challan_number, challan_date) VALUES (?, ?, ?, ?)',
            [grn_id, vendor_id, challan_date, challan_number]
        );
        const challanId = result.insertId;

        // 2. Link serials to challan and update status
        await connection.query(
            'UPDATE inventory_serials SET inspection_challan_id = ?, inspection_status = "Sent for Inspection" WHERE serial_number IN (?)',
            [challanId, serial_numbers]
        );

        await connection.commit();
        res.json({ message: 'Outsource challan created successfully', challan_number });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating outsource challan:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.updateOutsourceStatus = async (req, res) => {
    const { serial_numbers, status } = req.body;
    try {
        await db.query(
            'UPDATE inventory_serials SET inspection_status = ? WHERE serial_number IN (?)',
            [status, serial_numbers]
        );
        res.json({ message: 'Status updated successfully' });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.submitOutsourceResults = async (req, res) => {
    const { grn_id, results, common_document_path, remarks } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Create inspection header
        const [inspResult] = await connection.query(
            'INSERT INTO quality_inspections (grn_id, inspection_type, status, remarks, common_document_path) VALUES (?, ?, ?, ?, ?)',
            [grn_id, 'Outsource', 'Completed', remarks, common_document_path]
        );
        const inspectionId = inspResult.insertId;

        // 2. Insert results and update serial status
        for (const item of results) {
            await connection.query(
                'INSERT INTO quality_inspection_results (inspection_id, serial_number, status, notes, document_path) VALUES (?, ?, ?, ?, ?)',
                [inspectionId, item.serial_number, item.status, item.notes, item.document_path]
            );

            // Update inventory_serials
            const finalStatus = item.status === 'Accepted' ? 'Available' : 'Rejected';
            await connection.query(
                'UPDATE inventory_serials SET status = ?, inspection_status = ? WHERE serial_number = ?',
                [finalStatus, item.status, item.serial_number]
            );
        }

        // 3. Update GRN status if all serials are inspected
        const [pendingRows] = await connection.query(
            'SELECT COUNT(*) as count FROM inventory_serials WHERE grn_id = ? AND (inspection_status = "Pending" OR inspection_status = "Sent for Inspection")',
            [grn_id]
        );
        
        if (pendingRows[0].count === 0) {
            await connection.query('UPDATE grns SET status = "qc_completed" WHERE id = ?', [grn_id]);
        }

        await connection.commit();
        res.json({ message: 'Outsource inspection results submitted successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error submitting outsource results:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};
