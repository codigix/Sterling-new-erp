const db = require('../config/db');

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
  const { start, end } = req.query;
  try {
    const [projects] = await db.query(`
      SELECT 
        id, 
        project_name as name, 
        status, 
        COALESCE(
          (SELECT (COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100 / COUNT(*)) 
           FROM root_card_steps WHERE root_card_id = root_cards.id), 
          0
        ) as progress,
        created_at as startDate,
        delivery_date as expectedCompletion,
        CASE 
          WHEN status IN ('COMPLETED', 'READY_FOR_DELIVERY', 'DELIVERED', 'Completed') THEN 
            CASE WHEN DATE(updated_at) <= delivery_date THEN 1 ELSE 0 END
          ELSE 
            CASE WHEN CURDATE() <= delivery_date THEN 1 ELSE 0 END
        END as onTime
      FROM root_cards
      WHERE created_at BETWEEN ? AND ?
      ORDER BY created_at DESC
    `, [start, end]);

    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getDepartmentsReport = async (req, res) => {
  const { projectId } = req.query;
  try {
    // 1. Fetch all projects to populate select dropdown on frontend
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

        const stepKeyMap = {
          Design: 'design_engineering',
          Production: 'production',
          Procurement: 'procurement',
          Inventory: 'inventory',
          Quality: 'quality'
        };

        // Query step statuses for this root card
        const [steps] = await db.query(`
          SELECT step_key, status, updated_at 
          FROM root_card_steps 
          WHERE root_card_id = ?
        `, [projectId]);

        const stepMap = {};
        steps.forEach(s => {
          stepMap[s.step_key] = {
            status: s.status,
            completed_date: s.updated_at
          };
        });

        const departments = ['Design', 'Production', 'Procurement', 'Inventory', 'Quality'];
        const timelineReport = departments.map(dept => {
          const stepKey = stepKeyMap[dept];
          const stepInfo = stepMap[stepKey] || { status: 'pending', completed_date: null };
          
          const dates = (timelinesObj && timelinesObj[dept]) ? timelinesObj[dept] : null;
          
          let status = 'Not Assigned';
          let delayDays = 0;

          if (dates && dates.endDate) {
            const end = new Date(dates.endDate);
            end.setHours(23, 59, 59, 999); // end of the target day

            if (stepInfo.status === 'completed' || stepInfo.status === 'Completed') {
              const compDate = new Date(stepInfo.completed_date);
              if (compDate <= end) {
                status = 'Completed On Time';
              } else {
                status = 'Completed with Delay';
                delayDays = Math.ceil((compDate.getTime() - end.getTime()) / (1000 * 3600 * 24));
              }
            } else {
              // Not completed yet
              const today = new Date();
              if (today > end) {
                status = 'Overdue';
                delayDays = Math.ceil((today.getTime() - end.getTime()) / (1000 * 3600 * 24));
              } else {
                status = 'Pending (On Time)';
              }
            }
          }

          return {
            department: dept,
            startDate: dates ? dates.startDate : null,
            endDate: dates ? dates.endDate : null,
            completedDate: (stepInfo.status === 'completed' || stepInfo.status === 'Completed') ? stepInfo.completed_date : null,
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
    console.error('Error fetching departments report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getVendorsReport = async (req, res) => {
  try {
    const [vendorsList] = await db.query(`
      SELECT 
        v.id,
        v.name,
        (SELECT COUNT(*) FROM purchase_orders WHERE vendor_id = v.id AND status != 'Cancelled') as totalOrders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM purchase_orders WHERE vendor_id = v.id AND status != 'Cancelled') as totalValue,
        (SELECT COUNT(*) FROM grns grn 
         JOIN purchase_orders po ON grn.purchase_order_id = po.id
         WHERE po.vendor_id = v.id AND grn.status = 'completed') as totalGRNs,
         (SELECT COUNT(*) FROM grns grn 
          JOIN purchase_orders po ON grn.purchase_order_id = po.id
          WHERE po.vendor_id = v.id AND grn.status = 'completed' AND DATE(grn.posting_date) <= po.expected_delivery_date) as onTimeGRNs
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
  try {
    const [movements] = await db.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN actual_qty > 0 THEN actual_qty ELSE 0 END), 0) as received,
        COALESCE(SUM(CASE WHEN actual_qty < 0 THEN ABS(actual_qty) ELSE 0 END), 0) as issued
      FROM stock_ledger
      WHERE posting_date BETWEEN ? AND ?
    `, [start, end]);

    const [items] = await db.query(`
      SELECT 
        item_code as code,
        material_name as description,
        SUM(actual_qty) as currentStock,
        50 as minStock,
        MAX(posting_date) as lastMovement
      FROM stock_ledger
      GROUP BY item_code, material_name
    `);

    const formattedItems = items.map(i => ({
      code: i.code,
      description: i.description || 'N/A',
      currentStock: parseFloat(i.currentStock || 0),
      minStock: i.minStock,
      lastMovement: i.lastMovement
    }));

    res.json({
      totalItems: formattedItems.length,
      itemsReceived: parseFloat(movements[0].received || 0),
      itemsIssued: parseFloat(movements[0].issued || 0),
      lowStockItems: formattedItems.filter(i => i.currentStock < i.minStock).length,
      items: formattedItems
    });
  } catch (error) {
    console.error('Error fetching inventory report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getEmployeesReport = async (req, res) => {
  try {
    const [employeesList] = await db.query(`
      SELECT 
        u.id,
        u.full_name as name,
        u.department,
        u.designation,
        COUNT(dpu.id) as totalTasks,
        COUNT(CASE WHEN dpu.status = 'Completed' THEN 1 END) as completedTasks,
        COALESCE(SUM(dpu.qty_completed), 0) as totalQtyCompleted,
        COALESCE(SUM(dpu.scrap_qty), 0) as totalScrap,
        COALESCE(SUM(dpu.actual_hours), 0) as totalHours
      FROM users u
      LEFT JOIN daily_production_updates dpu ON u.id = dpu.operator_id
      WHERE u.role = 'employee' OR (u.department IS NOT NULL AND LOWER(u.department) != 'admin')
      GROUP BY u.id, u.full_name, u.department, u.designation
    `);

    const employees = employeesList.map(e => {
      const totalTasks = e.totalTasks || 0;
      const completedTasks = e.completedTasks || 0;
      const efficiency = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

      // Quality Score (1.0 to 5.0) based on scrap rate
      const scrap = parseFloat(e.totalScrap || 0);
      const completed = parseFloat(e.totalQtyCompleted || 0);
      const totalQty = completed + scrap;
      const scrapRate = totalQty > 0 ? (scrap / totalQty) : 0;
      const qualityScore = parseFloat(Math.max(1.0, 5.0 - (scrapRate * 5.0)).toFixed(1));

      // Attendance % based on logged hours
      const hours = parseFloat(e.totalHours || 0);
      const attendance = hours > 0 ? Math.min(100, Math.round(90 + (hours / 10))) : 95;

      // Performance Rating: overall average rating
      const rating = parseFloat((((efficiency / 20) + qualityScore) / 2).toFixed(1));

      return {
        id: e.id,
        name: e.name,
        department: e.department || 'N/A',
        designation: e.designation || 'N/A',
        tasksCompleted: completedTasks,
        efficiency,
        qualityScore,
        attendance,
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
  try {
    const [reports] = await db.query(`
      SELECT 
        dpu.*,
        dpu.qty_completed as quantity_produced,
        dpu.scrap_qty as rejection_quantity,
        rc.project_name,
        rc.project_code,
        rc.id as root_card_number
      FROM daily_production_updates dpu
      LEFT JOIN root_cards rc ON dpu.root_card_id = rc.id
      WHERE dpu.operator_id = ?
      ORDER BY dpu.work_date DESC, dpu.created_at DESC
      LIMIT 50
    `, [id]);

    res.json(reports);
  } catch (error) {
    console.error('Error fetching employee daily reports:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getEmployeeWorkingHours = async (req, res) => {
  const { id } = req.params;
  const { start, end } = req.query;
  try {
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
      WHERE dpu.work_date BETWEEN ? AND ?
      ORDER BY dpu.work_date DESC, dpu.id DESC
    `, [start, end]);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching operator logs report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getProjectManhoursReport = async (req, res) => {
  const { start, end } = req.query;
  try {
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
      WHERE dpu.work_date BETWEEN ? AND ?
      GROUP BY rc.id, rc.project_code, rc.project_name, rc.status
      ORDER BY total_hours DESC
    `, [start, end]);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching project manhours report:', error);
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
  getProjectManhoursReport
};

