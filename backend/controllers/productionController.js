const db = require('../config/db');

// Operations CRUD
exports.getRootCards = async (req, res) => {
  const { assignedOnly } = req.query;
  try {
    // Basic query to fetch root cards that are ready for production
    // Filtering by status 'Released' or 'Production' (depending on current project's status flow)
    let query = `
      SELECT rc.*, 
             q.product_name, q.quantity
      FROM root_cards rc
      LEFT JOIN quotations q ON rc.id = q.root_card_id
      WHERE rc.status IN ('Released', 'Production', 'Partially Completed')
    `;

    if (assignedOnly === 'true') {
      // Logic for "assignedOnly" - e.g., root cards that have approved designs
      // Assuming design_status column or similar
    }

    const [rows] = await db.query(query);
    res.json({ success: true, rootCards: rows });
  } catch (error) {
    console.error('Error fetching root cards:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getOperations = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM operations ORDER BY name ASC');
    res.json({ success: true, operations: rows });
  } catch (error) {
    console.error('Error fetching operations:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.createOperation = async (req, res) => {
  const { name, type, description } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

  try {
    const [result] = await db.query(
      'INSERT INTO operations (name, type, description) VALUES (?, ?, ?)',
      [name, type || 'In-house', description || '']
    );
    res.json({ success: true, id: result.insertId, message: 'Operation created successfully' });
  } catch (error) {
    console.error('Error creating operation:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.deleteOperation = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM operations WHERE id = ?', [id]);
    res.json({ success: true, message: 'Operation deleted successfully' });
  } catch (error) {
    console.error('Error deleting operation:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Daily Planning & Assignments
exports.getDailyPlans = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, 
        IFNULL((SELECT GROUP_CONCAT(DISTINCT r.project_name SEPARATOR ', ') 
         FROM daily_operator_assignments a 
         JOIN root_cards r ON a.root_card_id = r.id 
         WHERE a.plan_id = p.id), '') as project_names,
        IFNULL((SELECT GROUP_CONCAT(DISTINCT a.operation_name SEPARATOR ', ') 
         FROM daily_operator_assignments a 
         WHERE a.plan_id = p.id), '') as operation_names,
        IFNULL((SELECT GROUP_CONCAT(DISTINCT a.root_card_id SEPARATOR ', ') 
         FROM daily_operator_assignments a 
         WHERE a.plan_id = p.id), '') as root_card_ids,
        (SELECT COUNT(DISTINCT root_card_id) FROM daily_operator_assignments WHERE plan_id = p.id) as projects_count,
        (SELECT COUNT(DISTINCT operator_id) FROM daily_operator_assignments WHERE plan_id = p.id) as operators_count,
        (SELECT IFNULL(SUM(total_hours), 0) FROM daily_operator_assignments WHERE plan_id = p.id) as total_workload,
        (SELECT IFNULL(SUM(scrap_weight), 0) FROM material_cutting_report_items WHERE mcr_id = m.id) as total_scrap_weight,
        m.id as mcr_id
      FROM daily_production_plans p
      LEFT JOIN material_cutting_reports m ON p.id = m.plan_id
      ORDER BY p.plan_date DESC
    `);
    res.json({ success: true, plans: rows });
  } catch (error) {
    console.error('Error fetching daily plans:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.createDailyPlan = async (req, res) => {
  const { plan_date, remarks, assignments } = req.body;
  if (!plan_date) return res.status(400).json({ success: false, message: 'Plan date is required' });

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Insert Daily Plan Header
    const [planResult] = await connection.query(
      'INSERT INTO daily_production_plans (plan_date, remarks, status) VALUES (?, ?, ?)',
      [plan_date, remarks || 'Daily plan created from dashboard', 'Draft']
    );

    const planId = planResult.insertId;

    // 2. Insert Assignments if provided
    if (assignments && assignments.length > 0) {
      const assignmentValues = assignments.map(a => [
        planId, a.root_card_id, a.operation_id, a.operation_name, a.operator_name, a.operator_id,
        a.start_time, a.end_time, a.break_time || 0, a.total_hours, a.remarks || ''
      ]);

      await connection.query(
        `INSERT INTO daily_operator_assignments 
        (plan_id, root_card_id, operation_id, operation_name, operator_name, operator_id, start_time, end_time, break_time, total_hours, remarks) 
        VALUES ?`,
        [assignmentValues]
      );
    }

    await connection.commit();
    res.json({ success: true, id: planId, message: 'Daily plan and assignments created successfully' });
  } catch (error) {
    if (connection) await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'A plan for this date already exists' });
    }
    console.error('Error creating daily plan:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  } finally {
    if (connection) connection.release();
  }
};

exports.getDailyPlanDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const [plan] = await db.query('SELECT * FROM daily_production_plans WHERE id = ?', [id]);
    if (plan.length === 0) return res.status(404).json({ success: false, message: 'Plan not found' });

    const [assignments] = await db.query(`
      SELECT a.*, r.project_name, r.id as root_card_ref
      FROM daily_operator_assignments a
      LEFT JOIN root_cards r ON a.root_card_id = r.id
      WHERE a.plan_id = ?
    `, [id]);

    res.json({ success: true, plan: plan[0], assignments });
  } catch (error) {
    console.error('Error fetching plan details:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateDailyPlan = async (req, res) => {
  const { id } = req.params;
  const { plan_date, remarks, assignments } = req.body;
  if (!plan_date) return res.status(400).json({ success: false, message: 'Plan date is required' });

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Update Daily Plan Header
    await connection.query(
      'UPDATE daily_production_plans SET plan_date = ?, remarks = ? WHERE id = ?',
      [plan_date, remarks || 'Daily plan updated from dashboard', id]
    );

    // 2. Delete existing assignments
    await connection.query('DELETE FROM daily_operator_assignments WHERE plan_id = ?', [id]);

    // 3. Insert New Assignments
    if (assignments && assignments.length > 0) {
      const assignmentValues = assignments.map(a => [
        id, a.root_card_id, a.operation_id, a.operation_name, a.operator_name, a.operator_id,
        a.start_time, a.end_time, a.break_time || 0, a.total_hours, a.remarks || ''
      ]);

      await connection.query(
        `INSERT INTO daily_operator_assignments 
        (plan_id, root_card_id, operation_id, operation_name, operator_name, operator_id, start_time, end_time, break_time, total_hours, remarks) 
        VALUES ?`,
        [assignmentValues]
      );
    }

    await connection.commit();
    res.json({ success: true, message: 'Daily plan and assignments updated successfully' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error updating daily plan:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  } finally {
    if (connection) connection.release();
  }
};

exports.deleteDailyPlan = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM daily_production_plans WHERE id = ?', [id]);
    res.json({ success: true, message: 'Daily plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting daily plan:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.addAssignment = async (req, res) => {
  const { plan_id, root_card_id, operation_id, operation_name, operator_name, operator_id, start_time, end_time, break_time, total_hours, remarks } = req.body;

  try {
    const [result] = await db.query(
      `INSERT INTO daily_operator_assignments 
      (plan_id, root_card_id, operation_id, operation_name, operator_name, operator_id, start_time, end_time, break_time, total_hours, remarks) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [plan_id, root_card_id, operation_id, operation_name, operator_name, operator_id, start_time, end_time, break_time || 0, total_hours, remarks || '']
    );
    res.json({ success: true, id: result.insertId, message: 'Assignment added successfully' });
  } catch (error) {
    console.error('Error adding assignment:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Production Updates
exports.getProductionUpdates = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.*, r.project_name
      FROM daily_production_updates u
      LEFT JOIN root_cards r ON u.root_card_id = r.id
      ORDER BY u.work_date DESC, u.created_at DESC
    `);

    if (rows.length === 0) {
      return res.json({ success: true, updates: [] });
    }

    const rootCardIds = [...new Set(rows.map(row => row.root_card_id?.toLowerCase()).filter(id => id))];
    console.log('ProductionUpdates - RootCardIds (Normalized):', rootCardIds);
    
    if (rootCardIds.length > 0) {
      // Fetch all operations ever assigned or updated for these root cards
      const [allOps] = await db.query(`
        SELECT DISTINCT operation_name, LOWER(root_card_id) as root_card_id
        FROM (
          SELECT operation_name, root_card_id FROM daily_operator_assignments
          UNION
          SELECT operation_name, root_card_id FROM daily_production_updates
        ) combined
        WHERE LOWER(root_card_id) IN (?)
      `, [rootCardIds]);
      console.log('ProductionUpdates - Total Unique Operations Discovered:', allOps.length);

      const [allUpdates] = await db.query(`
        SELECT LOWER(root_card_id) as root_card_id, operation_name, status
        FROM daily_production_updates
        WHERE LOWER(root_card_id) IN (?)
        ORDER BY id ASC
      `, [rootCardIds]);

      const projectProgress = {};
      rootCardIds.forEach(id => {
        const ops = allOps.filter(op => op.root_card_id === id);
        projectProgress[id] = ops.map(op => {
          const updates = allUpdates.filter(u => u.root_card_id === id && u.operation_name === op.operation_name);
          const latestUpdate = updates[updates.length - 1];
          return {
            name: op.operation_name,
            status: latestUpdate ? latestUpdate.status : 'Planned'
          };
        });
      });

      const updatesWithProgress = rows.map(row => ({
        ...row,
        project_operations: projectProgress[row.root_card_id?.toLowerCase()] || []
      }));

      return res.json({ success: true, updates: updatesWithProgress });
    }

    res.json({ success: true, updates: rows });
  } catch (error) {
    console.error('Error fetching production updates:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.createProductionUpdate = async (req, res) => {
  const {
    work_date, plan_id, assignment_id, root_card_id, operation_id, operation_name,
    operator_name, operator_id, actual_start, actual_end, break_time, actual_hours,
    qty_completed, status, remarks
  } = req.body;

  try {
    const [result] = await db.query(
      `INSERT INTO daily_production_updates 
      (work_date, plan_id, assignment_id, root_card_id, operation_id, operation_name, 
       operator_name, operator_id, actual_start, actual_end, break_time, actual_hours, 
       qty_completed, status, remarks) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [work_date, plan_id, assignment_id, root_card_id, operation_id, operation_name,
        operator_name, operator_id, actual_start, actual_end, break_time || 0, actual_hours,
        qty_completed, status, remarks || '']
    );
    res.json({ success: true, id: result.insertId, message: 'Production update recorded' });
  } catch (error) {
    console.error('Error creating production update:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.sendToQC = async (req, res) => {
  const { update_id } = req.body;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get the update details
    const [updates] = await connection.query(
      `SELECT u.*, r.project_name
       FROM daily_production_updates u
       LEFT JOIN root_cards r ON u.root_card_id = r.id
       WHERE u.id = ?`,
      [update_id]
    );

    if (updates.length === 0) {
      throw new Error('Update record not found');
    }

    const update = updates[0];

    // 2. Update the production update status
    await connection.query(
      "UPDATE daily_production_updates SET status = 'Completed' WHERE id = ?",
      [update_id]
    );

    // 3. Create a notification for the Quality department
    await connection.query(
      `INSERT INTO notifications (department, title, message, type, link) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        'Quality',
        'Production QC Required',
        `Operation '${update.operation_name}' for Project ${update.project_name || update.root_card_id} completed by ${update.operator_name}. Qty: ${update.qty_completed}.`,
        'warning',
        `/department/quality/incoming?production_update_id=${update_id}`
      ]
    );

    await connection.commit();
    res.json({ success: true, message: 'Sent to Quality Control successfully' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error sending to QC:', error);
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  } finally {
    if (connection) connection.release();
  }
};

exports.getReleasedMaterialsForMCR = async (req, res) => {
  const { project_names } = req.query;
  // Trim spaces after split to avoid mismatch with " Project B"
  const names = project_names ? project_names.split(',').map(n => n.trim()) : [];
  console.log('Fetching materials for MCR. Projects:', names);

  try {
    if (names.length === 0) return res.json({ success: true, movements: [] });

    // 1. Get Stock Entries of type 'Material Issue' for these project names
    const [entries] = await db.query(`
      SELECT se.* 
      FROM stock_entries se 
      WHERE se.entry_type = 'Material Issue' 
      AND se.project_name IN (?)
      ORDER BY se.created_at DESC
    `, [names]);

    console.log(`Found ${entries.length} stock entries`);

    const entriesWithItems = [];
    for (let entry of entries) {
      console.log(`Processing entry: ${entry.entry_no} (ID: ${entry.id}) for project: ${entry.project_name}`);
      // Join with bom_materials to get item_group
      const [items] = await db.query(`
        SELECT sei.*, bm.item_group, bm.material_grade
        FROM stock_entry_items sei
        LEFT JOIN boms b ON b.root_card_id = (SELECT id FROM root_cards WHERE project_name = ? LIMIT 1)
        LEFT JOIN bom_materials bm ON bm.bom_id = b.id AND bm.item_name = sei.item_name
        WHERE sei.stock_entry_id = ?
      `, [entry.project_name, entry.id]);

      console.log(`Found ${items.length} items in entry ${entry.entry_no}`);

      const itemsWithSerials = [];
      for (let item of items) {
        // Fetch serials that are NOT fully used.
        // Match by item_name as primary unique identifier because codes can be generic (GEN-SIZE)
        const [serialRows] = await db.query(
          "SELECT serial_number, status, inspection_status, length, width, thickness, diameter, outer_diameter, height, unit_weight, total_weight, density, web_thickness, flange_thickness, side1, side2, side_s, side_s1, side_s2 FROM inventory_serials WHERE issued_in_entry_id = ? AND item_name = ? AND (status IS NULL OR status != 'Consumed') AND (total_weight > 0.001 OR total_weight IS NULL)",
          [entry.id, item.item_name]
        );

        console.log(`Item ${item.item_name} (Code: ${item.item_code}): Found ${serialRows.length} serials with issued_in_entry_id = ${entry.id} matching name exactly`);

        // Only add item if it has serials
        if (serialRows.length > 0) {
          itemsWithSerials.push({ ...item, serials: serialRows });
        }
      }

      if (itemsWithSerials.length > 0) {
        entriesWithItems.push({ ...entry, items: itemsWithSerials });
      }
    }

    res.json({ success: true, movements: entriesWithItems });
  } catch (error) {
    console.error('Error fetching materials for MCR:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.saveMCR = async (req, res) => {
  const { plan_id, work_date, pieces, calculations } = req.body;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Ensure work_date is in YYYY-MM-DD format for MySQL
    const formattedDate = work_date ? work_date.split('T')[0] : new Date().toISOString().split('T')[0];

    // 1. Check if MCR already exists for this plan
    const [existingMcr] = await connection.query(
      'SELECT id FROM material_cutting_reports WHERE plan_id = ?',
      [plan_id]
    );

    let mcrId;
    if (existingMcr.length > 0) {
      mcrId = existingMcr[0].id;
      // Update date and clean slate for items
      await connection.query('UPDATE material_cutting_reports SET work_date = ? WHERE id = ?', [formattedDate, mcrId]);
      await connection.query('DELETE FROM material_cutting_report_items WHERE mcr_id = ?', [mcrId]);
    } else {
      const [mcrResult] = await connection.query(
        'INSERT INTO material_cutting_reports (plan_id, work_date) VALUES (?, ?)',
        [plan_id, formattedDate]
      );
      mcrId = mcrResult.insertId;
    }

    for (const piece of pieces) {
      // Find calculation details for this piece
      const calc = calculations?.find(c => c.temp_id === piece.temp_id) ||
        calculations?.find(c => c.serial_number === piece.serial_number) ||
        calculations?.find(c => c.item_code === piece.item_code);

      // ONLY update inventory if it's a NEW cutting entry
      if (piece.is_new) {
        const markAsUsed = piece.is_finished || piece.return_to_stock;
        const newStatus = markAsUsed ? 'Consumed' : 'Used';

        // Update Original Serial (Reduce dimensions to remnant or mark consumed)
        await connection.query(
          `UPDATE inventory_serials SET status = ?, inspection_status = "C", 
           length = ?, width = ?, thickness = ?, diameter = ?, outer_diameter = ?, height = ?,
           web_thickness = ?, flange_thickness = ?, side1 = ?, side2 = ?, side_s = ?, side_s1 = ?, side_s2 = ?,
           unit_weight = ?, total_weight = ? WHERE serial_number = ?`,
          [
            newStatus, 
            piece.new_dims.l, piece.new_dims.w, piece.new_dims.t, 
            piece.new_dims.diameter || null, piece.new_dims.outer_diameter || null, piece.new_dims.height || null,
            piece.new_dims.web_thickness || null, piece.new_dims.flange_thickness || null, 
            piece.new_dims.side1 || null, piece.new_dims.side2 || null, piece.new_dims.side_s || null, 
            piece.new_dims.side_s1 || null, piece.new_dims.side_s2 || null,
            piece.new_weight, piece.new_weight, piece.serial_number
          ]
        );

        // Handle "Add to Inventory" (Return to Stock)
        if (piece.return_to_stock && piece.return_dims) {
          try {
            const { l, w, t } = piece.return_dims;
            
            // 1. Generate New ST Number (Suffix original with -R and timestamp)
            const baseSerial = piece.serial_number.split(' (')[0];
            const timestamp = Date.now().toString().slice(-4);
            const newSerial = `${baseSerial}-R${timestamp}`;

            // 2. Fetch original serial info to clone properties (PO ID, Item ID, etc.)
            const [originalSerial] = await connection.query(
              'SELECT * FROM inventory_serials WHERE serial_number = ?',
              [piece.serial_number]
            );

            if (originalSerial.length > 0) {
              const os = originalSerial[0];
              const density = parseFloat(os.density) || 7.85;
              const group = (piece.item_group || "").toUpperCase();
              
              // 3. Calculate Remnant Weight based on return dimensions
              let returnWeight = 0;
              const fL = parseFloat(l) || 0;
              const fW = parseFloat(w) || 0;
              const fT = parseFloat(t) || 0;

              if (group.includes("PLATE") || group.includes("SHEET") || group.includes("BLOCK")) {
                returnWeight = (fL * fW * fT * density) / 1000000;
              } else if (group.includes("ROUND") || group.includes("BAR")) {
                const dia = parseFloat(os.diameter) || 0;
                returnWeight = (Math.PI * Math.pow(dia / 2, 2) * fL * density) / 1000000;
              } else if (group.includes("PIPE") || group.includes("TUBE")) {
                const od = parseFloat(os.outer_diameter) || 0;
                const thk = parseFloat(os.thickness) || 0;
                const innerRadius = (od / 2) - thk;
                const area = Math.PI * (Math.pow(od / 2, 2) - Math.pow(innerRadius, 2));
                returnWeight = (area * fL * density) / 1000000;
              } else {
                returnWeight = (fL * fW * fT * density) / 1000000;
              }

              // 4. Generate New Item Name based on dimensions
              let newItemName = piece.item_name;
              if (group.includes("PLATE") || group.includes("SHEET")) {
                newItemName = `${fL}x${fW}x${fT} mm Plate (OFF-CUT)`;
              } else if (group.includes("ROUND") || group.includes("BAR")) {
                newItemName = `Dia ${fW} x ${fL} mm Round Bar (OFF-CUT)`;
              } else if (group.includes("PIPE") || group.includes("TUBE")) {
                newItemName = `Ø${fW} x ${fT} x ${fL} mm Pipe (OFF-CUT)`;
              }

              // 5. Insert New Serial into inventory
              await connection.query(
                `INSERT INTO inventory_serials 
                (serial_number, purchase_order_id, item_id, item_name, item_code, grn_id, status, location, 
                 length, width, thickness, diameter, outer_diameter, height,
                 web_thickness, flange_thickness, side1, side2, side_s, side_s1, side_s2,
                 unit_weight, total_weight, density, 
                 issued_in_entry_id, material_grade, inspection_status) 
                VALUES (?, ?, ?, ?, ?, ?, 'Available', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'C')`,
                [
                  newSerial, os.purchase_order_id, os.item_id, newItemName, os.item_code, os.grn_id,
                  os.location || 'Workshop', fL, fW, fT, 
                  piece.return_dims.diameter || os.diameter, 
                  piece.return_dims.outer_diameter || os.outer_diameter, 
                  piece.return_dims.height || os.height,
                  piece.return_dims.web_thickness || os.web_thickness,
                  piece.return_dims.flange_thickness || os.flange_thickness,
                  piece.return_dims.side1 || os.side1,
                  piece.return_dims.side2 || os.side2,
                  piece.return_dims.side_s || os.side_s,
                  piece.return_dims.side_s1 || os.side_s1,
                  piece.return_dims.side_s2 || os.side_s2,
                  returnWeight, returnWeight, density, os.issued_in_entry_id, os.material_grade
                ]
              );

              // 6. Record in Stock Ledger
              const [lastBalance] = await connection.query(
                'SELECT balance_qty FROM stock_ledger WHERE item_code = ? ORDER BY id DESC LIMIT 1',
                [os.item_code]
              );
              const currentBalance = (lastBalance[0]?.balance_qty || 0);
              const newBalance = parseFloat(currentBalance) + 1;

              // Fetch project name from stock_entry if issued_in_entry_id exists
              let projectName = null;
              if (os.issued_in_entry_id) {
                const [se] = await connection.query('SELECT project_name FROM stock_entries WHERE id = ?', [os.issued_in_entry_id]);
                if (se.length > 0) projectName = se[0].project_name;
              }

              await connection.query(
                `INSERT INTO stock_ledger (
                  item_code, material_name, posting_date, posting_time, voucher_type, voucher_no, 
                  actual_qty, uom, balance_qty, remarks, length, width, thickness, 
                  unit_weight, total_weight, density, project_name
                ) VALUES (?, ?, ?, CURTIME(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  os.item_code, newItemName, formattedDate, 'MCR Return', mcrId, 
                  1, 'NOS', newBalance, `Off-cut return from ${piece.serial_number}`,
                  fL, fW, fT, returnWeight, returnWeight, density, projectName
                ]
              );
            }
          } catch (err) {
            console.error('Error adding remnant to inventory:', err);
            throw err; // Re-throw to trigger rollback if something fails
          }
        }
      }

      // ALWAYS insert items back into the report table for visual tracking
      await connection.query(
        `INSERT INTO material_cutting_report_items 
        (mcr_id, serial_number, item_code, item_name, item_group, material_grade, design, produced_qty, cutting_axis, 
         raw_l, raw_w, raw_t, raw_diameter, raw_outer_diameter, raw_height, 
         raw_web_thickness, raw_flange_thickness, raw_side1, raw_side2, raw_side_s, raw_side_s1, raw_side_s2,
         new_l, new_w, new_t, new_diameter, new_outer_diameter, new_height,
         new_web_thickness, new_flange_thickness, new_side1, new_side2, new_side_s, new_side_s1, new_side_s2,
         weight_consumed, unit_weight_consumed, scrap_weight, is_finished, 
         return_to_stock, return_l, return_w, return_t, return_diameter, return_outer_diameter, return_height,
         return_web_thickness, return_flange_thickness, return_side1, return_side2, return_side_s, return_side_s1, return_side_s2,
         remarks) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mcrId, piece.serial_number, piece.item_code, piece.item_name, piece.item_group, piece.material_grade, piece.design || 'Rectangular',
          piece.produced_qty, piece.cutting_axis || 'L',
          piece.raw_dims.l, piece.raw_dims.w, piece.raw_dims.t, 
          piece.raw_dims.diameter || null, piece.raw_dims.outer_diameter || null, piece.raw_dims.height || null,
          piece.raw_dims.web_thickness || null, piece.raw_dims.flange_thickness || null, piece.raw_dims.side1 || null, piece.raw_dims.side2 || null, piece.raw_dims.side_s || null, piece.raw_dims.side_s1 || null, piece.raw_dims.side_s2 || null,
          piece.new_dims.l, piece.new_dims.w, piece.new_dims.t,
          piece.new_dims.diameter || null, piece.new_dims.outer_diameter || null, piece.new_dims.height || null,
          piece.new_dims.web_thickness || null, piece.new_dims.flange_thickness || null, piece.new_dims.side1 || null, piece.new_dims.side2 || null, piece.new_dims.side_s || null, piece.new_dims.side_s1 || null, piece.new_dims.side_s2 || null,
          calc ? calc.currentWeight : 0,
          piece.unit_weight || 0,
          calc ? calc.scrapWeight : 0,
          piece.is_finished ? 1 : 0,
          piece.return_to_stock ? 1 : 0,
          piece.return_dims?.l || 0,
          piece.return_dims?.w || 0,
          piece.return_dims?.t || 0,
          piece.return_dims?.diameter || 0,
          piece.return_dims?.outer_diameter || 0,
          piece.return_dims?.height || 0,
          piece.return_dims?.web_thickness || 0,
          piece.return_dims?.flange_thickness || 0,
          piece.return_dims?.side1 || 0,
          piece.return_dims?.side2 || 0,
          piece.return_dims?.side_s || 0,
          piece.return_dims?.side_s1 || 0,
          piece.return_dims?.side_s2 || 0,
          piece.remarks || ''
        ]
      );

      // 3. Fetch assignment details for daily production update
      // ONLY add production performance update if it's a NEW entry
      if (piece.is_new) {
        const [assignments] = await connection.query(
          'SELECT * FROM daily_operator_assignments WHERE plan_id = ? AND (operation_name LIKE "%CUTTING%" OR operation_name LIKE "%Cutting%") LIMIT 1',
          [plan_id]
        );

        if (assignments.length > 0) {
          const a = assignments[0];

          await connection.query(
            `INSERT INTO daily_production_updates 
            (work_date, plan_id, assignment_id, root_card_id, operation_id, operation_name, 
            operator_name, operator_id, actual_start, actual_end, break_time, actual_hours, 
            qty_completed, status, remarks) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, SUBTIME(CURTIME(), "00:15:00"), CURTIME(), 0, 0.25, ?, "Completed", ?)`,
            [
              formattedDate, plan_id, a.id, a.root_card_id, a.operation_id, a.operation_name,
              a.operator_name, a.operator_id,
              piece.produced_qty,
              piece.remarks || `MCR entry for ${piece.serial_number}. Scrap: ${calc?.scrap_percent || 0}%`
            ]
          );
        }
      }
    }

    await connection.commit();
    res.json({ success: true, message: 'MCR saved successfully' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error saving MCR:', error);
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.getMCRDetails = async (req, res) => {
  const { plan_id } = req.params;
  try {
    const [mcr] = await db.query('SELECT * FROM material_cutting_reports WHERE plan_id = ?', [plan_id]);
    if (mcr.length === 0) return res.json({ success: false, message: 'MCR not found' });

    const [items] = await db.query('SELECT *, weight_consumed as total_weight_consumed FROM material_cutting_report_items WHERE mcr_id = ?', [mcr[0].id]);

    res.json({
      success: true,
      mcr: mcr[0],
      items: items.map(item => {
        const fL = Number(item.raw_l);
        const fW = Number(item.raw_w);
        const fT = Number(item.raw_t);
        const dims = item.design === 'Circular' ? `Ø${fL}x${fT}` : `${fL}x${fW}x${fT}`;

        return {
          ...item,
          weight: item.weight_consumed,
          unit_weight_consumed: item.unit_weight_consumed || (item.weight_consumed / (item.produced_qty || 1)),
          full_data: {
            selectedSerial: item.serial_number,
            design: item.design,
            produced_qty: item.produced_qty,
            cutting_axis: item.cutting_axis,
            raw_l: item.raw_l,
            raw_w: item.raw_w,
            raw_thk: item.raw_t,
            raw_dims: { 
              l: item.raw_l, w: item.raw_w, t: item.raw_t,
              diameter: item.raw_diameter, outer_diameter: item.raw_outer_diameter, height: item.raw_height,
              web_thickness: item.raw_web_thickness, flange_thickness: item.raw_flange_thickness,
              side1: item.raw_side1, side2: item.raw_side2, side_s: item.raw_side_s,
              side_s1: item.raw_side_s1, side_s2: item.raw_side_s2
            },
            new_dims: { 
              l: item.new_l, w: item.new_w, t: item.new_t,
              diameter: item.new_diameter, outer_diameter: item.new_outer_diameter, height: item.new_height,
              web_thickness: item.new_web_thickness, flange_thickness: item.new_flange_thickness,
              side1: item.new_side1, side2: item.new_side2, side_s: item.new_side_s,
              side_s1: item.new_side_s1, side_s2: item.new_side_s2
            },
            return_dims: {
              l: item.return_l, w: item.return_w, t: item.return_t,
              diameter: item.return_diameter, outer_diameter: item.return_outer_diameter, height: item.return_height,
              web_thickness: item.return_web_thickness, flange_thickness: item.return_flange_thickness,
              side1: item.return_side1, side2: item.return_side2, side_s: item.return_side_s,
              side_s1: item.return_side_s1, side_s2: item.return_side_s2
            },
            is_finished: !!item.is_finished
          }
        };
      })
    });
  } catch (error) {
    console.error('Error fetching MCR details:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getLaborEmployeesSummary = async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id, 
        u.full_name as name,
        (SELECT COUNT(DISTINCT root_card_id) FROM daily_operator_assignments WHERE operator_id = u.id) as total_projects,
        (SELECT ROUND(IFNULL(SUM(total_hours), 0), 2) FROM daily_operator_assignments WHERE operator_id = u.id) as total_hours,
        CASE 
          WHEN u.role = 'admin' THEN 'Admin'
          ELSE 'Active'
        END as status
      FROM users u
      WHERE 
        LOWER(u.role) IN ('employee', 'worker')
        OR u.id IN (SELECT DISTINCT operator_id FROM daily_operator_assignments WHERE total_hours > 0)
      GROUP BY u.id
      ORDER BY total_hours DESC, name ASC
    `;
    const [rows] = await db.query(query);
    res.json({ success: true, employees: rows });
  } catch (error) {
    console.error('Error fetching labor summary:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getEmployeeLaborLogs = async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT 
        a.id,
        p.plan_date as work_date,
        a.root_card_id,
        rc.project_name,
        a.operation_name,
        a.start_time,
        a.end_time,
        a.total_hours as actual_hours
      FROM daily_operator_assignments a
      JOIN daily_production_plans p ON a.plan_id = p.id
      LEFT JOIN root_cards rc ON a.root_card_id = rc.id
      WHERE a.operator_id = ?
      ORDER BY p.plan_date DESC, a.start_time DESC
    `;
    const [rows] = await db.query(query, [id]);
    res.json({ success: true, logs: rows });
  } catch (error) {
    console.error('Error fetching employee labor logs:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
