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
        (SELECT IFNULL(SUM(total_hours), 0) FROM daily_operator_assignments WHERE plan_id = p.id) as total_workload
      FROM daily_production_plans p
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

exports.getProductionUpdates = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.*, r.project_name
      FROM daily_production_updates u
      LEFT JOIN root_cards r ON u.root_card_id = r.id
      ORDER BY u.work_date DESC, u.created_at DESC
    `);
    res.json({ success: true, updates: rows });
  } catch (error) {
    console.error('Error fetching production updates:', error);
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
  const names = project_names ? project_names.split(',') : [];
  
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

    const entriesWithItems = [];
    for (let entry of entries) {
      // Join with bom_materials to get item_group
      const [items] = await db.query(`
        SELECT sei.*, bm.item_group, bm.material_grade
        FROM stock_entry_items sei
        LEFT JOIN boms b ON b.root_card_id = (SELECT id FROM root_cards WHERE project_name = ? LIMIT 1)
        LEFT JOIN bom_materials bm ON bm.bom_id = b.id AND bm.item_name = sei.item_name
        WHERE sei.stock_entry_id = ?
      `, [entry.project_name, entry.id]);
      
      const itemsWithSerials = [];
      for (let item of items) {
        const [serialRows] = await db.query(
          'SELECT serial_number, status, inspection_status, length, width, thickness, diameter, outer_diameter, height, unit_weight, total_weight, density FROM inventory_serials WHERE issued_in_entry_id = ? AND item_code LIKE ? AND item_name = ?',
          [entry.id, `${item.item_code}%`, item.item_name]
        );
        itemsWithSerials.push({ ...item, serials: serialRows });
      }
      entriesWithItems.push({ ...entry, items: itemsWithSerials });
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

    for (const piece of pieces) {
      // 1. Update serial number dimensions and status
      // If it's finished or returned to stock, mark original as Used
      const markAsUsed = piece.is_finished || piece.return_to_stock;
      const newStatus = markAsUsed ? 'Used' : 'Available';
      
      await connection.query(
        'UPDATE inventory_serials SET status = ?, inspection_status = "CUT", length = ?, width = ?, thickness = ?, unit_weight = ?, total_weight = ? WHERE serial_number = ?',
        [newStatus, piece.new_dims.l, piece.new_dims.w, piece.new_dims.t, piece.new_weight, piece.new_weight, piece.serial_number]
      );

      // If operator wants to return remnant to stock, create a NEW serial with remnant dimensions
      if (piece.return_to_stock && !piece.is_finished) {
        // Fetch original record to copy details
        const [originals] = await connection.query('SELECT * FROM inventory_serials WHERE serial_number = ?', [piece.serial_number]);
        if (originals.length > 0) {
          const orig = originals[0];
          const newSerialNumber = `${piece.serial_number}-R${Date.now().toString().slice(-3)}`; // Derivate ST Number
          
          await connection.query(
            `INSERT INTO inventory_serials 
            (serial_number, purchase_order_id, item_id, item_name, item_code, receipt_id, status, location, length, width, thickness, unit_weight, total_weight, density, inspection_status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              newSerialNumber, orig.purchase_order_id, orig.item_id, orig.item_name, orig.item_code, orig.receipt_id, 
              'Available', orig.location || 'Main Warehouse', 
              piece.new_dims.l, piece.new_dims.w, piece.new_dims.t, piece.new_weight, piece.new_weight, orig.density, 'Available'
            ]
          );
        }
      }

      // 2. Fetch assignment details
      const [assignments] = await connection.query(
        'SELECT * FROM daily_operator_assignments WHERE plan_id = ? AND (operation_name LIKE "%CUTTING%" OR operation_name LIKE "%Cutting%") LIMIT 1',
        [plan_id]
      );

      if (assignments.length > 0) {
        const a = assignments[0];
        
        // Find if there are specific calculations for this piece/item
        const calc = calculations?.find(c => c.serial_number === piece.serial_number) || 
                     calculations?.find(c => c.item_code === piece.item_code);

        // 3. Insert into daily_production_updates
        const [updateResult] = await connection.query(
          `INSERT INTO daily_production_updates 
          (work_date, plan_id, assignment_id, root_card_id, operation_id, operation_name, 
           operator_name, operator_id, actual_start, actual_end, break_time, actual_hours, 
           qty_completed, status, remarks) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURTIME(), CURTIME(), 0, 0, ?, "Completed", ?)`,
          [
            work_date, plan_id, a.id, a.root_card_id, a.operation_id, a.operation_name,
            a.operator_name, a.operator_id, 
            calc ? calc.total_parts_produced : 1,
            piece.remarks || `MCR entry for ${piece.serial_number}. Scrap: ${calc?.scrap_percent || 0}%`
          ]
        );

        const updateId = updateResult.insertId;

        // 4. Save Cutting Details if available (simplified for now until table exists)
        // You might need to create material_cutting_reports table
      }
    }

    await connection.commit();
    res.json({ success: true, message: 'MCR saved successfully' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error saving MCR:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  } finally {
    if (connection) connection.release();
  }
};
