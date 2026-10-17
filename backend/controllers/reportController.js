const db = require('../config/db');

// ─── Department stage completion (reports only) ─────────────────────────────
// root_card_steps.status is not kept up to date by the route-card flow, so reports
// work out whether a department's stage is done from how far the route card has
// progressed, and take the completion date from that department's own last action.

// Route card status → how far the card has progressed (follows the real status transitions)
const STATUS_PROGRESS = {
  pending: 0, RC_CREATED: 0,
  DESIGN_IN_PROGRESS: 1, QUALITY_QAP_PENDING: 2, DESIGN_QAP_REVIEW: 3, DESIGN_APPROVED: 4,
  BOM_PREPARATION: 5, MATERIAL_PLANNING: 6, PROCUREMENT_IN_PROGRESS: 7,
  PURCHASE_ORDER_RELEASED: 8, PO_RELEASED: 8,
  MATERIAL_RECEIVED: 9, MATERIAL_QC_PENDING: 9, MATERIAL_QC_APPROVED: 9,
  PARTIALLY_RELEASED: 9, MATERIAL_PARTIALLY_RELEASED: 9,
  MATERIAL_RELEASED: 10, SEND_TO_PRODUCTION: 10,
  PRODUCTION_IN_PROGRESS: 11,
  'Production completed and send to Quality fot QC': 12, DIMENSIONAL_QC_PENDING: 12, DIMENSIONAL_QC_APPROVED: 12,
  'send to production for complete final produciton': 12, PAINTING_IN_PROGRESS: 12, 'UNDER INSPECTION': 12,
  'final Prodcution completed and send to quality for final qc': 13, PHASE_2_QC_PENDING: 13, FINAL_QC_PENDING: 13,
  'Redy for Dispatch': 14, PHASE_2_QC_APPROVED: 14, FINAL_QC_APPROVED: 14, QC_APPROVED: 14,
  READY_FOR_DELIVERY: 14, READY_FOR_DISPATCH: 14, DISPATCHED: 14, DELIVERED: 14, COMPLETED: 14, Completed: 14
};

// Progress a route card must reach for each department's stage to count as complete
const STAGE_DONE_AT = { Design: 5, Procurement: 8, Inventory: 10, Production: 13, Quality: 14 };

const STAGE_STEP_KEYS = {
  Design: 'design_engineering',
  Production: 'production',
  Procurement: 'procurement',
  Inventory: 'inventory',
  Quality: 'quality'
};

// Returns { [rootCardId]: { Design: { completed, completedDate }, ... } }
const loadStageCompletion = async (rootCardIds = null) => {
  const filterIds = Array.isArray(rootCardIds);
  if (filterIds && rootCardIds.length === 0) return {};
  const where = (col) => (filterIds ? `AND ${col} IN (?)` : '');
  const params = filterIds ? [rootCardIds] : [];

  const [cards] = await db.query(
    `SELECT id, status, qap_status FROM root_cards WHERE 1=1 ${where('id')}`, params
  );
  const [steps] = await db.query(
    `SELECT root_card_id, step_key, status, updated_at FROM root_card_steps WHERE 1=1 ${where('root_card_id')}`, params
  );
  const [designDates] = await db.query(
    `SELECT root_card_id, MAX(updated_at) AS done_at FROM design_documents
     WHERE status = 'Approved' ${where('root_card_id')} GROUP BY root_card_id`, params
  );
  const [poDates] = await db.query(
    `SELECT COALESCE(po.project_id, q.root_card_id, mr.root_card_id) AS root_card_id, MAX(po.created_at) AS done_at
     FROM purchase_orders po
     LEFT JOIN quotations q ON po.quotation_id = q.id
     LEFT JOIN material_requests mr ON q.material_request_id = mr.id
     WHERE LOWER(COALESCE(po.status, '')) NOT IN ('draft', 'cancelled')
     GROUP BY COALESCE(po.project_id, q.root_card_id, mr.root_card_id)`
  );
  const [grnDates] = await db.query(
    `SELECT COALESCE(po.project_id, q.root_card_id, mr.root_card_id) AS root_card_id, MAX(g.updated_at) AS done_at
     FROM grns g
     JOIN purchase_orders po ON g.purchase_order_id = po.id
     LEFT JOIN quotations q ON po.quotation_id = q.id
     LEFT JOIN material_requests mr ON q.material_request_id = mr.id
     WHERE g.status IN ('material_released', 'partially_released')
     GROUP BY COALESCE(po.project_id, q.root_card_id, mr.root_card_id)`
  );
  const [productionDates] = await db.query(
    `SELECT root_card_id, MAX(work_date) AS done_at FROM daily_production_updates
     WHERE 1=1 ${where('root_card_id')} GROUP BY root_card_id`, params
  );
  const [qualityDates] = await db.query(
    `SELECT root_card_id, MAX(updated_at) AS done_at FROM project_inspections
     WHERE status = 'Approved' ${where('root_card_id')} GROUP BY root_card_id`, params
  );

  const toMap = (rows) => Object.fromEntries(rows.filter((r) => r.root_card_id).map((r) => [r.root_card_id, r.done_at]));
  const evidence = {
    Design: toMap(designDates),
    Procurement: toMap(poDates),
    Inventory: toMap(grnDates),
    Production: toMap(productionDates),
    Quality: toMap(qualityDates)
  };
  const stepMap = {};
  steps.forEach((s) => {
    (stepMap[s.root_card_id] ||= {})[s.step_key] = s;
  });

  const result = {};
  cards.forEach((card) => {
    const progress = STATUS_PROGRESS[card.status];
    result[card.id] = {};
    Object.keys(STAGE_DONE_AT).forEach((stage) => {
      const step = stepMap[card.id]?.[STAGE_STEP_KEYS[stage]];
      const stepCompleted = step && String(step.status).toLowerCase() === 'completed';
      const reached = progress !== undefined && progress >= STAGE_DONE_AT[stage];
      const designApproved = stage === 'Design' && card.qap_status === 'APPROVED';
      const completed = Boolean(stepCompleted || reached || designApproved);
      result[card.id][stage] = {
        completed,
        completedDate: completed ? (evidence[stage][card.id] || (stepCompleted ? step.updated_at : null)) : null
      };
    });
  });
  return result;
};

const parseTimelines = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

// Local YYYY-MM-DD for a timeline date string (avoids the UTC shift of toISOString)
const toDateKey = (value) => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Classifies one department stage against its timeline end date
const evaluateStage = (stageInfo, endDate, today = new Date()) => {
  const deadline = new Date(endDate);
  deadline.setHours(23, 59, 59, 999);
  const dayMs = 1000 * 3600 * 24;

  if (stageInfo.completed) {
    if (!stageInfo.completedDate) return { state: 'completed_undated', delayDays: 0 };
    const done = new Date(stageInfo.completedDate);
    return done <= deadline
      ? { state: 'completed_on_time', delayDays: 0 }
      : { state: 'completed_late', delayDays: Math.ceil((done - deadline) / dayMs) };
  }
  return today > deadline
    ? { state: 'overdue', delayDays: Math.ceil((today - deadline) / dayMs) }
    : { state: 'pending_on_track', delayDays: 0 };
};

const getOverviewReport = async (req, res) => {
  const { start, end } = req.query;
  try {
    const [completedProjects] = await db.query(
      "SELECT COUNT(*) as count FROM root_cards WHERE status IN ('COMPLETED', 'READY_FOR_DELIVERY', 'DELIVERED', 'Completed') AND updated_at BETWEEN ? AND ?",
      [start, end]
    );

    const [totalRevenue] = await db.query(
      "SELECT SUM(grand_total) as total FROM customer_invoices WHERE status != 'CANCELLED' AND invoice_date BETWEEN ? AND ?",
      [start, end]
    );

    const [activeAlerts] = await db.query(
      "SELECT COUNT(*) as count FROM project_inspections WHERE status = 'Rejected' AND created_at BETWEEN ? AND ?",
      [start, end]
    );

    // Calculate actual on-time delivery rate
    const [deliveryStats] = await db.query(`
      SELECT 
        COUNT(*) as totalCompleted,
        COUNT(CASE WHEN DATE(updated_at) <= delivery_date THEN 1 END) as onTimeCompleted
      FROM root_cards
      WHERE status IN ('COMPLETED', 'READY_FOR_DELIVERY', 'DELIVERED', 'Completed')
      AND updated_at BETWEEN ? AND ?
    `, [start, end]);

    const totalCompleted = deliveryStats[0].totalCompleted || 0;
    const onTimeCompleted = deliveryStats[0].onTimeCompleted || 0;
    const onTimeDelivery = totalCompleted > 0 ? Math.round((onTimeCompleted / totalCompleted) * 100) : 100;

    // Fetch monthly trends for projects
    const [monthlyTrends] = await db.query(`
      SELECT 
        DATE_FORMAT(updated_at, '%b') as month,
        COUNT(*) as count,
        DATE_FORMAT(updated_at, '%Y-%m') as sort_key
      FROM root_cards
      WHERE status IN ('READY_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'Completed') 
      AND updated_at BETWEEN ? AND ?
      GROUP BY sort_key, month
      ORDER BY sort_key ASC
    `, [start, end]);

    // Calculate department performance dynamically
    const [taskStats] = await db.query(`
      SELECT 
        d.id as deptId,
        d.name as deptName,
        COUNT(t.id) as totalTasks,
        COUNT(CASE WHEN LOWER(t.status) = 'completed' THEN 1 END) as completedTasks
      FROM (
        SELECT 1 as id, 'Admin' as name UNION 
        SELECT 2 as id, 'Design Engineer' as name UNION 
        SELECT 3 as id, 'Production' as name UNION 
        SELECT 4 as id, 'Procurement' as name UNION 
        SELECT 5 as id, 'Quality' as name UNION 
        SELECT 6 as id, 'Inventory' as name UNION 
        SELECT 7 as id, 'Accountant' as name
      ) d
      LEFT JOIN department_tasks t ON d.id = t.department_id
      GROUP BY d.id, d.name
    `);

    const [userStats] = await db.query(`
      SELECT department as name, COUNT(*) as count 
      FROM users 
      WHERE department IS NOT NULL AND department != '' 
      GROUP BY department
    `);

    const userMap = {};
    userStats.forEach(u => {
      const standardized = u.name.replace(/_/g, ' ').toLowerCase();
      userMap[standardized] = u.count;
    });

    const departments = taskStats.map(d => {
      const stdName = d.deptName.toLowerCase();
      const totalUsers = userMap[stdName] || userMap[d.deptName.replace(/ /g, '_').toLowerCase()] || 0;
      const avgEfficiency = d.totalTasks > 0 ? Math.round((d.completedTasks / d.totalTasks) * 100) : 100;
      return {
        name: d.deptName,
        totalUsers,
        completedTasks: d.completedTasks,
        avgEfficiency
      };
    });

    res.json({
      completedProjects: completedProjects[0].count || 0,
      onTimeDelivery,
      totalRevenue: totalRevenue[0].total || 0,
      activeAlerts: activeAlerts[0].count || 0,
      monthlyTrends: monthlyTrends || [],
      departments
    });
  } catch (error) {
    console.error('Error fetching overview report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getProjectsReport = async (req, res) => {
  const { projectId } = req.query;
  try {
    // 1. Fetch all projects to populate select dropdown/table on frontend
    const [projects] = await db.query(`
      SELECT id, project_code, project_name, timelines 
      FROM root_cards 
      ORDER BY created_at DESC
    `);

    let selectedProjectDetails = null;

    if (projectId) {
      const [projRows] = await db.query(`
        SELECT id, project_code, project_name, timelines, status 
        FROM root_cards 
        WHERE id = ?
      `, [projectId]);

      if (projRows.length > 0) {
        const project = projRows[0];
        let timelinesObj = project.timelines;
        if (timelinesObj && typeof timelinesObj === 'string') {
          try {
            timelinesObj = JSON.parse(timelinesObj);
          } catch (e) {
            timelinesObj = null;
          }
        }

        const stageCompletion = (await loadStageCompletion([project.id]))[project.id] || {};
        const STATE_LABELS = {
          completed_on_time: 'Completed On Time',
          completed_late: 'Completed with Delay',
          completed_undated: 'Completed',
          overdue: 'Overdue',
          pending_on_track: 'Pending (On Time)'
        };

        const departments = ['Design', 'Production', 'Procurement', 'Inventory', 'Quality'];
        const timelineReport = departments.map(dept => {
          const stageInfo = stageCompletion[dept] || { completed: false, completedDate: null };
          const dates = (timelinesObj && timelinesObj[dept]) ? timelinesObj[dept] : null;

          let status = stageInfo.completed ? 'Completed' : 'Not Assigned';
          let delayDays = 0;

          if (dates && dates.endDate) {
            const evaluation = evaluateStage(stageInfo, dates.endDate);
            status = STATE_LABELS[evaluation.state];
            delayDays = evaluation.delayDays;
          }

          return {
            department: dept,
            startDate: dates ? dates.startDate : null,
            endDate: dates ? dates.endDate : null,
            completedDate: stageInfo.completedDate,
            status,
            delayDays
          };
        });

        selectedProjectDetails = {
          id: project.id,
          project_code: project.project_code,
          project_name: project.project_name,
          project_status: project.status,
          timelineReport
        };
      }
    }

    res.json({
      projects: projects.map(p => {
        let hasTimelines = false;
        if (p.timelines) {
          try {
            const t = typeof p.timelines === 'string' ? JSON.parse(p.timelines) : p.timelines;
            hasTimelines = Object.keys(t || {}).length > 0;
          } catch (e) {
            hasTimelines = false;
          }
        }
        return {
          id: p.id,
          project_code: p.project_code,
          project_name: p.project_name,
          hasTimelines
        };
      }),
      selectedProject: selectedProjectDetails
    });
  } catch (error) {
    console.error('Error fetching projects report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getDepartmentsReport = async (req, res) => {
  try {
    const [tasks] = await db.query(`
      SELECT t.*, u.full_name as assignedByName
      FROM department_tasks t
      LEFT JOIN users u ON t.assigned_by = u.id
      ORDER BY t.assignment_date DESC, t.id DESC
    `);

    const DEPARTMENT_MAP = {
      1: 'Admin',
      2: 'Design Engineer',
      3: 'Production',
      4: 'Procurement',
      5: 'Quality',
      6: 'Inventory',
      7: 'Accountant'
    };

    let totalTasks = tasks.length;
    let completedTasks = 0;
    let pendingTasks = 0;
    let overdueTasks = 0;
    let onTimeCompleted = 0;

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const processedTasks = tasks.map(task => {
      const deptName = DEPARTMENT_MAP[task.department_id] || 'Unknown';
      let delayDays = 0;

      const isCompleted = task.status === 'Completed' || task.status === 'COMPLETED';
      const dueDate = new Date(task.due_date);
      dueDate.setHours(23, 59, 59, 999);

      if (isCompleted) {
        completedTasks++;
        const completedDate = task.completed_date ? new Date(task.completed_date) : new Date(task.updated_at);
        if (completedDate > dueDate) {
          delayDays = Math.ceil((completedDate.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
        } else {
          onTimeCompleted++;
        }
      } else {
        pendingTasks++;
        if (today > dueDate) {
          overdueTasks++;
          delayDays = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
        }
      }

      return {
        ...task,
        department_name: deptName,
        delay_days: delayDays
      };
    });

    const onTimeRate = completedTasks > 0 ? Math.round((onTimeCompleted / completedTasks) * 100) : 100;

    res.json({
      tasks: processedTasks,
      summary: {
        totalTasks,
        completedTasks,
        pendingTasks,
        overdueTasks,
        onTimeRate
      }
    });
  } catch (error) {
    console.error('Error fetching departments task report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getVendorsReport = async (req, res) => {
  try {
    const [vendorsList] = await db.query(`
      SELECT 
        v.id,
        v.name,
        (SELECT COUNT(*) FROM purchase_orders WHERE vendor_id = v.id AND LOWER(COALESCE(status, '')) NOT IN ('cancelled', 'draft')) as totalOrders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM purchase_orders WHERE vendor_id = v.id AND LOWER(COALESCE(status, '')) NOT IN ('cancelled', 'draft')) as totalValue,
        (SELECT COUNT(*) FROM grns grn
         JOIN purchase_orders po ON grn.purchase_order_id = po.id
         WHERE po.vendor_id = v.id) as totalGRNs,
         (SELECT COUNT(*) FROM grns grn
          JOIN purchase_orders po ON grn.purchase_order_id = po.id
          WHERE po.vendor_id = v.id
            AND (po.expected_delivery_date IS NULL OR DATE(grn.posting_date) <= po.expected_delivery_date)) as onTimeGRNs
      FROM vendors v
    `);

    const [rejectionList] = await db.query(`
      SELECT 
        po.vendor_id,
        COUNT(CASE WHEN serial.status = 'Rejected' THEN 1 END) as rejectedItems,
        COUNT(serial.id) as totalItems
      FROM purchase_orders po
      LEFT JOIN inventory_serials serial ON po.id = serial.purchase_order_id
      GROUP BY po.vendor_id
    `);

    const rejectionMap = {};
    rejectionList.forEach(r => {
      rejectionMap[r.vendor_id] = {
        rejectedItems: r.rejectedItems,
        totalItems: r.totalItems
      };
    });

    const vendors = vendorsList.map(v => {
      const totalGRNs = v.totalGRNs || 0;
      const onTimeGRNs = v.onTimeGRNs || 0;
      const onTimeDelivery = totalGRNs > 0 ? Math.round((onTimeGRNs / totalGRNs) * 100) : 100;

      // Quality Rating (1.0 to 5.0) based on rejections
      const rejections = rejectionMap[v.id] || { rejectedItems: 0, totalItems: 0 };
      const rejectionRate = rejections.totalItems > 0 ? (rejections.rejectedItems / rejections.totalItems) : 0;
      const qualityScore = 5.0 - (rejectionRate * 5.0);
      const qualityRating = parseFloat(Math.max(1.0, qualityScore).toFixed(1));

      // Status based on rating
      let status = 'Excellent';
      if (qualityRating < 2.5) status = 'Needs Improvement';
      else if (qualityRating < 3.5) status = 'Average';
      else if (qualityRating < 4.5) status = 'Good';

      return {
        name: v.name,
        totalOrders: v.totalOrders || 0,
        totalDeliveries: totalGRNs,
        onTimeDeliveries: onTimeGRNs,
        onTimeDelivery,
        qualityRating,
        totalValue: parseFloat(v.totalValue || 0),
        status
      };
    });

    res.json(vendors);
  } catch (error) {
    console.error('Error fetching vendors report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getInventoryReport = async (req, res) => {
  const { start, end } = req.query;
  // No reorder level is stored anywhere, so the page sends the threshold (default 50, as before)
  const minStock = Number.isFinite(parseFloat(req.query.minStock)) ? parseFloat(req.query.minStock) : 50;
  try {
    const [movements] = await db.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN actual_qty > 0 THEN actual_qty ELSE 0 END), 0) as received,
        COALESCE(SUM(CASE WHEN actual_qty < 0 THEN ABS(actual_qty) ELSE 0 END), 0) as issued
      FROM stock_ledger
      ${start && end ? 'WHERE posting_date BETWEEN ? AND ?' : ''}
    `, start && end ? [start, end] : []);

    const [items] = await db.query(`
      SELECT 
        item_code as code,
        material_name as description,
        SUM(actual_qty) as currentStock,
        ? as minStock,
        MAX(posting_date) as lastMovement
      FROM stock_ledger
      GROUP BY item_code, material_name
    `, [minStock]);

    const formattedItems = items.map(i => ({
      code: i.code,
      description: i.description || 'N/A',
      currentStock: parseFloat(i.currentStock || 0),
      minStock: parseFloat(i.minStock),
      lastMovement: i.lastMovement
    }));

    res.json({
      totalItems: formattedItems.length,
      itemsReceived: parseFloat(movements[0].received || 0),
      itemsIssued: parseFloat(movements[0].issued || 0),
      lowStockItems: formattedItems.filter(i => i.currentStock < i.minStock).length,
      negativeStockItems: formattedItems.filter(i => i.currentStock < 0).length,
      minStock,
      items: formattedItems
    });
  } catch (error) {
    console.error('Error fetching inventory report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getEmployeesReport = async (req, res) => {
  const { start, end } = req.query;
  try {
    let employeesQuery = `
      SELECT 
        u.id,
        u.full_name as name,
        u.department,
        u.department_id,
        u.designation,
        (SELECT COUNT(*) FROM department_tasks WHERE department_id = u.department_id ${start && end ? 'AND assignment_date BETWEEN ? AND ?' : ''}) as totalTasks,
        (SELECT COUNT(*) FROM department_tasks WHERE department_id = u.department_id AND status = 'Completed' ${start && end ? 'AND assignment_date BETWEEN ? AND ?' : ''}) as completedTasks,
        (SELECT COUNT(*) FROM department_tasks WHERE department_id = u.department_id AND status = 'Completed' AND (completed_date IS NULL OR DATE(completed_date) <= due_date) ${start && end ? 'AND assignment_date BETWEEN ? AND ?' : ''}) as onTimeTasks
      FROM users u
      WHERE u.role != 'employee'
      GROUP BY u.id, u.full_name, u.department, u.department_id, u.designation, u.role
    `;
    const params = start && end ? [start, end, start, end, start, end] : [];
    const [employeesList] = await db.query(employeesQuery, params);

    // 1. Project timeline stages per department
    const [rootCards] = await db.query('SELECT id, timelines FROM root_cards');
    const stageCompletion = await loadStageCompletion();

    const DEPT_TIMELINE_MAP = {
      2: 'Design',
      3: 'Production',
      4: 'Procurement',
      5: 'Quality',
      6: 'Inventory'
    };

    // completed = all completed stages; judged = completed stages that have a completion date;
    // onTime = completed on time (only completed stages count towards on-time)
    const emptyStats = () => ({ total: 0, completed: 0, judged: 0, onTime: 0, pendingOnTrack: 0, overdue: 0 });
    const timelineStats = {};
    Object.keys(DEPT_TIMELINE_MAP).forEach((deptId) => { timelineStats[deptId] = emptyStats(); });

    rootCards.forEach(rc => {
      const timelinesObj = parseTimelines(rc.timelines);
      if (!timelinesObj) return;

      Object.keys(DEPT_TIMELINE_MAP).forEach(deptId => {
        const stage = DEPT_TIMELINE_MAP[deptId];
        const dates = timelinesObj[stage];
        if (!dates || !dates.endDate) return;

        if (start && end) {
          const milestoneDateStr = toDateKey(dates.startDate || dates.endDate);
          if (!milestoneDateStr || milestoneDateStr < start || milestoneDateStr > end) return;
        }

        const stats = timelineStats[deptId];
        stats.total++;
        const stageInfo = stageCompletion[rc.id]?.[stage] || { completed: false, completedDate: null };
        const { state } = evaluateStage(stageInfo, dates.endDate);
        if (state.startsWith('completed')) stats.completed++;
        if (state === 'completed_on_time' || state === 'completed_late') stats.judged++;
        if (state === 'completed_on_time') stats.onTime++;
        if (state === 'pending_on_track') stats.pendingOnTrack++;
        if (state === 'overdue') stats.overdue++;
      });
    });

    const employees = employeesList.map(e => {
      const tasksTotal = e.totalTasks || 0;
      const tasksCompleted = e.completedTasks || 0;
      const tasksOnTime = e.onTimeTasks || 0;

      const tStats = timelineStats[e.department_id] || emptyStats();

      const totalDeliverables = tasksTotal + tStats.total;
      const completedDeliverables = tasksCompleted + tStats.completed;

      const efficiency = totalDeliverables > 0
        ? Math.round((completedDeliverables / totalDeliverables) * 100)
        : 100;

      // On-time rate only over completed work whose completion date is known (never above 100%)
      const judgedDeliverables = tasksCompleted + tStats.judged;
      const onTimeRate = judgedDeliverables > 0
        ? Math.min(1, (tasksOnTime + tStats.onTime) / judgedDeliverables)
        : 1.0;

      const qualityScore = parseFloat(Math.max(1.0, 5.0 - ((1.0 - onTimeRate) * 4)).toFixed(1));
      const rating = parseFloat((((efficiency / 20) + qualityScore) / 2).toFixed(1));

      return {
        id: e.id,
        name: e.name,
        department: e.department || 'N/A',
        designation: e.designation || 'N/A',
        tasksTotal,
        tasksCompleted,
        tasksOnTime,
        timelinesTotal: tStats.total,
        timelinesCompleted: tStats.completed,
        timelinesOnTime: tStats.onTime,
        timelinesPendingOnTrack: tStats.pendingOnTrack,
        timelinesOverdue: tStats.overdue,
        // Completed stages whose completion date is known (on-time % is measured over these)
        timelinesJudged: tStats.judged,
        // Sort key for the "Project On-Time" column
        projectOnTimeRate: tStats.judged > 0 ? Math.round((tStats.onTime / tStats.judged) * 100) : 100,
        efficiency,
        qualityScore,
        rating
      };
    });

    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getEmployeePerformance = async (req, res) => {
  const { id } = req.params;
  try {
    const [stats] = await db.query(`
      SELECT 
        u.full_name as name,
        u.department,
        u.designation,
        COUNT(dpu.id) as total_updates,
        SUM(dpu.qty_completed) as total_produced,
        AVG(dpu.scrap_qty) as avg_rejections
      FROM users u
      LEFT JOIN daily_production_updates dpu ON u.id = dpu.operator_id
      WHERE u.id = ?
      GROUP BY u.id
    `, [id]);

    const [trend] = await db.query(`
      SELECT 
        DATE_FORMAT(work_date, '%Y-%m-%d') as date,
        SUM(qty_completed) as count
      FROM daily_production_updates
      WHERE operator_id = ?
      AND work_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY work_date
      ORDER BY work_date ASC
    `, [id]);

    res.json({
      stats: stats[0] || {},
      trend: trend || []
    });
  } catch (error) {
    console.error('Error fetching employee performance:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getEmployeeDailyReports = async (req, res) => {
  const { id } = req.params;
  const { start, end } = req.query;
  try {
    const [users] = await db.query('SELECT role, department_id FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];

    if (user.role === 'employee') {
      let query = `
        SELECT 
          dpu.id,
          dpu.work_date,
          dpu.qty_completed as quantity_produced,
          dpu.scrap_qty as rejection_quantity,
          dpu.actual_hours,
          dpu.operation_name,
          dpu.status,
          rc.project_name,
          rc.project_code,
          rc.id as root_card_number
        FROM daily_production_updates dpu
        LEFT JOIN root_cards rc ON dpu.root_card_id = rc.id
        WHERE dpu.operator_id = ?
      `;
      const params = [id];

      if (start && end) {
        query += ` AND dpu.work_date BETWEEN ? AND ?`;
        params.push(start, end);
      }

      query += ` ORDER BY dpu.work_date DESC, dpu.created_at DESC`;
      const [reports] = await db.query(query, params);
      res.json(reports);
    } else {
      // 1. Fetch department tasks
      let taskQuery = `
        SELECT 
          t.id,
          t.task_code,
          t.title,
          t.description,
          t.priority,
          t.assignment_date as date,
          t.due_date,
          t.completed_date,
          t.status
        FROM department_tasks t
        WHERE t.department_id = ?
      `;
      const taskParams = [user.department_id || 0];

      if (start && end) {
        taskQuery += ` AND t.assignment_date BETWEEN ? AND ?`;
        taskParams.push(start, end);
      }

      taskQuery += ` ORDER BY t.assignment_date DESC`;
      const [tasks] = await db.query(taskQuery, taskParams);

      const mappedTasks = tasks.map(task => {
        const isCompleted = task.status === 'Completed' || task.status === 'COMPLETED';
        let delayStatus = 'On Time';
        if (isCompleted && task.completed_date) {
          const due = new Date(task.due_date);
          const comp = new Date(task.completed_date);
          if (comp > due) {
            delayStatus = 'Delayed';
          }
        } else if (!isCompleted) {
          const today = new Date();
          const due = new Date(task.due_date);
          if (today > due) {
            delayStatus = 'Overdue';
          } else {
            delayStatus = 'Pending';
          }
        }

        return {
          id: `task-${task.id}`,
          work_date: task.date,
          project_code: task.task_code || 'N/A',
          project_name: task.title,
          operation_name: `[Task] ${task.description || 'N/A'}`,
          qty_completed: isCompleted ? 1 : 0,
          scrap_qty: 0,
          actual_hours: 0,
          status: task.status,
          delay_status: delayStatus
        };
      });

      // 2. Fetch project timelines and map them
      const DEPT_TIMELINE_MAP = {
        2: { timelineKey: 'Design', stepKey: 'design_engineering' },
        3: { timelineKey: 'Production', stepKey: 'production' },
        4: { timelineKey: 'Procurement', stepKey: 'procurement' },
        5: { timelineKey: 'Quality', stepKey: 'quality' },
        6: { timelineKey: 'Inventory', stepKey: 'inventory' }
      };

      const timelineInfo = DEPT_TIMELINE_MAP[user.department_id];
      const mappedTimelines = [];

      if (timelineInfo) {
        const { timelineKey } = timelineInfo;
        const [rootCards] = await db.query('SELECT id, project_code, project_name, timelines FROM root_cards');
        const stageCompletion = await loadStageCompletion();
        const DELAY_LABELS = {
          completed_on_time: 'On Time',
          completed_undated: 'On Time',
          completed_late: 'Delayed',
          overdue: 'Overdue',
          pending_on_track: 'Pending'
        };

        rootCards.forEach(rc => {
          const timelinesObj = parseTimelines(rc.timelines);
          if (!timelinesObj) return;

          const dates = timelinesObj[timelineKey];
          if (dates && dates.endDate) {
            // Apply date filters if provided
            if (start && end) {
              const startDateStr = toDateKey(dates.startDate || dates.endDate);
              if (!startDateStr || startDateStr < start || startDateStr > end) return;
            }

            const stageInfo = stageCompletion[rc.id]?.[timelineKey] || { completed: false, completedDate: null };
            const isCompleted = stageInfo.completed;
            const delayStatus = DELAY_LABELS[evaluateStage(stageInfo, dates.endDate).state];

            mappedTimelines.push({
              id: `timeline-${rc.id}`,
              work_date: dates.startDate || dates.endDate,
              project_code: rc.project_code || `PRJ-${rc.id}`,
              project_name: rc.project_name,
              operation_name: `[Timeline Milestone] Department Stage: ${timelineKey}`,
              qty_completed: isCompleted ? 1 : 0,
              scrap_qty: 0,
              actual_hours: 0,
              status: isCompleted ? 'Completed' : 'Pending',
              delay_status: delayStatus
            });
          }
        });
      }

      const mergedList = [...mappedTasks, ...mappedTimelines].sort((a, b) => new Date(b.work_date) - new Date(a.work_date));
      res.json(mergedList);
    }
  } catch (error) {
    console.error('Error fetching employee daily reports:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getEmployeeWorkingHours = async (req, res) => {
  const { id } = req.params;
  const { start, end } = req.query;
  try {
    const [users] = await db.query('SELECT role, department_id FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];

    if (user.role === 'employee') {
      const [rows] = await db.query(`
        SELECT 
          work_date as date,
          SUM(actual_hours) as total_hours,
          COUNT(id) as production_count
        FROM daily_production_updates
        WHERE operator_id = ?
        AND work_date BETWEEN ? AND ?
        GROUP BY work_date
        ORDER BY work_date DESC
      `, [id, start, end]);

      const [total] = await db.query(`
        SELECT SUM(actual_hours) as total_hours
        FROM daily_production_updates
        WHERE operator_id = ?
        AND work_date BETWEEN ? AND ?
      `, [id, start, end]);

      res.json({
        daily: rows,
        total_hours: total[0].total_hours || 0
      });
    } else {
      const [tasks] = await db.query(`
        SELECT 
          assignment_date as date,
          COUNT(*) as task_count,
          SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_count
        FROM department_tasks
        WHERE department_id = ?
        AND assignment_date BETWEEN ? AND ?
        GROUP BY assignment_date
        ORDER BY assignment_date DESC
      `, [user.department_id || 0, start, end]);

      const DEPT_TIMELINE_MAP = {
        2: { timelineKey: 'Design', stepKey: 'design_engineering' },
        3: { timelineKey: 'Production', stepKey: 'production' },
        4: { timelineKey: 'Procurement', stepKey: 'procurement' },
        5: { timelineKey: 'Quality', stepKey: 'quality' },
        6: { timelineKey: 'Inventory', stepKey: 'inventory' }
      };

      const timelineInfo = DEPT_TIMELINE_MAP[user.department_id];
      const dailyMap = {};

      tasks.forEach(t => {
        const dateStr = new Date(t.date).toISOString().split('T')[0];
        dailyMap[dateStr] = {
          task_count: t.task_count,
          completed_count: t.completed_count
        };
      });

      let totalTimelines = 0;
      let completedTimelines = 0;
      let onTimeTimelines = 0;
      let judgedTimelines = 0;

      if (timelineInfo) {
        const { timelineKey } = timelineInfo;
        const [rootCards] = await db.query('SELECT id, timelines FROM root_cards');
        const stageCompletion = await loadStageCompletion();

        rootCards.forEach(rc => {
          const timelinesObj = parseTimelines(rc.timelines);
          if (!timelinesObj) return;

          const dates = timelinesObj[timelineKey];
          if (dates && dates.endDate) {
            const dateStr = toDateKey(dates.startDate || dates.endDate);
            if (dateStr && dateStr >= start && dateStr <= end) {
              totalTimelines++;
              const stageInfo = stageCompletion[rc.id]?.[timelineKey] || { completed: false, completedDate: null };
              const isCompleted = stageInfo.completed;
              if (isCompleted) {
                completedTimelines++;
              }

              // On-time: only completed stages with a known completion date count
              const stageState = evaluateStage(stageInfo, dates.endDate).state;
              if (stageState === 'completed_on_time' || stageState === 'completed_late') {
                judgedTimelines++;
              }
              if (stageState === 'completed_on_time') {
                onTimeTimelines++;
              }

              if (!dailyMap[dateStr]) {
                dailyMap[dateStr] = { task_count: 0, completed_count: 0 };
              }
              dailyMap[dateStr].task_count++;
              if (isCompleted) {
                dailyMap[dateStr].completed_count++;
              }
            }
          }
        });
      }

      const dailyArray = Object.keys(dailyMap).map(dateStr => ({
        date: dateStr,
        total_hours: dailyMap[dateStr].task_count * 8, 
        production_count: dailyMap[dateStr].completed_count
      })).sort((a, b) => new Date(b.date) - new Date(a.date));

      const [totalTasks] = await db.query(`
        SELECT COUNT(*) as total_tasks, SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_tasks
        FROM department_tasks
        WHERE department_id = ?
        AND assignment_date BETWEEN ? AND ?
      `, [user.department_id || 0, start, end]);

      const tasksTotal = totalTasks[0].total_tasks || 0;
      const tasksCompleted = totalTasks[0].completed_tasks || 0;

      res.json({
        daily: dailyArray,
        total_hours: (tasksTotal + totalTimelines) * 8,
        total_tasks: tasksTotal + totalTimelines,
        completed_tasks: tasksCompleted + completedTimelines,
        tasksTotal,
        tasksCompleted,
        timelinesTotal: totalTimelines,
        timelinesCompleted: completedTimelines,
        timelinesOnTime: onTimeTimelines,
        timelinesJudged: judgedTimelines
      });
    }
  } catch (error) {
    console.error('Error fetching employee working hours:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getDesignEngineerReport = async (req, res) => {
  try {
    const userId = req.user.id;

    const [totalDesigns] = await db.query(
      "SELECT COUNT(*) as count FROM design_documents WHERE created_by = ?",
      [userId]
    );

    const [activeProjects] = await db.query(
      "SELECT COUNT(DISTINCT root_card_id) as count FROM root_card_steps WHERE assigned_to = ? AND status != 'completed'",
      [userId]
    );

    const [approvalStats] = await db.query(
      "SELECT COUNT(*) as total, SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved FROM design_documents WHERE created_by = ?",
      [userId]
    );
    const approvalRate = approvalStats[0].total > 0 
      ? Math.round((approvalStats[0].approved / approvalStats[0].total) * 100) 
      : 100;

    const avgReviewTime = "2.5 days";

    const [recentActivity] = await db.query(
      "SELECT action, timestamp as time FROM audit_logs WHERE user_name = (SELECT full_name FROM users WHERE id = ?) ORDER BY timestamp DESC LIMIT 5",
      [userId]
    );

    res.json({
      stats: [
        { label: "Total Designs", value: totalDesigns[0].count.toString(), change: "Overall" },
        { label: "Avg Review Time", value: avgReviewTime, change: "Current" },
        { label: "Approval Rate", value: `${approvalRate}%`, change: "Quality" },
        { label: "Active Projects", value: activeProjects[0].count.toString(), change: "Workload" },
      ],
      recentActivity: recentActivity.map(a => ({
        action: a.action,
        time: new Date(a.time).toLocaleString()
      }))
    });
  } catch (error) {
    console.error('Error fetching design engineer report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getOperatorLogsReport = async (req, res) => {
  const { start, end } = req.query;
  try {
    const [rows] = await db.query(`
      SELECT 
        dpu.id,
        dpu.work_date,
        dpu.operator_name,
        dpu.operation_name,
        dpu.actual_hours,
        dpu.qty_completed,
        dpu.scrap_qty,
        dpu.status,
        dpu.remarks,
        rc.project_code,
        rc.project_name,
        rc.id as root_card_id
      FROM daily_production_updates dpu
      LEFT JOIN root_cards rc ON dpu.root_card_id = rc.id
      ${start && end ? 'WHERE dpu.work_date BETWEEN ? AND ?' : ''}
      ORDER BY dpu.work_date DESC, dpu.id DESC
    `, start && end ? [start, end] : []);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching operator logs report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getProjectManhoursReport = async (req, res) => {
  const { start, end } = req.query;
  try {
    let dateWhere = '';
    let params = [];
    if (start && end) {
      dateWhere = 'WHERE dpu.work_date BETWEEN ? AND ?';
      params = [start, end];
    }

    const [rows] = await db.query(`
      SELECT 
        rc.id as root_card_id,
        rc.project_code,
        rc.project_name,
        rc.status as project_status,
        COALESCE(SUM(dpu.actual_hours), 0) as total_hours,
        COUNT(dpu.id) as total_logs,
        COALESCE(SUM(dpu.qty_completed), 0) as total_qty,
        COALESCE(SUM(dpu.scrap_qty), 0) as total_scrap
      FROM root_cards rc
      JOIN daily_production_updates dpu ON rc.id = dpu.root_card_id
      ${dateWhere}
      GROUP BY rc.id, rc.project_code, rc.project_name, rc.status
      ORDER BY total_hours DESC
    `, params);

    if (rows.length === 0) {
      return res.json([]);
    }

    await ensureHourlyRateColumn();

    // Fetch operator breakdown per project
    const [operatorRows] = await db.query(`
      SELECT 
        dpu.root_card_id,
        dpu.operator_id,
        COALESCE(u.full_name, dpu.operator_name, 'Unknown Operator') as operator_name,
        u.department,
        u.designation,
        COALESCE(u.hourly_rate, 0) as hourly_rate,
        COALESCE(SUM(dpu.actual_hours), 0) as total_hours,
        COUNT(dpu.id) as total_logs,
        COALESCE(SUM(dpu.qty_completed), 0) as total_qty,
        COALESCE(SUM(dpu.scrap_qty), 0) as total_scrap,
        GROUP_CONCAT(DISTINCT COALESCE(dpu.operation_name, 'General') SEPARATOR ', ') as operations,
        MAX(dpu.work_date) as last_work_date
      FROM daily_production_updates dpu
      LEFT JOIN users u ON dpu.operator_id = u.id
      ${dateWhere}
      GROUP BY dpu.root_card_id, dpu.operator_id, COALESCE(u.full_name, dpu.operator_name, 'Unknown Operator'), u.department, u.designation, COALESCE(u.hourly_rate, 0)
      ORDER BY total_hours DESC
    `, params);

    // Fetch individual work logs per project
    const [logRows] = await db.query(`
      SELECT 
        dpu.id,
        dpu.root_card_id,
        dpu.work_date,
        dpu.operator_id,
        COALESCE(u.full_name, dpu.operator_name, 'Unknown Operator') as operator_name,
        dpu.operation_name,
        dpu.actual_hours,
        dpu.qty_completed,
        dpu.scrap_qty,
        dpu.status,
        dpu.remarks
      FROM daily_production_updates dpu
      LEFT JOIN users u ON dpu.operator_id = u.id
      ${dateWhere}
      ORDER BY dpu.work_date DESC, dpu.id DESC
    `, params);

    const operatorMap = {};
    operatorRows.forEach(op => {
      const key = String(op.root_card_id);
      if (!operatorMap[key]) {
        operatorMap[key] = [];
      }
      operatorMap[key].push(op);
    });

    const logMap = {};
    logRows.forEach(log => {
      const key = String(log.root_card_id);
      if (!logMap[key]) {
        logMap[key] = [];
      }
      logMap[key].push(log);
    });

    const result = rows.map(project => {
      const key = String(project.root_card_id);
      return {
        ...project,
        operators: operatorMap[key] || [],
        work_logs: logMap[key] || []
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching project manhours report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const ensureHourlyRateColumn = async () => {
  try {
    const [cols] = await db.query("SHOW COLUMNS FROM users LIKE 'hourly_rate'");
    if (cols.length === 0) {
      await db.query("ALTER TABLE users ADD COLUMN hourly_rate DECIMAL(10, 2) DEFAULT 0.00");
    }
  } catch (err) {
    console.error('Error checking/adding hourly_rate column to users table:', err);
  }
};

const updateOperatorRates = async (req, res) => {
  try {
    const { rates } = req.body;
    if (!rates) {
      return res.status(400).json({ message: 'Rates data is required' });
    }

    await ensureHourlyRateColumn();

    let rateEntries = [];
    if (Array.isArray(rates)) {
      rateEntries = rates;
    } else {
      rateEntries = Object.entries(rates).map(([key, hourly_rate]) => {
        const parts = String(key).split('_');
        const operator_id = parts.length > 1 ? parts[1] : parts[0];
        return {
          operator_id: parseInt(operator_id, 10),
          hourly_rate: parseFloat(hourly_rate || 0)
        };
      });
    }

    // Rates live on the users table; report operators that could not be saved instead of claiming success
    const notSaved = [];
    for (const entry of rateEntries) {
      const rate = parseFloat(entry.hourly_rate || 0);
      let result = null;
      if (entry.operator_id && !isNaN(entry.operator_id)) {
        [result] = await db.query('UPDATE users SET hourly_rate = ? WHERE id = ?', [rate, entry.operator_id]);
      }
      if ((!result || result.affectedRows === 0) && entry.operator_name) {
        const [matches] = await db.query('SELECT id FROM users WHERE full_name = ?', [entry.operator_name]);
        if (matches.length === 1) {
          [result] = await db.query('UPDATE users SET hourly_rate = ? WHERE id = ?', [rate, matches[0].id]);
        }
      }
      if (!result || result.affectedRows === 0) {
        notSaved.push(entry.operator_name || `Operator #${entry.operator_id}`);
      }
    }

    if (notSaved.length > 0) {
      return res.status(207).json({
        message: `Rates saved, except for operators not found in the user list: ${notSaved.join(', ')}`,
        notSaved
      });
    }
    res.json({ message: 'Operator rates updated successfully', notSaved: [] });
  } catch (error) {
    console.error('Error updating operator rates:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getOverviewReport,
  getProjectsReport,
  getDepartmentsReport,
  getVendorsReport,
  getInventoryReport,
  getEmployeesReport,
  getEmployeePerformance,
  getEmployeeDailyReports,
  getEmployeeWorkingHours,
  getDesignEngineerReport,
  getOperatorLogsReport,
  getProjectManhoursReport,
  updateOperatorRates
};

