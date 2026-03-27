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
    
    // Fetch GRNs that are ready for QC (exclude 'pending' as it's not yet sent to quality)
    const [rows] = await db.query(`
      SELECT g.*, v.name as vendor, po.po_number as poNumber,
      rc.project_name as projectName, rc.id as rootCardId,
      (SELECT COUNT(*) FROM grn_items WHERE grn_id = g.id) as items,
      (SELECT id FROM quality_final_reports WHERE grn_id = g.id LIMIT 1) as finalReportId
      FROM grns g
      LEFT JOIN vendors v ON g.vendor_id = v.id
      LEFT JOIN purchase_orders po ON g.purchase_order_id = po.id
      LEFT JOIN quotations q ON po.quotation_id = q.id
      LEFT JOIN root_cards rc ON q.root_card_id = rc.id
      WHERE g.status IN ('qc_pending', 'qc_finalized', 'qc_completed', 'awaiting_storage', 'completed', 'approved', 'partially_released', 'material_released')
      ORDER BY g.created_at DESC
    `);
    
    const grnInspections = rows.map(grn => ({
      id: grn.grn_number,
      dbId: grn.id,
      poNumber: grn.poNumber,
      vendor: grn.vendor,
      projectName: grn.projectName,
      rootCardId: grn.rootCardId,
      qcStatus: (['qc_completed', 'qc_finalized', 'awaiting_storage', 'completed', 'approved', 'partially_released', 'material_released'].includes(grn.status)) ? 'completed' : 'pending',
      inspectionType: grn.inspection_type,
      receivedDate: grn.posting_date ? new Date(grn.posting_date).toISOString().split('T')[0] : 'N/A',
      items: grn.items,
      finalReportId: grn.finalReportId,
      acceptedItems: 0, 
      rejectedItems: 0
    }));

    // Calculate stats
    const totalGRN = grnInspections.length;
    const pendingGRN = grnInspections.filter(g => g.qcStatus === 'pending').length;

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
      WHERE g.status IN ('qc_pending', 'qc_finalized', 'qc_completed', 'awaiting_storage', 'completed', 'approved', 'partially_released', 'material_released')
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
        g.status as grn_status,
        po.po_number,
        v.name as vendor_name,
        poi.item_group
      FROM grn_items gi
      JOIN grns g ON gi.grn_id = g.id
      JOIN purchase_orders po ON g.purchase_order_id = po.id
      JOIN vendors v ON g.vendor_id = v.id
      JOIN quotations q ON po.quotation_id = q.id
      JOIN purchase_order_items poi ON gi.po_item_id = poi.id
      WHERE q.root_card_id = ? AND (g.status IN ('qc_pending', 'qc_finalized', 'qc_completed', 'awaiting_storage', 'completed', 'approved', 'partially_released', 'material_released'))
    `, [rootCardId]);

    // Fetch serials for these GRN items
    const grnIds = [...new Set(rows.map(r => r.grn_id))];
    let serials = [];
    if (grnIds.length > 0) {
      const [serialRows] = await db.query(
        `SELECT s.*, qir.document_path, qir.notes as rejection_reason 
         FROM inventory_serials s 
         LEFT JOIN (
           SELECT serial_number, document_path, notes, id
           FROM quality_inspection_results
           WHERE id IN (
             SELECT MAX(id)
             FROM quality_inspection_results
             GROUP BY serial_number
           )
         ) qir ON s.serial_number = qir.serial_number 
         WHERE s.grn_id IN (?)
         ORDER BY s.id ASC`,
        [grnIds]
      );
      serials = serialRows;
    }

    // Fetch common documents for these GRNs/items
    let commonDocs = [];
    if (grnIds.length > 0) {
      console.log('Fetching docs for GRN IDs:', grnIds);
      const [docRows] = await db.query(
        'SELECT grn_id, po_item_id, common_document_path, rejected_document_path FROM quality_inspections WHERE grn_id IN (?)',
        [grnIds]
      );
      commonDocs = docRows;
      console.log('Found docs count:', commonDocs.length);
      if (commonDocs.length > 0) console.log('Sample Doc:', commonDocs[0]);
    }

    const materials = rows.map(item => {
      // Find document for this specific item in this GRN
      // Use Number() for comparison to handle string/number type mismatches from DB driver
      const itemDoc = commonDocs.find(cd => 
        Number(cd.grn_id) === Number(item.grn_id) && 
        Number(cd.po_item_id) === Number(item.po_item_id)
      );
      
      if (itemDoc) {
        console.log(`Matched doc for item ${item.material_name} (GRN:${item.grn_id}, PO_ITEM:${item.po_item_id}):`, 
          { accepted: itemDoc.common_document_path, rejected: itemDoc.rejected_document_path });
      }
      
      const itemSerials = serials.filter(s => 
        Number(s.grn_id) === Number(item.grn_id) && 
        Number(s.item_id) === Number(item.po_item_id)
      );
      
      // Calculate item-level completion status
      const allProcessed = itemSerials.length > 0 && itemSerials.every(s => s.inspection_status === 'Accepted' || s.inspection_status === 'Rejected');
      const hasAccepted = itemSerials.some(s => s.inspection_status === 'Accepted');
      const hasRejected = itemSerials.some(s => s.inspection_status === 'Rejected');
      
      const isOutsource = item.inspection_type === 'Outsource';
      const needsAcceptedDoc = isOutsource && hasAccepted && (!itemDoc || !itemDoc.common_document_path);
      const needsRejectedDoc = isOutsource && hasRejected && (!itemDoc || !itemDoc.rejected_document_path);
      
      const isItemDone = allProcessed && (!isOutsource || (!needsAcceptedDoc && !needsRejectedDoc));

      return {
        ...item,
        status: isItemDone ? 'QC COMPLETED' : 'QC PENDING',
        common_document_path: itemDoc ? itemDoc.common_document_path : null,
        rejected_document_path: itemDoc ? itemDoc.rejected_document_path : null,
        serials: itemSerials.map(s => ({
          serial_number: s.serial_number,
          item_code: s.item_code,
          status: s.status,
          inspection_status: s.inspection_status || 'Pending',
          document_path: s.document_path,
          rejection_reason: s.rejection_reason
        }))
      };
    });

    res.json(materials);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.finalizeGRNQC = async (req, res) => {
    const { id } = req.params;
    try {
        // Check if all serials are processed
        const [allSerials] = await db.query(
            'SELECT inspection_status, item_id FROM inventory_serials WHERE grn_id = ?',
            [id]
        );
        
        const allProcessed = allSerials.length > 0 && allSerials.every(s => s.inspection_status === 'Accepted' || s.inspection_status === 'Rejected');
        
        if (!allProcessed) {
            return res.status(400).json({ message: 'All items must be inspected before finalizing QC' });
        }

        // Check if all outsource items have documents
        const [grnInfo] = await db.query('SELECT inspection_type FROM grns WHERE id = ?', [id]);
        const isOutsource = grnInfo[0]?.inspection_type === 'Outsource';
        
        if (isOutsource) {
            const [itemDocs] = await db.query(
                'SELECT po_item_id, common_document_path, rejected_document_path FROM quality_inspections WHERE grn_id = ?',
                [id]
            );
            
            const itemIds = [...new Set(allSerials.map(s => s.item_id))];
            
            for (const itemId of itemIds) {
                const hasAccepted = allSerials.some(s => s.item_id === itemId && s.inspection_status === 'Accepted');
                const hasRejected = allSerials.some(s => s.item_id === itemId && s.inspection_status === 'Rejected');
                const doc = itemDocs.find(d => Number(d.po_item_id) === Number(itemId));
                
                if (hasAccepted && !doc?.common_document_path) {
                    return res.status(400).json({ message: 'Missing Accepted Items Report for some materials' });
                }
                if (hasRejected && !doc?.rejected_document_path) {
                    return res.status(400).json({ message: 'Missing Rejected Items Report for some materials' });
                }
            }
        }

        await db.query('UPDATE grns SET status = "qc_finalized" WHERE id = ?', [id]);
        res.json({ message: 'QC finalized successfully and ready for report creation' });
    } catch (error) {
        console.error('Error finalizing QC:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.createFinalQCReport = async (req, res) => {
    const { grn_id, grn_number, project_name, vendor_name, inspection_type, received_date, materials } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Create report header
        const [reportResult] = await connection.query(
            `INSERT INTO quality_final_reports 
             (grn_id, grn_number, project_name, vendor_name, inspection_type, received_date) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [grn_id, grn_number, project_name, vendor_name, inspection_type, received_date]
        );

        const reportId = reportResult.insertId;

        // 2. Create report items
        if (materials && materials.length > 0) {
            for (const item of materials) {
                const [itemResult] = await connection.query(
                    `INSERT INTO quality_final_report_items 
                     (report_id, material_name, item_code, item_group, material_id, received_qty, unit, accepted_qty, rejected_qty, accepted_report, rejected_report) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        reportId, 
                        item.material_name, 
                        item.item_code,
                        item.item_group,
                        item.material_id, 
                        item.received_qty, 
                        item.unit, 
                        item.accepted_qty, 
                        item.rejected_qty, 
                        item.accepted_report, 
                        item.rejected_report
                    ]
                );

                const reportItemId = itemResult.insertId;

                // 3. Save ST number status snapshots
                if (item.st_numbers && item.st_numbers.length > 0) {
                    for (const st of item.st_numbers) {
                        await connection.query(
                            `INSERT INTO quality_final_report_st_numbers (report_item_id, st_code, item_code, status) VALUES (?, ?, ?, ?)`,
                            [reportItemId, st.st_code, st.item_code || st.st_code.replace('ST-', ''), st.status]
                        );
                    }
                }
            }
        }

        await connection.commit();
        res.json({ message: 'Final QC report created successfully', reportId });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating final QC report:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.getFinalQCReports = async (req, res) => {
    try {
        const { rootCardId } = req.query;
        let query = 'SELECT * FROM quality_final_reports';
        let queryParams = [];

        if (rootCardId) {
            query = `
                SELECT qfr.* 
                FROM quality_final_reports qfr
                JOIN grns g ON qfr.grn_id = g.id
                JOIN purchase_orders po ON g.purchase_order_id = po.id
                JOIN quotations q ON po.quotation_id = q.id
                WHERE q.root_card_id = ?
            `;
            queryParams = [rootCardId];
        }

        const [rows] = await db.query(`${query} ORDER BY created_at DESC`, queryParams);
        
        // Fetch items for each report
        const reports = [];
        for (const report of rows) {
            const [items] = await db.query(
                'SELECT * FROM quality_final_report_items WHERE report_id = ?',
                [report.id]
            );

            // Fetch ST numbers for each item
            for (const item of items) {
                const [stNumbers] = await db.query(
                    'SELECT st_code, item_code, status FROM quality_final_report_st_numbers WHERE report_item_id = ?',
                    [item.id]
                );
                item.st_numbers = stNumbers;
            }

            reports.push({ ...report, materials: items });
        }

        res.json(reports);
    } catch (error) {
        console.error('Error fetching final QC reports:', error);
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
    
    // 0. Check current status and get project name
    const [currentGrn] = await connection.query(`
      SELECT g.status, g.grn_number, rc.project_name
      FROM grns g
      LEFT JOIN purchase_orders po ON g.purchase_order_id = po.id
      LEFT JOIN quotations q ON po.quotation_id = q.id
      LEFT JOIN root_cards rc ON q.root_card_id = rc.id
      WHERE g.id = ?
    `, [id]);

    if (currentGrn.length === 0) {
      throw new Error('GRN not found');
    }

    const grn = currentGrn[0];

    if (grn.status !== 'pending') {
      throw new Error('GRN must be in "READY FOR QC" status to be sent for inspection');
    }

    // 1. Update GRN status
    await connection.query(
      'UPDATE grns SET status = "qc_pending" WHERE id = ?',
      [id]
    );

    // 3. Create notification for Quality department
    await connection.query(
      `INSERT INTO notifications (department, title, message, type, link) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        'Quality',
        'Material Quality Check',
        `GRN ${grn.grn_number} for project ${grn.project_name || 'N/A'} is ready for quality inspection.`,
        'info',
        `/department/quality/incoming?search=${grn.grn_number}`
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
            SELECT s.*, gi.material_name as itemName, gi.po_item_id,
                   qi.common_document_path as acceptedDoc,
                   qi.rejected_document_path as rejectedDoc
            FROM inventory_serials s
            JOIN grn_items gi ON s.grn_id = gi.grn_id AND s.item_id = gi.po_item_id
            LEFT JOIN quality_inspections qi ON qi.grn_id = s.grn_id AND qi.po_item_id = s.item_id
            WHERE s.grn_id = ?
        `, [id]);
        
        // Group by item
        const grouped = rows.reduce((acc, row) => {
            if (!acc[row.itemName]) {
                acc[row.itemName] = {
                    itemName: row.itemName,
                    po_item_id: row.po_item_id,
                    acceptedDoc: row.acceptedDoc,
                    rejectedDoc: row.rejectedDoc,
                    serials: []
                };
            }
            acc[row.itemName].serials.push({
                serial_number: row.serial_number,
                item_code: row.item_code,
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

exports.sendReportToInventory = async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get report details
        const [reportRows] = await connection.query(
            'SELECT grn_id, grn_number, project_name FROM quality_final_reports WHERE id = ?',
            [id]
        );
        
        if (reportRows.length === 0) {
            throw new Error('Report not found');
        }
        
        const report = reportRows[0];

        // 2. Update report status
        await connection.query(
            'UPDATE quality_final_reports SET is_sent_to_inventory = TRUE WHERE id = ?',
            [id]
        );

        // 3. Update GRN status to qc_completed
        await connection.query(
            'UPDATE grns SET status = "qc_completed" WHERE id = ?',
            [report.grn_id]
        );

        // 4. Create notification for Inventory department
        await connection.query(
            `INSERT INTO notifications (department, title, message, type, link) 
             VALUES (?, ?, ?, ?, ?)`,
            [
                'Inventory',
                'Quality Check Completed',
                `Quality check is completed and material is ready for release for production against project: ${report.project_name} (GRN: ${report.grn_number})`,
                'success',
                `/department/inventory/grn?search=${report.grn_number}`
            ]
        );

        await connection.commit();
        res.json({ message: 'QC Report sent to Inventory successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error sending report to inventory:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.submitQualityInspection = async (req, res) => {
    const { grn_id, po_item_id, inspection_type, results, remarks } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Create or update inspection header for this specific item
        const [inspResult] = await connection.query(
            'INSERT INTO quality_inspections (grn_id, po_item_id, inspection_type, status, remarks) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE remarks = VALUES(remarks)',
            [grn_id, po_item_id, inspection_type, 'Completed', remarks]
        );
        
        let inspectionId;
        if (inspResult.insertId) {
            inspectionId = inspResult.insertId;
        } else {
            const [rows] = await connection.query('SELECT id FROM quality_inspections WHERE grn_id = ? AND po_item_id = ?', [grn_id, po_item_id]);
            inspectionId = rows[0].id;
        }

        // 2. Insert results and update serial status
        for (const item of results) {
            if (item.status === 'Pending') {
                // If status is Pending, it's a revert action
                // Delete previous result if exists
                await connection.query(
                    'DELETE FROM quality_inspection_results WHERE inspection_id = ? AND serial_number = ?',
                    [inspectionId, item.serial_number]
                );

                // Update inventory_serials back to Quality/Pending
                await connection.query(
                    'UPDATE inventory_serials SET status = "Quality", inspection_status = "Pending" WHERE serial_number = ?',
                    [item.serial_number]
                );
            } else {
                await connection.query(
                    'INSERT INTO quality_inspection_results (inspection_id, serial_number, status, notes) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status), notes = VALUES(notes)',
                    [inspectionId, item.serial_number, item.status, item.notes]
                );

                // Update inventory_serials
                const finalStatus = item.status === 'Accepted' ? 'Available' : 'Rejected';
                await connection.query(
                    'UPDATE inventory_serials SET status = ?, inspection_status = ? WHERE serial_number = ?',
                    [finalStatus, item.status, item.serial_number]
                );
            }
        }

        // 3. Update GRN status if all serials are inspected and all required docs are present
        const [allSerials] = await connection.query(
            'SELECT inspection_status, item_id FROM inventory_serials WHERE grn_id = ?',
            [grn_id]
        );
        
        const allProcessed = allSerials.every(s => s.inspection_status === 'Accepted' || s.inspection_status === 'Rejected');
        
        if (allProcessed) {
            const [grnInfo] = await connection.query('SELECT inspection_type FROM grns WHERE id = ?', [grn_id]);
            const isOutsource = grnInfo[0]?.inspection_type === 'Outsource';
            
            if (isOutsource) {
                // Check per-item documents
                const [itemDocs] = await connection.query(
                    'SELECT po_item_id, common_document_path, rejected_document_path FROM quality_inspections WHERE grn_id = ?',
                    [grn_id]
                );
                
                const itemIds = [...new Set(allSerials.map(s => s.item_id))];
                let allDocsPresent = true;
                
                for (const itemId of itemIds) {
                    const hasAccepted = allSerials.some(s => s.item_id === itemId && s.inspection_status === 'Accepted');
                    const hasRejected = allSerials.some(s => s.item_id === itemId && s.inspection_status === 'Rejected');
                    const doc = itemDocs.find(d => d.po_item_id === itemId);
                    
                    if (hasAccepted && !doc?.common_document_path) { allDocsPresent = false; break; }
                    if (hasRejected && !doc?.rejected_document_path) { allDocsPresent = false; break; }
                }
                
                if (allDocsPresent) {
                    await connection.query('UPDATE grns SET status = "qc_completed" WHERE id = ?', [grn_id]);
                } else {
                    await connection.query('UPDATE grns SET status = "qc_pending" WHERE id = ?', [grn_id]);
                }
            } else {
                await connection.query('UPDATE grns SET status = "qc_completed" WHERE id = ?', [grn_id]);
            }
        } else {
            // If not all processed (due to a revert), move GRN back to qc_pending if it was completed
            await connection.query('UPDATE grns SET status = "qc_pending" WHERE id = ?', [grn_id]);
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
    let { grn_id, po_item_id, results, remarks, common_document_path, rejected_document_path } = req.body;
    
    // Process uploaded files from req.files (using upload.any())
    if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
            if (file.fieldname === 'common_doc' || file.fieldname === 'accepted_doc') {
                common_document_path = file.filename;
            } else if (file.fieldname === 'rejected_doc') {
                rejected_document_path = file.filename;
            }
        });
    }

    // Ensure numeric IDs and handle "undefined" strings from frontend
    const gid = (grn_id && grn_id !== 'undefined') ? parseInt(grn_id) : null;
    const pid = (po_item_id && po_item_id !== 'undefined') ? parseInt(po_item_id) : null;

    console.log('--- Submit Outsource Results Debug ---');
    console.log('IDs Received:', { grn_id, po_item_id });
    console.log('IDs Parsed:', { gid, pid });
    console.log('Paths:', { common_document_path, rejected_document_path });

    if (!gid) {
        return res.status(400).json({ success: false, message: 'Missing GRN ID' });
    }

    // Handle results parsing (it comes as string from FormData)
    if (results && typeof results === 'string') {
        try {
            results = JSON.parse(results);
        } catch (e) {
            results = [];
        }
    } else if (!results) {
        results = [];
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Create or update inspection header for this specific item
        // Note: Using po_item_id in the unique constraint
        const [inspResult] = await connection.query(
            `INSERT INTO quality_inspections 
             (grn_id, po_item_id, inspection_type, status, remarks, common_document_path, rejected_document_path) 
             VALUES (?, ?, ?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE 
             remarks = IFNULL(VALUES(remarks), remarks), 
             common_document_path = IFNULL(VALUES(common_document_path), common_document_path), 
             rejected_document_path = IFNULL(VALUES(rejected_document_path), rejected_document_path),
             status = 'Completed'`,
            [gid, pid, 'Outsource', 'Completed', remarks || null, common_document_path || null, rejected_document_path || null]
        );
        
        console.log('DB Update Result:', inspResult.affectedRows, 'rows affected');

        let inspectionId;
        if (inspResult.insertId) {
            inspectionId = inspResult.insertId;
        } else {
            const [rows] = await connection.query(
                'SELECT id FROM quality_inspections WHERE grn_id = ? AND (po_item_id = ? OR (po_item_id IS NULL AND ? IS NULL))', 
                [gid, pid, pid]
            );
            inspectionId = rows[0]?.id;
        }

        // 2. Insert results and update serial status
        if (results.length > 0) {
            for (const item of results) {
                await connection.query(
                    'INSERT INTO quality_inspection_results (inspection_id, serial_number, status, notes, document_path) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status), notes = VALUES(notes), document_path = COALESCE(VALUES(document_path), document_path)',
                    [inspectionId, item.serial_number, item.status, item.notes, item.document_path]
                );

                // Update inventory_serials
                const finalStatus = item.status === 'Accepted' ? 'Available' : 'Rejected';
                await connection.query(
                    'UPDATE inventory_serials SET status = ?, inspection_status = ? WHERE serial_number = ?',
                    [finalStatus, item.status, item.serial_number]
                );
            }
        }

        // 3. Update GRN status if all serials are inspected and all required docs are present
        const [allSerials] = await connection.query(
            'SELECT inspection_status, item_id FROM inventory_serials WHERE grn_id = ?',
            [gid]
        );
        
        const allProcessed = allSerials.length > 0 && allSerials.every(s => s.inspection_status === 'Accepted' || s.inspection_status === 'Rejected');
        
        if (allProcessed) {
            const [grnInfo] = await connection.query('SELECT inspection_type FROM grns WHERE id = ?', [gid]);
            const isOutsource = grnInfo[0]?.inspection_type === 'Outsource';
            
            if (isOutsource) {
                const [itemDocs] = await connection.query(
                    'SELECT po_item_id, common_document_path, rejected_document_path FROM quality_inspections WHERE grn_id = ?',
                    [gid]
                );
                
                const itemIds = [...new Set(allSerials.map(s => s.item_id))];
                let allDocsPresent = true;
                
                for (const itemId of itemIds) {
                    const hasAccepted = allSerials.some(s => s.item_id === itemId && s.inspection_status === 'Accepted');
                    const hasRejected = allSerials.some(s => s.item_id === itemId && s.inspection_status === 'Rejected');
                    const doc = itemDocs.find(d => Number(d.po_item_id) === Number(itemId));
                    
                    if (hasAccepted && !doc?.common_document_path) { allDocsPresent = false; break; }
                    if (hasRejected && !doc?.rejected_document_path) { allDocsPresent = false; break; }
                }
                
                if (allDocsPresent) {
                    await connection.query('UPDATE grns SET status = "qc_completed" WHERE id = ?', [gid]);
                }
            } else {
                await connection.query('UPDATE grns SET status = "qc_completed" WHERE id = ?', [gid]);
            }
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
