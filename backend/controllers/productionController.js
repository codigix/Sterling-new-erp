const db = require('../config/db');

// Operations CRUD
exports.getRootCards = async (req, res) => {
  const { assignedOnly } = req.query;
  try {
    // Basic query to fetch root cards that are ready for production
    // Filtering by status 'Released' or 'Production' (depending on current project's status flow)
    let query = `
      SELECT rc.* 
      FROM root_cards rc
      WHERE rc.status IN (
        'RC_CREATED', 'DESIGN_IN_PROGRESS', 'QUALITY_QAP_PENDING', 'DESIGN_QAP_REVIEW', 
        'Released', 'Production', 'Partially Completed', 'MATERIAL_PLANNING', 
        'PURCHASE_ORDER_RELEASED', 'PARTIALLY_RELEASED', 'MATERIAL_RELEASED', 
        'PRODUCTION_IN_PROGRESS', 'DIMENSIONAL_QC_PENDING', 'DIMENSIONAL_QC_APPROVED',
        'PHASE_2_QC_PENDING', 'PHASE_2_QC_APPROVED', 'UNDER INSPECTION',
        'DESIGN_RELEASED', 'READY_FOR_PRODUCTION', 'READY_FOR_PHASE_2', 'QC_APPROVED',
        'Production completed and send to Quality fot QC',
        'send to production for complete final produciton',
        'final Prodcution completed and send to quality for final qc',
        'Redy for Dispatch'
      )
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
  const { name, type, description, phase } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

  try {
    const [result] = await db.query(
      'INSERT INTO operations (name, type, description, phase) VALUES (?, ?, ?, ?)',
      [name, type || 'In-house', description || '', phase || 1]
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
         JOIN root_cards r ON (a.root_card_id = r.id OR a.root_card_id = r.public_id) 
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
        m.id as mcr_id,
        (SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', a.id,
            'plan_id', a.plan_id,
            'root_card_id', a.root_card_id,
            'project_name', r.project_name,
            'projectRef', r.id,
            'operation_id', a.operation_id,
            'operation_name', a.operation_name,
            'assignment_type', a.assignment_type,
            'operator_id', a.operator_id,
            'operator_name', a.operator_name,
            'vendor_id', a.vendor_id,
            'vendor_name', a.vendor_name,
            'start_time', a.start_time,
            'end_time', a.end_time,
            'break_time', a.break_time,
            'total_hours', a.total_hours,
            'remarks', a.remarks,
            'status', a.status
          )
        ) FROM daily_operator_assignments a 
          LEFT JOIN root_cards r ON (a.root_card_id = r.id OR a.root_card_id = r.public_id) 
          WHERE a.plan_id = p.id) as assignments
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

    // 2. Insert Assignments and Sync Updates if provided
    if (assignments && assignments.length > 0) {
      for (const a of assignments) {
        // Resolve internal ID if public_id is provided
        const [cards] = await connection.query('SELECT id FROM root_cards WHERE id = ? OR public_id = ?', [a.root_card_id, a.root_card_id]);
        const effectiveRootCardId = cards.length > 0 ? cards[0].id : a.root_card_id;

        const [assignResult] = await connection.query(
          `INSERT INTO daily_operator_assignments 
          (plan_id, root_card_id, operation_id, operation_name, assignment_type, operator_name, operator_id, vendor_name, vendor_id, start_time, end_time, break_time, total_hours, remarks, status) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [planId, effectiveRootCardId, a.operation_id, a.operation_name, 
           a.assignment_type || 'inhouse',
           a.operator_name, a.operator_id,
           a.vendor_name, a.vendor_id,
           a.start_time, a.end_time, a.break_time || 0, a.total_hours, a.remarks || '',
           a.status || 'Pending']
        );

        const newAssignmentId = assignResult.insertId;

        // Create initial update record
        await connection.query(
          `INSERT INTO daily_production_updates 
          (work_date, plan_id, assignment_id, root_card_id, operation_id, operation_name, 
           operator_name, operator_id, vendor_name, vendor_id, assignment_type, 
           actual_start, actual_end, break_time, actual_hours, status, remarks) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [plan_date, planId, newAssignmentId, effectiveRootCardId, a.operation_id, a.operation_name,
           a.operator_name, a.operator_id, a.vendor_name, a.vendor_id, a.assignment_type || 'inhouse',
           a.start_time, a.end_time, a.break_time || 0, a.total_hours, a.status || 'Pending', a.remarks || '']
        );

        // Sync with root_card_operations
        await connection.query(
          `UPDATE root_card_operations 
           SET status = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE LOWER(TRIM(root_card_id)) = LOWER(TRIM(?)) AND LOWER(TRIM(operation_name)) = LOWER(TRIM(?))`,
          [a.status || 'Pending', effectiveRootCardId, a.operation_name]
        );
      }
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
      LEFT JOIN root_cards r ON (a.root_card_id = r.id OR a.root_card_id = r.public_id)
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

    // 3. Insert New Assignments and Sync Updates
    if (assignments && assignments.length > 0) {
      for (const a of assignments) {
        // Resolve internal ID if public_id is provided
        const [cards] = await connection.query('SELECT id FROM root_cards WHERE id = ? OR public_id = ?', [a.root_card_id, a.root_card_id]);
        const effectiveRootCardId = cards.length > 0 ? cards[0].id : a.root_card_id;

        const [assignResult] = await connection.query(
          `INSERT INTO daily_operator_assignments 
          (plan_id, root_card_id, operation_id, operation_name, assignment_type, operator_name, operator_id, vendor_name, vendor_id, start_time, end_time, break_time, total_hours, remarks, status) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, effectiveRootCardId, a.operation_id, a.operation_name, 
           a.assignment_type || 'inhouse',
           a.operator_name, a.operator_id,
           a.vendor_name, a.vendor_id,
           a.start_time, a.end_time, a.break_time || 0, a.total_hours, a.remarks || '',
           a.status || 'Pending']
        );

        const newAssignmentId = assignResult.insertId;

        // Sync with daily_production_updates
        // For batch updates, we check if an update exists for this plan_id, root_card_id and operation_name
        const [existingUpdate] = await connection.query(
          'SELECT id FROM daily_production_updates WHERE plan_id = ? AND root_card_id = ? AND operation_name = ?',
          [id, effectiveRootCardId, a.operation_name]
        );

        if (existingUpdate.length > 0) {
          await connection.query(
            `UPDATE daily_production_updates 
             SET assignment_id = ?, status = ?, remarks = ?, work_date = ?, actual_start = ?, actual_end = ?, actual_hours = ?, 
                 operator_name = ?, operator_id = ?, vendor_name = ?, vendor_id = ?, assignment_type = ?
             WHERE id = ?`,
            [newAssignmentId, a.status || 'Pending', a.remarks || '', plan_date, a.start_time, a.end_time, a.total_hours,
             a.operator_name, a.operator_id, a.vendor_name, a.vendor_id, a.assignment_type || 'inhouse',
             existingUpdate[0].id]
          );
        } else {
          await connection.query(
            `INSERT INTO daily_production_updates 
            (work_date, plan_id, assignment_id, root_card_id, operation_id, operation_name, 
             operator_name, operator_id, vendor_name, vendor_id, assignment_type, 
             actual_start, actual_end, break_time, actual_hours, status, remarks) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [plan_date, id, newAssignmentId, effectiveRootCardId, a.operation_id, a.operation_name,
             a.operator_name, a.operator_id, a.vendor_name, a.vendor_id, a.assignment_type || 'inhouse',
             a.start_time, a.end_time, a.break_time || 0, a.total_hours, a.status || 'Pending', a.remarks || '']
          );
        }

        // Sync with root_card_operations
        await connection.query(
          `UPDATE root_card_operations 
           SET status = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE LOWER(TRIM(root_card_id)) = LOWER(TRIM(?)) AND LOWER(TRIM(operation_name)) = LOWER(TRIM(?))`,
          [a.status || 'Pending', effectiveRootCardId, a.operation_name]
        );
      }
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
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get all root cards, operations and PHASES affected by this plan
    const [assignments] = await connection.query(
      `SELECT DISTINCT a.root_card_id, a.operation_name, rco.phase 
       FROM daily_operator_assignments a
       LEFT JOIN root_card_operations rco ON LOWER(TRIM(a.root_card_id)) = LOWER(TRIM(rco.root_card_id)) 
          AND LOWER(TRIM(a.operation_name)) = LOWER(TRIM(rco.operation_name))
       WHERE a.plan_id = ?`,
      [id]
    );

    // 2. Delete the plan (cascades to assignments)
    await connection.query('DELETE FROM daily_production_plans WHERE id = ?', [id]);

    // 3. For each affected project/operation, reset status in root_card_operations
    for (const a of assignments) {
      if (a.root_card_id && a.operation_name) {
        await connection.query(
          `UPDATE root_card_operations 
           SET status = 'Pending', updated_at = CURRENT_TIMESTAMP 
           WHERE LOWER(TRIM(root_card_id)) = LOWER(TRIM(?)) AND LOWER(TRIM(operation_name)) = LOWER(TRIM(?))`,
          [a.root_card_id, a.operation_name]
        );
      }
    }

    // 4. Check if we need to cleanup inspections for affected projects and phases
    // If a phase now has ANY non-completed operation, we clear inspections for THAT phase
    const affectedProjects = [...new Set(assignments.map(a => a.root_card_id).filter(Boolean))];
    for (const rcId of affectedProjects) {
      const projPhases = [...new Set(assignments.filter(a => a.root_card_id === rcId).map(a => a.phase).filter(Boolean))];
      
      for (const phase of projPhases) {
        const [incompleteOps] = await connection.query(
          "SELECT COUNT(*) as count FROM root_card_operations WHERE root_card_id = ? AND phase = ? AND status != 'Completed'",
          [rcId, phase]
        );
        
        if (incompleteOps[0].count > 0) {
          // If any operation in this phase is not completed, clear inspections for this phase
          await connection.query('DELETE FROM project_inspections WHERE root_card_id = ? AND phase = ?', [rcId, phase]);
          
          // Reset root card status if it was in a QC status for this phase
          const qcStatusToReset = phase === 1 
            ? ['DIMENSIONAL_QC_PENDING', 'DIMENSIONAL_QC_APPROVED', 'Production completed and send to Quality fot QC', 'send to production for complete final produciton'] 
            : ['PHASE_2_QC_PENDING', 'PHASE_2_QC_APPROVED', 'final Prodcution completed and send to quality for final qc', 'Redy for Dispatch'];
          await connection.query(
            `UPDATE root_cards SET status = 'PRODUCTION_IN_PROGRESS', updated_at = CURRENT_TIMESTAMP 
             WHERE id = ? AND status IN (?)`,
            [rcId, qcStatusToReset]
          );
        }
      }
    }

    await connection.commit();
    res.json({ success: true, message: 'Daily plan deleted and related statuses reset successfully' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error deleting daily plan:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  } finally {
    if (connection) connection.release();
  }
};

exports.addAssignment = async (req, res) => {
  const { plan_id, root_card_id, operation_id, operation_name, operator_name, operator_id, vendor_id, vendor_name, assignment_type, start_time, end_time, break_time, total_hours, remarks, status } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Resolve internal ID if public_id is provided
    const [cards] = await connection.query('SELECT id FROM root_cards WHERE id = ? OR public_id = ?', [root_card_id, root_card_id]);
    const effectiveRootCardId = cards.length > 0 ? cards[0].id : root_card_id;

    // 1. Get plan date
    const [plans] = await connection.query('SELECT plan_date FROM daily_production_plans WHERE id = ?', [plan_id]);
    const plan_date = plans.length > 0 ? plans[0].plan_date : new Date();

    // 2. Insert assignment
    const [result] = await connection.query(
      `INSERT INTO daily_operator_assignments 
      (plan_id, root_card_id, operation_id, operation_name, assignment_type, operator_name, operator_id, vendor_name, vendor_id, start_time, end_time, break_time, total_hours, remarks, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [plan_id, effectiveRootCardId, operation_id, operation_name, assignment_type || 'inhouse', operator_name, operator_id, vendor_name, vendor_id, start_time, end_time, break_time || 0, total_hours, remarks || '', status || 'Pending']
    );

    const newAssignmentId = result.insertId;

    // 3. Sync with daily_production_updates
    await connection.query(
      `INSERT INTO daily_production_updates 
      (work_date, plan_id, assignment_id, root_card_id, operation_id, operation_name, 
       operator_name, operator_id, vendor_name, vendor_id, assignment_type, 
       actual_start, actual_end, break_time, actual_hours, status, remarks) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [plan_date, plan_id, newAssignmentId, effectiveRootCardId, operation_id, operation_name,
       operator_name, operator_id, vendor_name, vendor_id, assignment_type || 'inhouse',
       start_time, end_time, break_time || 0, total_hours, status || 'Pending', remarks || '']
    );

    // 4. Sync with root_card_operations
    await connection.query(
      `UPDATE root_card_operations 
       SET status = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE LOWER(TRIM(root_card_id)) = LOWER(TRIM(?)) AND LOWER(TRIM(operation_name)) = LOWER(TRIM(?))`,
      [status || 'Pending', effectiveRootCardId, operation_name]
    );

    await connection.commit();
    res.json({ success: true, id: newAssignmentId, message: 'Assignment added and synced successfully' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error adding assignment:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  } finally {
    if (connection) connection.release();
  }
};

exports.deleteAssignment = async (req, res) => {
  const { id } = req.params;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get info before deletion (including phase)
    const [assignments] = await connection.query(
      `SELECT a.root_card_id, a.operation_name, rco.phase 
       FROM daily_operator_assignments a
       LEFT JOIN root_card_operations rco ON LOWER(TRIM(a.root_card_id)) = LOWER(TRIM(rco.root_card_id)) 
          AND LOWER(TRIM(a.operation_name)) = LOWER(TRIM(rco.operation_name))
       WHERE a.id = ?`,
      [id]
    );

    if (assignments.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    const { root_card_id, operation_name, phase } = assignments[0];

    // 2. Delete assignment
    await connection.query('DELETE FROM daily_operator_assignments WHERE id = ?', [id]);

    // 3. Delete linked production updates
    await connection.query('DELETE FROM daily_production_updates WHERE assignment_id = ?', [id]);

    // 4. Reset operation status if no other assignments exist for it
    if (root_card_id && operation_name) {
      const [otherAssignments] = await connection.query(
        'SELECT id FROM daily_operator_assignments WHERE LOWER(TRIM(root_card_id)) = LOWER(TRIM(?)) AND LOWER(TRIM(operation_name)) = LOWER(TRIM(?))',
        [root_card_id, operation_name]
      );

      if (otherAssignments.length === 0) {
        await connection.query(
          `UPDATE root_card_operations 
           SET status = 'Pending', updated_at = CURRENT_TIMESTAMP 
           WHERE LOWER(TRIM(root_card_id)) = LOWER(TRIM(?)) AND LOWER(TRIM(operation_name)) = LOWER(TRIM(?))`,
          [root_card_id, operation_name]
        );
      }
    }

    // 5. Cleanup inspections if project phase has any incomplete operations now
    if (root_card_id && phase) {
      const [incompleteOps] = await connection.query(
        "SELECT COUNT(*) as count FROM root_card_operations WHERE root_card_id = ? AND phase = ? AND status != 'Completed'",
        [root_card_id, phase]
      );
      
      if (incompleteOps[0].count > 0) {
        // If phase is now incomplete, clear inspections for this phase
        await connection.query('DELETE FROM project_inspections WHERE root_card_id = ? AND phase = ?', [root_card_id, phase]);
        
        // Reset root card status if it was in a QC status for this phase
        const qcStatusToReset = phase === 1 ? ['DIMENSIONAL_QC_PENDING', 'DIMENSIONAL_QC_APPROVED'] : ['PHASE_2_QC_PENDING', 'PHASE_2_QC_APPROVED'];
        await connection.query(
          `UPDATE root_cards SET status = 'PRODUCTION_IN_PROGRESS', updated_at = CURRENT_TIMESTAMP 
           WHERE id = ? AND status IN (?)`,
          [root_card_id, qcStatusToReset]
        );
      }
    }

    await connection.commit();
    res.json({ success: true, message: 'Assignment and linked updates deleted, status reset successfully' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error deleting assignment:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  } finally {
    if (connection) connection.release();
  }
};

exports.updateAssignment = async (req, res) => {
  const { id } = req.params;
  const { plan_id, plan_date, root_card_id, operation_id, operation_name, operator_name, operator_id, vendor_id, vendor_name, assignment_type, start_time, end_time, break_time, total_hours, remarks, status } = req.body;

  console.log(`UpdateAssignment called for ID: ${id}, Status: ${status}, Project: ${root_card_id}, Operation: ${operation_name}`);

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Resolve internal ID if public_id is provided
    const [cards] = await connection.query('SELECT id FROM root_cards WHERE id = ? OR public_id = ?', [root_card_id, root_card_id]);
    const effectiveRootCardId = cards.length > 0 ? cards[0].id : root_card_id;

    // 1. Update assignment
    await connection.query(
      `UPDATE daily_operator_assignments 
       SET root_card_id = ?, operation_id = ?, operation_name = ?, operator_name = ?, operator_id = ?, 
           vendor_id = ?, vendor_name = ?, assignment_type = ?,
           start_time = ?, end_time = ?, break_time = ?, total_hours = ?, remarks = ?, status = ?
       WHERE id = ?`,
      [effectiveRootCardId, operation_id, operation_name, operator_name, operator_id, 
       vendor_id || null, vendor_name || null, assignment_type || 'inhouse',
       start_time, end_time, break_time || 0, total_hours, remarks || '', status || 'Pending', id]
    );

    // 2. Sync with daily_production_updates
    if (status) {
      // 2a. Update daily_production_updates
      // Check if update already exists for this assignment
      const [existingUpdates] = await connection.query(
        'SELECT id FROM daily_production_updates WHERE assignment_id = ?',
        [id]
      );

      if (existingUpdates.length > 0) {
        // Update existing record
        await connection.query(
          `UPDATE daily_production_updates 
           SET status = ?, remarks = ?, work_date = ?, actual_start = ?, actual_end = ?, actual_hours = ?, root_card_id = ?
           WHERE assignment_id = ?`,
          [status, remarks || '', plan_date || new Date(), start_time, end_time, total_hours, effectiveRootCardId, id]
        );
      } else {
        // Create new record
        await connection.query(
          `INSERT INTO daily_production_updates 
          (work_date, plan_id, assignment_id, root_card_id, operation_id, operation_name, 
           operator_name, operator_id, vendor_name, vendor_id, assignment_type, 
           actual_start, actual_end, break_time, actual_hours, status, remarks) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [plan_date || new Date(), plan_id, id, effectiveRootCardId, operation_id, operation_name,
           operator_name, operator_id, vendor_name, vendor_id, assignment_type || 'inhouse',
           start_time, end_time, break_time || 0, total_hours, status, remarks || '']
        );
      }

      // 2b. Sync with root_card_operations (Project Stages)
      console.log(`Syncing stage status: ${status} for Project: ${effectiveRootCardId}, Operation: ${operation_name}`);
      const [stageSync] = await connection.query(
        `UPDATE root_card_operations 
         SET status = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE LOWER(TRIM(root_card_id)) = LOWER(TRIM(?)) AND LOWER(TRIM(operation_name)) = LOWER(TRIM(?))`,
        [status, effectiveRootCardId, operation_name]
      );
      console.log(`Stage sync result: ${stageSync.affectedRows} row(s) updated`);
    }

    await connection.commit();
    res.json({ success: true, message: 'Assignment updated and synced successfully' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error updating assignment:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  } finally {
    if (connection) connection.release();
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
    // Resolve internal ID if public_id is provided
    const [cards] = await db.query('SELECT id FROM root_cards WHERE id = ? OR public_id = ?', [root_card_id, root_card_id]);
    const effectiveRootCardId = cards.length > 0 ? cards[0].id : root_card_id;

    const [result] = await db.query(
      `INSERT INTO daily_production_updates 
      (work_date, plan_id, assignment_id, root_card_id, operation_id, operation_name, 
       operator_name, operator_id, actual_start, actual_end, break_time, actual_hours, 
       qty_completed, status, remarks) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [work_date, plan_id, assignment_id, effectiveRootCardId, operation_id, operation_name,
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

exports.sendFabricationToQC = async (req, res) => {
  const { root_card_id, phase } = req.body;
  if (!root_card_id) return res.status(400).json({ success: false, message: 'Root Card ID is required' });

  const currentPhase = phase || 1;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Resolve internal ID if public_id is provided
    const [rcs] = await connection.query('SELECT id, project_name FROM root_cards WHERE id = ? OR public_id = ?', [root_card_id, root_card_id]);
    if (rcs.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Root Card not found' });
    }
    const internalId = rcs[0].id;
    const projectName = rcs[0].project_name;

    // 2. Update Root Card status based on phase
    const newStatus = currentPhase === 1 
      ? 'Production completed and send to Quality fot QC' 
      : 'final Prodcution completed and send to quality for final qc';
    await connection.query(
      "UPDATE root_cards SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [newStatus, internalId]
    );

    // 3. Notify Quality
    const notificationTitle = currentPhase === 1 ? 'Fabrication Ready for QC' : 'Painting & Finishing Ready for QC';
    const notificationMsg = currentPhase === 1
      ? `Fabrication operations are complete for Project ${projectName} (${internalId}). The project is now ready for quality testing before Painting and Finishing.`
      : `Painting and Finishing operations are complete for Project ${projectName} (${internalId}). The project is now ready for final quality inspection.`;

    await connection.query(
      `INSERT INTO notifications (department, title, message, type, link) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        'Quality',
        notificationTitle,
        notificationMsg,
        'QC_REQUEST',
        `/department/quality/production-qc`
      ]
    );

    await connection.commit();
    res.json({ success: true, message: `Project phase ${currentPhase} successfully sent to Quality for inspection` });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error sending fabrication to QC:', error);
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
      SELECT se.*, rc.id as root_card_id
      FROM stock_entries se 
      LEFT JOIN root_cards rc ON se.project_name = rc.project_name
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
              const fS1 = parseFloat(piece.return_dims?.side1) || parseFloat(piece.return_dims?.side_s1) || 0;
              const fS2 = parseFloat(piece.return_dims?.side2) || parseFloat(piece.return_dims?.side_s2) || fS1;

              if (group.includes("PLATE") || group.includes("SHEET") || group.includes("BLOCK")) {
                returnWeight = (fL * fW * fT * density) / 1000000;
              } else if (group.includes("ROUND") && !group.includes("PIPE") && !group.includes("TUBE")) {
                const dia = parseFloat(os.diameter) || parseFloat(os.width) || 0;
                returnWeight = (Math.PI * Math.pow(dia / 2, 2) * fL * density) / 1000000;
              } else if (group.includes("BAR") && group.includes("SQUARE")) {
                const side1 = fS1 || parseFloat(os.side1) || parseFloat(os.width) || 0;
                const side2 = fS2 || parseFloat(os.side2) || parseFloat(os.height) || side1;
                returnWeight = (fL * side1 * side2 * density) / 1000000;
              } else if (group.includes("BAR") && !group.includes("ROUND")) {
                // Rectangular Bar
                const width = fW || parseFloat(os.width) || 0;
                const thickness = fT || parseFloat(os.thickness) || parseFloat(os.height) || 0;
                returnWeight = (fL * width * thickness * density) / 1000000;
              } else if (group.includes("PIPE") || group.includes("TUBE") || group.includes("BEAM") || group.includes("CHANNEL") || group.includes("ANGLE")) {
                // For all structural/linear items, weight is proportional to length
                const currentL = parseFloat(os.length) || 0;
                const currentW = parseFloat(os.unit_weight) || 0;
                if (currentL > 0) {
                  returnWeight = (fL / currentL) * currentW;
                } else {
                  // Fallback to geometric if length unknown
                  const side1 = fS1 || parseFloat(os.side1) || parseFloat(os.width) || 0;
                  const side2 = fS2 || parseFloat(os.side2) || parseFloat(os.height) || side1;
                  returnWeight = (fL * side1 * side2 * density) / 1000000;
                }
              } else {
                returnWeight = (fL * fW * fT * density) / 1000000;
              }

              // 4. Generate New Item Name based on dimensions
              let newItemName = piece.item_name;
              if (group.includes("PLATE") || group.includes("SHEET")) {
                newItemName = `${fL}x${fW}x${fT} mm Plate (OFF-CUT)`;
              } else if (group.includes("ROUND") && !group.includes("PIPE") && !group.includes("TUBE")) {
                const dia = parseFloat(os.diameter) || parseFloat(os.width) || 0;
                newItemName = `Dia ${dia} x ${fL} mm Round Bar (OFF-CUT)`;
              } else if (group.includes("BAR") && group.includes("SQUARE")) {
                const s1 = fS1 || parseFloat(os.side1) || parseFloat(os.width) || 0;
                const s2 = fS2 || parseFloat(os.side2) || parseFloat(os.height) || s1;
                newItemName = `${s1}x${s2}x${fL} mm Sq Bar (OFF-CUT)`;
              } else if (group.includes("BAR") && !group.includes("ROUND")) {
                const w_val = fW || parseFloat(os.width) || 0;
                const t_val = fT || parseFloat(os.thickness) || parseFloat(os.height) || 0;
                newItemName = `${w_val}x${t_val}x${fL} mm Bar (OFF-CUT)`;
              } else if (group.includes("PIPE") || group.includes("TUBE")) {
                const od_val = parseFloat(piece.return_dims?.outer_diameter) || parseFloat(os.outer_diameter) || 0;
                const t_val = fT || parseFloat(os.thickness) || 0;
                newItemName = `Ø${od_val} x ${t_val} x ${fL} mm Pipe (OFF-CUT)`;
              } else if (group.includes("BEAM") || group.includes("CHANNEL")) {
                const h_val = parseFloat(piece.return_dims?.height) || parseFloat(os.height) || 0;
                const w_val = fW || parseFloat(os.width) || 0;
                newItemName = `${h_val}x${w_val} x ${fL} mm (OFF-CUT)`;
              } else if (group.includes("ANGLE")) {
                const s1 = fS1 || parseFloat(os.side1) || 0;
                const s2 = fS2 || parseFloat(os.side2) || 0;
                newItemName = `${s1}x${s2}x${fT} mm Angle (OFF-CUT)`;
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
         remarks, root_card_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mcrId, piece.serial_number, piece.item_code, piece.item_name, piece.item_group, piece.material_grade, piece.design || 'Rectangular',
          piece.produced_qty, piece.cutting_axis || 'L',
          piece.raw_dims.l, piece.raw_dims.w, piece.raw_dims.t, 
          piece.raw_dims.diameter || null, piece.raw_dims.outer_diameter || null, piece.raw_dims.height || null,
          piece.raw_dims.web_thickness || null, piece.raw_dims.flange_thickness || null, piece.raw_dims.side1 || null, piece.raw_dims.side2 || null, piece.raw_dims.side_s || null, piece.raw_dims.side_s1 || null, piece.raw_dims.side_s2 || null,
          piece.new_dims.l, piece.new_dims.w, piece.new_dims.t,
          piece.new_dims.diameter || null, piece.new_dims.outer_diameter || null, piece.new_dims.height || null,
          piece.new_dims.web_thickness || null, piece.new_dims.flange_thickness || null, piece.new_dims.side1 || null, piece.new_dims.side2 || null, piece.new_dims.side_s || null, piece.new_dims.side_s1 || null, piece.new_dims.side_s2 || null,
          piece.weight_consumed || (calc ? calc.currentWeight : 0),
          piece.unit_weight || 0,
          piece.scrap_weight || (calc ? calc.scrapWeight : 0),
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
          piece.remarks || '',
          piece.root_card_id || null
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

exports.getCombinedMCRSummary = async (req, res) => {
  try {
    const query = `
      SELECT 
        data.root_card_id,
        rc.project_name,
        MIN(data.work_date) as start_date,
        MAX(data.work_date) as last_date,
        COUNT(data.id) as total_items,
        SUM(data.weight_consumed) as total_weight,
        SUM(data.scrap_weight) as total_scrap,
        SUM(data.produced_qty) as total_produced
      FROM (
        SELECT 
          mcri.id,
          mcr.work_date,
          mcri.weight_consumed,
          mcri.scrap_weight,
          mcri.produced_qty,
          COALESCE(mcri.root_card_id, (
            SELECT doa.root_card_id 
            FROM daily_operator_assignments doa 
            WHERE doa.plan_id = mcr.plan_id AND (doa.operation_name LIKE '%Cutting%' OR doa.operation_name LIKE '%MCR%')
            LIMIT 1
          )) as root_card_id
        FROM material_cutting_report_items mcri
        JOIN material_cutting_reports mcr ON mcri.mcr_id = mcr.id
      ) data
      JOIN root_cards rc ON rc.id = data.root_card_id
      GROUP BY data.root_card_id, rc.project_name
      ORDER BY last_date DESC
    `;
    const [rows] = await db.query(query);
    res.json({ success: true, summary: rows });
  } catch (error) {
    console.error('Error fetching combined MCR summary:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getCombinedMCRReport = async (req, res) => {
  const { root_card_id } = req.query;
  try {
    // Resolve internal ID if public_id is provided
    const [cards] = await db.query('SELECT id FROM root_cards WHERE id = ? OR public_id = ?', [root_card_id, root_card_id]);
    const effectiveId = cards.length > 0 ? cards[0].id : root_card_id;

    const query = `
      SELECT 
        data.*, 
        rc.project_name as rc_project_name
      FROM (
        SELECT 
          mcri.*, 
          mcr.work_date,
          COALESCE(mcri.root_card_id, (
            SELECT doa.root_card_id 
            FROM daily_operator_assignments doa 
            WHERE doa.plan_id = mcr.plan_id AND (doa.operation_name LIKE '%Cutting%' OR doa.operation_name LIKE '%MCR%')
            LIMIT 1
          )) as effective_root_card_id
        FROM material_cutting_report_items mcri
        JOIN material_cutting_reports mcr ON mcri.mcr_id = mcr.id
      ) data
      LEFT JOIN root_cards rc ON rc.id = data.effective_root_card_id
      WHERE data.effective_root_card_id = ?
      ORDER BY data.work_date DESC, data.id DESC
    `;

    const [rows] = await db.query(query, [effectiveId]);
    res.json({ success: true, report: rows });
  } catch (error) {
    console.error('Error fetching combined MCR report:', error);
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

exports.getRootCardById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM root_cards WHERE id = ? OR public_id = ?', [id, id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Root Card not found' });
    }

    const rootCard = rows[0];
    const internalId = rootCard.id;

    // Fetch operations with phase info
    const [operations] = await db.query('SELECT * FROM root_card_operations WHERE root_card_id = ? ORDER BY id DESC', [internalId]);
    
    // Check if Phase 1 is fully completed and approved by Quality
    const phase1Ops = operations.filter(op => op.phase === 1);
    
    // Phase 2 is unlocked ONLY if root card status is DIMENSIONAL_QC_APPROVED 
    // or if the project has already moved past this stage (e.g. status is 'Production' or similar)
    const phase2Unlocked = rows[0].status === 'DIMENSIONAL_QC_APPROVED' || 
                           rows[0].status === 'Production' || 
                           rows[0].status === 'Partially Completed' ||
                           rows[0].status === 'send to production for complete final produciton' ||
                           rows[0].status === 'PHASE_2_QC_PENDING' ||
                           rows[0].status === 'PHASE_2_QC_APPROVED' ||
                           rows[0].status === 'final Prodcution completed and send to quality for final qc' ||
                           rows[0].status === 'Redy for Dispatch';

    const phase1Completed = (phase1Ops.length > 0 && phase1Ops.every(op => op.status === 'Completed')) || phase2Unlocked;

    res.json({ 
      success: true, 
      rootCard: rows[0], 
      stages: operations,
      phaseStatus: {
        phase1Completed,
        phase2Unlocked
      }
    });
  } catch (error) {
    console.error('Error fetching root card by id:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.addProductionOperation = async (req, res) => {
  const { id } = req.params;
  const { stageName, stageType, plannedStart, plannedEnd, notes, phase } = req.body;
  
  try {
    // Resolve internal ID if public_id is provided
    const [cards] = await db.query('SELECT id FROM root_cards WHERE id = ? OR public_id = ?', [id, id]);
    if (cards.length === 0) {
      return res.status(404).json({ success: false, message: 'Root Card not found' });
    }
    const internalId = cards[0].id;

    const [result] = await db.query(
      'INSERT INTO root_card_operations (root_card_id, operation_name, operation_type, phase, planned_start, planned_end, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [internalId, stageName, stageType || 'in_house', phase || 1, plannedStart || null, plannedEnd || null, notes || '']
    );
    
    res.json({ success: true, id: result.insertId, message: 'Operation added successfully' });
  } catch (error) {
    console.error('Error adding production operation:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateProductionOperation = async (req, res) => {
  const { id, operationId } = req.params;
  const { status, notes } = req.body;

  try {
    // Resolve internal ID if public_id is provided
    const [cards] = await db.query('SELECT id FROM root_cards WHERE id = ? OR public_id = ?', [id, id]);
    if (cards.length === 0) {
      return res.status(404).json({ success: false, message: 'Root Card not found' });
    }
    const internalId = cards[0].id;

    await db.query(
      'UPDATE root_card_operations SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND root_card_id = ?',
      [status, notes, operationId, internalId]
    );
    res.json({ success: true, message: 'Operation updated successfully' });
  } catch (error) {
    console.error('Error updating production operation:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.deleteProductionOperation = async (req, res) => {
  const { operationId } = req.params;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get the root_card_id and phase for this operation before deleting
    const [ops] = await connection.query('SELECT root_card_id, phase FROM root_card_operations WHERE id = ?', [operationId]);
    if (ops.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Operation not found' });
    }
    const { root_card_id, phase } = ops[0];

    // 2. Delete the operation
    await connection.query('DELETE FROM root_card_operations WHERE id = ?', [operationId]);

    // 3. Check if there are any operations left for this project and phase
    const [remainingOps] = await connection.query(
      'SELECT COUNT(*) as count FROM root_card_operations WHERE root_card_id = ? AND phase = ?',
      [root_card_id, phase]
    );

    const [allRemainingOps] = await connection.query(
      'SELECT COUNT(*) as count FROM root_card_operations WHERE root_card_id = ?',
      [root_card_id]
    );

    // If ALL operations for the project are deleted, or all operations for this phase are deleted
    // we should clean up the inspections for that phase/project
    if (remainingOps[0].count === 0 || allRemainingOps[0].count === 0) {
      await connection.query('DELETE FROM project_inspections WHERE root_card_id = ? AND phase = ?', [root_card_id, phase]);
      
      // Also reset root card status if it was in a QC status
      const qcStatusToReset = phase === 1 
        ? ['DIMENSIONAL_QC_PENDING', 'DIMENSIONAL_QC_APPROVED', 'Production completed and send to Quality fot QC', 'send to production for complete final produciton'] 
        : ['PHASE_2_QC_PENDING', 'PHASE_2_QC_APPROVED', 'final Prodcution completed and send to quality for final qc', 'Redy for Dispatch'];
      
      await connection.query(
        `UPDATE root_cards SET status = 'PRODUCTION_IN_PROGRESS', updated_at = CURRENT_TIMESTAMP 
         WHERE id = ? AND status IN (?)`,
        [root_card_id, qcStatusToReset]
      );
    }

    await connection.commit();
    res.json({ success: true, message: 'Operation deleted successfully and QC data cleaned up if necessary' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error deleting production operation:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  } finally {
    if (connection) connection.release();
  }
};

exports.createOutwardChallan = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const {
            challan_no, challan_date, status, vendor_id, vendor_name, vendor_address,
            operation_name, supply_order_no, supply_order_date,
            despatched_through, against_lr_rr_no, freight_type,
            remarks, assignment_id, plan_id, root_card_id, items
        } = req.body;

        const [challanResult] = await connection.query(
            `INSERT INTO outward_challans (
                challan_no, challan_date, status, vendor_id, vendor_name, vendor_address,
                operation_name, supply_order_no, supply_order_date,
                despatched_through, against_lr_rr_no, freight_type,
                remarks, assignment_id, plan_id, root_card_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                challan_no, challan_date, status, vendor_id || null, vendor_name, vendor_address,
                operation_name, supply_order_no || null, supply_order_date || null,
                despatched_through || null, against_lr_rr_no || null, freight_type || null,
                remarks, assignment_id, plan_id, root_card_id
            ]
        );

        const challanId = challanResult.insertId;

        if (items && items.length > 0) {
            const itemValues = items.map(item => [
                challanId, item.item_code, item.item_name, item.batch_no,
                item.available_qty, item.dispatch_qty, item.uom
            ]);

            await connection.query(
                `INSERT INTO outward_challan_items (
                    challan_id, item_code, item_name, batch_no, 
                    available_qty, dispatch_qty, uom
                ) VALUES ?`,
                [itemValues]
            );
        }

        await connection.commit();
        res.json({ success: true, message: 'Outward challan created successfully', challanId });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating outward challan:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

exports.getOutwardChallans = async (req, res) => {
    try {
        const query = `
            SELECT oc.*, rc.project_name, rc.id as project_ref
            FROM outward_challans oc
            LEFT JOIN root_cards rc ON oc.root_card_id = rc.id
            ORDER BY oc.created_at DESC
        `;
        const [rows] = await db.query(query);
        res.json({ success: true, challans: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getOutwardChallanDetails = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT oc.*, rc.project_name, rc.id as project_ref
            FROM outward_challans oc
            LEFT JOIN root_cards rc ON oc.root_card_id = rc.id
            WHERE oc.id = ?
        `;
        const [challan] = await db.query(query, [id]);
        
        if (challan.length === 0) {
            return res.status(404).json({ success: false, message: 'Challan not found' });
        }

        const [items] = await db.query('SELECT * FROM outward_challan_items WHERE challan_id = ?', [id]);
        
        res.json({ success: true, challan: challan[0], items });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createInwardChallan = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const {
            challan_no, challan_date, status, outward_challan_id, vendor_id, vendor_name, vendor_address,
            received_date, vehicle_no, remarks, root_card_id, items
        } = req.body;

        const [challanResult] = await connection.query(
            `INSERT INTO inward_challans (
                challan_no, challan_date, status, outward_challan_id, vendor_id, vendor_name, vendor_address,
                received_date, vehicle_no, remarks, root_card_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                challan_no, challan_date, status, outward_challan_id, vendor_id || null, vendor_name, vendor_address,
                received_date, vehicle_no || null, remarks, root_card_id
            ]
        );

        const challanId = challanResult.insertId;

        if (items && items.length > 0) {
            const itemValues = items.map(item => [
                challanId, item.item_code, item.item_name, item.batch_no,
                item.sent_qty, item.received_qty, item.accepted_qty, item.rejected_qty,
                item.uom, item.remarks
            ]);

            await connection.query(
                `INSERT INTO inward_challan_items (
                    inward_challan_id, item_code, item_name, batch_no, 
                    sent_qty, received_qty, accepted_qty, rejected_qty,
                    uom, remarks
                ) VALUES ?`,
                [itemValues]
            );
        }

        // Optional: Update outward challan status to RECEIVED if all items are received
        if (outward_challan_id) {
            await connection.query(
                "UPDATE outward_challans SET status = 'RECEIVED' WHERE id = ?",
                [outward_challan_id]
            );
        }

        await connection.commit();
        res.json({ success: true, message: 'Inward challan created successfully', challanId });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating inward challan:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

exports.getInwardChallans = async (req, res) => {
    try {
        const query = `
            SELECT ic.*, rc.project_name, rc.id as project_ref, oc.challan_no as outward_challan_no
            FROM inward_challans ic
            LEFT JOIN root_cards rc ON ic.root_card_id = rc.id
            LEFT JOIN outward_challans oc ON ic.outward_challan_id = oc.id
            ORDER BY ic.created_at DESC
        `;
        const [rows] = await db.query(query);
        res.json({ success: true, challans: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getInwardChallanDetails = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT ic.*, rc.project_name, rc.id as project_ref, oc.challan_no as outward_challan_no
            FROM inward_challans ic
            LEFT JOIN root_cards rc ON ic.root_card_id = rc.id
            LEFT JOIN outward_challans oc ON ic.outward_challan_id = oc.id
            WHERE ic.id = ?
        `;
        const [challan] = await db.query(query, [id]);
        
        if (challan.length === 0) {
            return res.status(404).json({ success: false, message: 'Challan not found' });
        }

        const [items] = await db.query('SELECT * FROM inward_challan_items WHERE inward_challan_id = ?', [id]);
        
        res.json({ success: true, challan: challan[0], items });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
