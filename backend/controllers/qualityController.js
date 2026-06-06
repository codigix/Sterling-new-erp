const db = require('../config/db');

exports.getQualityTasks = async (req, res) => {
  try {
    // AUTO-CREATE project_inspections table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS project_inspections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        root_card_id VARCHAR(255) NOT NULL,
        inspection_name VARCHAR(255) NOT NULL,
        phase INT DEFAULT 1,
        status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
        document_path VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (root_card_id),
        INDEX (phase)
      )
    `);

    // Ensure phase column exists (for backward compatibility)
    try {
      const [cols] = await db.query("SHOW COLUMNS FROM project_inspections LIKE 'phase'");
      if (cols.length === 0) {
        await db.query("ALTER TABLE project_inspections ADD COLUMN phase INT DEFAULT 1 AFTER inspection_name");
        await db.query("CREATE INDEX idx_phase ON project_inspections(phase)");
      }
    } catch (e) {
      console.log("Migration error (non-critical):", e.message);
    }

    // Fetch root cards for both phases separately
    const query = `
      SELECT * FROM (
        -- Phase 1 Tasks: Show if P1 is pending OR if it's approved (so it remains visible)
        SELECT DISTINCT rc.*, 1 as current_phase, CONCAT(rc.id, '-1') as task_id,
          (SELECT COUNT(*) FROM project_inspections WHERE root_card_id = rc.id AND phase = 1) as total_tests,
          (SELECT COUNT(*) FROM project_inspections WHERE root_card_id = rc.id AND phase = 1 AND status = 'Approved') as approved_tests
        FROM root_cards rc 
        WHERE rc.status IN (
          "QC_PENDING", "DIMENSIONAL_QC_PENDING", "DIMENSIONAL_QC_APPROVED", 
          "PHASE_2_QC_PENDING", "PHASE_2_QC_APPROVED",
          "Production completed and send to Quality fot QC",
          "send to production for complete final produciton",
          "final Prodcution completed and send to quality for final qc",
          "Redy for Dispatch"
        )

        UNION ALL

        -- Phase 2 Tasks: Show only if Phase 2 is actually pending or approved
        SELECT DISTINCT rc.*, 2 as current_phase, CONCAT(rc.id, '-2') as task_id,
          (SELECT COUNT(*) FROM project_inspections WHERE root_card_id = rc.id AND phase = 2) as total_tests,
          (SELECT COUNT(*) FROM project_inspections WHERE root_card_id = rc.id AND phase = 2 AND status = 'Approved') as approved_tests
        FROM root_cards rc 
        WHERE rc.status IN (
          "PHASE_2_QC_PENDING", "PHASE_2_QC_APPROVED",
          "final Prodcution completed and send to quality for final qc",
          "Redy for Dispatch"
        )
      ) as combined_tasks
      ORDER BY updated_at DESC
    `;

    const [rows] = await db.query(query);
    res.json({ tasks: rows || [] });
  } catch (error) {
    console.error("Critical error in getQualityTasks:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.approveDimensionalInspection = async (req, res) => {
  const { root_card_id, current_phase, notes } = req.body;
  if (!root_card_id) return res.status(400).json({ success: false, message: 'Root Card ID is required' });

  const phase = current_phase || 1;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Resolve internal ID if public_id is provided
    const [cards] = await connection.query('SELECT id, project_name FROM root_cards WHERE id = ? OR public_id = ?', [root_card_id, root_card_id]);
    if (cards.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Root Card not found' });
    }

    const internalId = cards[0].id;
    const projectName = cards[0].project_name;

    // 2. Update Root Card status based on phase
    const newStatus = phase === 1 
      ? 'send to production for complete final produciton' 
      : 'Redy for Dispatch';
    await connection.query(
      "UPDATE root_cards SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [newStatus, internalId]
    );

    // 3. Notify Production
    const notificationTitle = phase === 1 ? 'Fabrication QC Approved' : 'Painting & Finishing QC Approved';
    const notificationMsg = phase === 1 
      ? `The first phase (Fabrication) quality check for Project ${projectName} is complete. You can now proceed to Painting and Finishing.`
      : `The Painting and Finishing quality check for Project ${projectName} is complete. The project is now fully approved and ready for dispatch.`;

    await connection.query(
      `INSERT INTO notifications (department, title, message, type, link) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        'Production',
        notificationTitle,
        notificationMsg,
        'success',
        `/department/production/updates`
      ]
    );

    await connection.commit();
    res.json({ success: true, message: `${notificationTitle} successfully.` });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error approving dimensional inspection:', error);
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  } finally {
    if (connection) connection.release();
  }
};

exports.getProjectInspections = async (req, res) => {
  const { root_card_id } = req.params;
  const { phase } = req.query;
  try {
    // Resolve internal ID if public_id is provided
    const [cards] = await db.query('SELECT id FROM root_cards WHERE id = ? OR public_id = ?', [root_card_id, root_card_id]);
    const effectiveId = cards.length > 0 ? cards[0].id : root_card_id;

    let query = 'SELECT * FROM project_inspections WHERE root_card_id = ?';
    const params = [effectiveId];
    
    if (phase) {
      query += ' AND phase = ?';
      params.push(phase);
    }
    
    query += ' ORDER BY created_at ASC';
    const [rows] = await db.query(query, params);
    res.json({ success: true, inspections: rows });
  } catch (error) {
    console.error('Error fetching project inspections:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.addProjectInspection = async (req, res) => {
  const { root_card_id, inspection_name, phase } = req.body;
  try {
    // Resolve internal ID if public_id is provided
    const [cards] = await db.query('SELECT id FROM root_cards WHERE id = ? OR public_id = ?', [root_card_id, root_card_id]);
    const effectiveId = cards.length > 0 ? cards[0].id : root_card_id;

    const [result] = await db.query(
      'INSERT INTO project_inspections (root_card_id, inspection_name, phase, status) VALUES (?, ?, ?, ?)',
      [effectiveId, inspection_name, phase || 1, 'Pending']
    );
    res.json({ success: true, id: result.insertId, message: 'Inspection added successfully' });
  } catch (error) {
    console.error('Error adding project inspection:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateProjectInspection = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const document_path = req.file ? req.file.path.split('uploads')[1] : req.body.document_path;
  
  try {
    let query = 'UPDATE project_inspections SET updated_at = CURRENT_TIMESTAMP';
    const params = [];
    if (status) {
      query += ', status = ?';
      params.push(status);
    }
    if (document_path) {
      query += ', document_path = ?';
      params.push(document_path);
    }
    query += ' WHERE id = ?';
    params.push(id);

    await db.query(query, params);
    res.json({ success: true, message: 'Inspection updated successfully', document_path });
  } catch (error) {
    console.error('Error updating project inspection:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.deleteProjectInspection = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM project_inspections WHERE id = ?', [id]);
    res.json({ success: true, message: 'Inspection deleted successfully' });
  } catch (error) {
    console.error('Error deleting project inspection:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
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
    const { rootCardId, grnNumber } = req.query;
    
    let query = `
      SELECT 
        gi.*, 
        g.grn_number, 
        g.posting_date,
        g.inspection_type,
        g.vendor_id,
        g.status as grn_status,
        po.po_number,
        v.name as vendor_name,
        poi.item_group,
        poi.material_grade as material_grade,
        gi.items_per_packet,
        gi.vendor_items_per_packet
      FROM grn_items gi
      JOIN grns g ON gi.grn_id = g.id
      JOIN purchase_orders po ON g.purchase_order_id = po.id
      JOIN vendors v ON g.vendor_id = v.id
      JOIN quotations q ON po.quotation_id = q.id
      JOIN purchase_order_items poi ON gi.po_item_id = poi.id
      WHERE (g.status IN ('qc_pending', 'qc_finalized', 'qc_completed', 'awaiting_storage', 'completed', 'approved', 'partially_released', 'material_released'))
    `;
    const queryParams = [];

    if (rootCardId) {
      // Resolve internal ID if public_id is provided
      const [cards] = await db.query('SELECT id FROM root_cards WHERE id = ? OR public_id = ?', [rootCardId, rootCardId]);
      const effectiveId = cards.length > 0 ? cards[0].id : rootCardId;
      
      query += ` AND q.root_card_id = ?`;
      queryParams.push(effectiveId);
    }

    if (grnNumber) {
      query += ` AND g.grn_number LIKE ?`;
      queryParams.push(`%${grnNumber}%`);
    }

    const [rows] = await db.query(query, queryParams);

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
      
      const needsAcceptedDoc = hasAccepted && (!itemDoc || !itemDoc.common_document_path);
      const needsRejectedDoc = hasRejected && (!itemDoc || !itemDoc.rejected_document_path);
      
      const isItemDone = allProcessed && !needsAcceptedDoc && !needsRejectedDoc;

      return {
        ...item,
        status: isItemDone ? 'QC Completed' : 'QC Pending',
        common_document_path: itemDoc ? itemDoc.common_document_path : null,
        rejected_document_path: itemDoc ? itemDoc.rejected_document_path : null,
        serials: itemSerials.map(s => ({
          serial_number: s.serial_number,
          item_code: s.item_code,
          status: s.status,
          inspection_status: s.inspection_status || 'Pending',
          document_path: s.document_path,
          rejection_reason: s.rejection_reason,
          density: s.density,
          dimensions: {
            length: s.length,
            width: s.width,
            thickness: s.thickness,
            diameter: s.diameter,
            outer_diameter: s.outer_diameter,
            height: s.height,
            web_thickness: s.web_thickness,
            flange_thickness: s.flange_thickness,
            side1: s.side1,
            side2: s.side2,
            side_s: s.side_s,
            side_s1: s.side_s1,
            side_s2: s.side_s2
          }
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

        // Check if all items have required documents
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

        await db.query('UPDATE grns SET status = "qc_finalized" WHERE id = ?', [id]);
        res.json({ message: 'QC finalized successfully and ready for report creation' });
    } catch (error) {
        console.error('Error finalizing QC:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.createFinalQCReport = async (req, res) => {
    const { grn_id, grn_number, project_name, vendor_name, inspection_type, received_date, materials } = req.body;
    
    // Ensure column exists
    try {
        await db.query("ALTER TABLE quality_final_report_items ADD COLUMN material_grade VARCHAR(100) DEFAULT NULL AFTER item_group");
    } catch (err) {
        // Safe to ignore if column exists
    }

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
                     (report_id, material_name, item_code, item_group, material_grade, material_id, received_qty, unit, accepted_qty, rejected_qty, accepted_report, rejected_report, length, width, thickness, diameter, outer_diameter, height, density, web_thickness, flange_thickness, side1, side2, side_s, side_s1, side_s2) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        reportId, 
                        item.material_name, 
                        item.item_code,
                        item.item_group,
                        item.material_grade || null,
                        item.material_id, 
                        item.received_qty, 
                        item.unit, 
                        item.accepted_qty, 
                        item.rejected_qty, 
                        item.accepted_report, 
                        item.rejected_report,
                        item.length || null,
                        item.width || null,
                        item.thickness || null,
                        item.diameter || null,
                        item.outer_diameter || null,
                        item.height || null,
                        item.density || 0,
                        item.web_thickness || item.tw || null,
                        item.flange_thickness || item.tf || null,
                        item.side1 || item.s1 || null,
                        item.side2 || item.s2 || null,
                        item.side_s || item.s || null,
                        item.side_s1 || item.s1 || null,
                        item.side_s2 || item.s2 || null
                    ]
                );

                const reportItemId = itemResult.insertId;

                // 3. Save ST number status snapshots
                if (item.st_numbers && item.st_numbers.length > 0) {
                    for (const st of item.st_numbers) {
                        await connection.query(
                            `INSERT INTO quality_final_report_st_numbers (report_item_id, st_code, item_code, status, length, width, thickness, diameter, outer_diameter, height, density, web_thickness, flange_thickness, side1, side2, side_s, side_s1, side_s2) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                reportItemId, 
                                st.st_code, 
                                st.item_code || st.st_code.replace('ST-', ''), 
                                st.status,
                                st.length || null,
                                st.width || null,
                                st.thickness || null,
                                st.diameter || null,
                                st.outer_diameter || null,
                                st.height || null,
                                st.density || 0,
                                st.web_thickness || st.tw || null,
                                st.flange_thickness || st.tf || null,
                                st.side1 || st.s1 || null,
                                st.side2 || st.s2 || null,
                                st.side_s || st.s || null,
                                st.side_s1 || st.s1 || null,
                                st.side_s2 || st.s2 || null
                            ]
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
        // Ensure column exists
        try {
            await db.query("ALTER TABLE quality_final_report_items ADD COLUMN material_grade VARCHAR(100) DEFAULT NULL AFTER item_group");
        } catch (err) {
            // Safe to ignore if column exists
        }

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

        // Self-heal material_id references for historical reports
        try {
            await db.query(`
                UPDATE quality_final_report_items qfri
                JOIN quality_final_reports qfr ON qfri.report_id = qfr.id
                JOIN grns g ON qfr.grn_id = g.id
                JOIN grn_items gi ON gi.grn_id = g.id AND gi.item_code = qfri.item_code
                SET qfri.material_id = gi.po_item_id
                WHERE qfri.material_id IS NULL
            `);
        } catch (err) {
            console.log("Self-heal error for report items:", err.message);
        }

        const [rows] = await db.query(`${query} ORDER BY created_at DESC`, queryParams);
        
        // Fetch items for each report
        const reports = [];
        for (const report of rows) {
            const [items] = await db.query(
                `SELECT qfri.id, qfri.material_name, qfri.item_code, qfri.item_group, 
                        COALESCE(qfri.material_grade, poi.material_grade) as material_grade, 
                        qfri.received_qty, qfri.unit, qfri.accepted_qty, qfri.rejected_qty, 
                        qfri.accepted_report, qfri.rejected_report, qfri.length, qfri.width, 
                        qfri.thickness, qfri.diameter, qfri.outer_diameter, qfri.height, 
                        qfri.density, qfri.web_thickness, qfri.flange_thickness, qfri.side1, 
                        qfri.side2, qfri.side_s, qfri.side_s1, qfri.side_s2 
                 FROM quality_final_report_items qfri
                 LEFT JOIN purchase_order_items poi ON qfri.material_id = poi.id
                 WHERE qfri.report_id = ?`,
                [report.id]
            );

            // Fetch ST numbers for each item
            for (const item of items) {
                const [stNumbers] = await db.query(
                    'SELECT st_code, item_code, status, length, width, thickness, diameter, outer_diameter, height, density, item_group, web_thickness, flange_thickness, side1, side2, side_s, side_s1, side_s2 FROM quality_final_report_st_numbers WHERE report_item_id = ?',
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
            SELECT s.*, gi.material_name as itemName, gi.po_item_id, gi.item_group,
                   gi.length as itemLength, gi.width as itemWidth, gi.thickness as itemThickness,
                   gi.diameter as itemDiameter, gi.outer_diameter as itemOuterDiameter, gi.height as itemHeight,
                   gi.web_thickness as itemWebThickness, gi.flange_thickness as itemFlangeThickness,
                   gi.side1 as itemSide1, gi.side2 as itemSide2, gi.side_s as itemSideS,
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
                    item_group: row.item_group,
                    acceptedDoc: row.acceptedDoc,
                    rejectedDoc: row.rejectedDoc,
                    itemDimensions: {
                        length: row.itemLength,
                        width: row.itemWidth,
                        thickness: row.itemThickness,
                        diameter: row.itemDiameter,
                        outer_diameter: row.itemOuterDiameter,
                        height: row.itemHeight,
                        web_thickness: row.itemWebThickness,
                        flange_thickness: row.itemFlangeThickness,
                        side1: row.itemSide1,
                        side2: row.itemSide2,
                        side_s: row.itemSideS
                    },
                    serials: []
                };
            }
            acc[row.itemName].serials.push({
                serial_number: row.serial_number,
                item_code: row.item_code,
                item_group: row.item_group,
                status: row.status,
                inspection_status: row.inspection_status || 'Pending',
                dimensions: {
                    length: row.length,
                    width: row.width,
                    thickness: row.thickness,
                    diameter: row.diameter,
                    outer_diameter: row.outer_diameter,
                    height: row.height,
                    web_thickness: row.web_thickness,
                    flange_thickness: row.flange_thickness,
                    side1: row.side1,
                    side2: row.side2,
                    side_s: row.side_s,
                    side_s1: row.side_s1,
                    side_s2: row.side_s2
                }
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
                const doc = itemDocs.find(d => Number(d.po_item_id) === Number(itemId));
                
                if (hasAccepted && !doc?.common_document_path) { allDocsPresent = false; break; }
                if (hasRejected && !doc?.rejected_document_path) { allDocsPresent = false; break; }
            }
            
            if (allDocsPresent) {
                await connection.query('UPDATE grns SET status = "qc_completed" WHERE id = ?', [grn_id]);
            } else {
                await connection.query('UPDATE grns SET status = "qc_pending" WHERE id = ?', [grn_id]);
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
    let { grn_id, po_item_id, inspection_type, results, remarks, common_document_path, rejected_document_path } = req.body;
    
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
             inspection_type = VALUES(inspection_type),
             status = 'Completed'`,
            [gid, pid, inspection_type || 'Outsource', 'Completed', remarks || null, common_document_path || null, rejected_document_path || null]
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
            } else {
                await connection.query('UPDATE grns SET status = "qc_pending" WHERE id = ?', [gid]);
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
