const db = require('../config/db');
const bcrypt = require('bcryptjs');

const getDashboardStats = async (req, res) => {
  try {
    const [projectStats] = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status NOT IN ('READY_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'ON_HOLD') AND (priority != 'critical' OR priority IS NULL) THEN 1 END) as in_progress,
        COUNT(CASE WHEN status IN ('READY_FOR_DELIVERY', 'DELIVERED') THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'ON_HOLD' THEN 1 END) as on_hold,
        COUNT(CASE WHEN priority = 'critical' AND status NOT IN ('READY_FOR_DELIVERY', 'DELIVERED', 'CANCELLED') THEN 1 END) as critical
      FROM root_cards
    `);

    const [userStats] = await db.query('SELECT COUNT(*) as total FROM users');
    const [poStats] = await db.query('SELECT COUNT(*) as total FROM purchase_orders');

    // Department Analytics - improved to include all departments from users
    const [deptAnalytics] = await db.query(`
      SELECT 
        d.name,
        COUNT(DISTINCT u.id) as employeeCount,
        COUNT(dpu.id) as taskCount
      FROM (
        SELECT 'Admin' as name UNION SELECT 'Design Engineer' UNION SELECT 'Production' UNION 
        SELECT 'Procurement' UNION SELECT 'Quality' UNION SELECT 'Inventory' UNION SELECT 'Accountant'
      ) d
      LEFT JOIN users u ON (
        CASE 
          WHEN u.department = 'admin' THEN 'Admin'
          WHEN u.department = 'design_engineer' THEN 'Design Engineer'
          WHEN u.department = 'production' THEN 'Production'
          WHEN u.department = 'procurement' THEN 'Procurement'
          WHEN u.department = 'quality' THEN 'Quality'
          WHEN u.department = 'inventory' THEN 'Inventory'
          WHEN u.department = 'accountant' THEN 'Accountant'
          ELSE u.department 
        END = d.name
      )
      LEFT JOIN daily_production_updates dpu ON u.id = dpu.operator_id
      GROUP BY d.name
    `);

    // Monthly Trends (last 6 months) - improved grouping
    const [monthlyTrends] = await db.query(`
      SELECT 
        DATE_FORMAT(updated_at, '%b') as month,
        COUNT(*) as completedCount,
        DATE_FORMAT(updated_at, '%Y-%m') as sort_key
      FROM root_cards
      WHERE status IN ('READY_FOR_DELIVERY', 'DELIVERED') 
      AND updated_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY sort_key, month
      ORDER BY sort_key ASC
    `);

    // Material Consumption Analytics
    const [materialConsumption] = await db.query(`
      SELECT 
        material_name as name,
        ABS(SUM(actual_qty)) as totalQuantity
      FROM stock_ledger
      WHERE actual_qty < 0
      GROUP BY material_name
      ORDER BY totalQuantity DESC
      LIMIT 5
    `);

    // Operations Analytics
    const [operationStats] = await db.query(`
      SELECT 
        operation_name as name,
        COUNT(*) as count
      FROM daily_production_updates
      GROUP BY operation_name
      ORDER BY count DESC
      LIMIT 8
    `);
    
    // Recent Project Progress
    const [recentProjects] = await db.query(`
      SELECT 
        project_name,
        project_code,
        status,
        CASE 
          WHEN status = 'RC_CREATED' THEN 5
          WHEN status = 'DESIGN_IN_PROGRESS' THEN 10
          WHEN status = 'DESIGN_APPROVED' THEN 20
          WHEN status = 'BOM_PREPARATION' THEN 30
          WHEN status = 'MATERIAL_PLANNING' THEN 40
          WHEN status = 'MATERIAL_RELEASED' THEN 45
          WHEN status = 'PURCHASE_ORDER_RELEASED' THEN 50
          WHEN status = 'PROCUREMENT_IN_PROGRESS' THEN 55
          WHEN status = 'MATERIAL_RECEIVED' THEN 60
          WHEN status = 'MATERIAL_QC_PENDING' THEN 65
          WHEN status = 'MATERIAL_QC_APPROVED' THEN 70
          WHEN status = 'PRODUCTION_IN_PROGRESS' THEN 80
          WHEN status = 'DIMENSIONAL_QC_PENDING' THEN 85
          WHEN status = 'DIMENSIONAL_QC_APPROVED' THEN 90
          WHEN status = 'PAINTING_IN_PROGRESS' THEN 95
          WHEN status = 'FINAL_QC_PENDING' THEN 97
          WHEN status = 'FINAL_QC_APPROVED' THEN 99
          WHEN status = 'READY_FOR_DELIVERY' THEN 100
          WHEN status = 'DELIVERED' THEN 100
          ELSE 10 
        END as progress
      FROM root_cards
      ORDER BY updated_at DESC
      LIMIT 6
    `);

    res.json({
      kpis: {
        total_projects: projectStats[0].total,
        active_projects: projectStats[0].in_progress,
        completed_projects: projectStats[0].completed,
        critical_alerts: projectStats[0].critical,
        total_users: userStats[0].total,
        total_orders: poStats[0].total
      },
      projectStatus: {
        onTrack: projectStats[0].in_progress,
        delayed: projectStats[0].on_hold,
        critical: projectStats[0].critical,
        completed: projectStats[0].completed
      },
      deptAnalytics,
      monthlyTrends,
      materialConsumption,
      operationStats,
      recentProjects
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getEmployeeList = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, full_name as fullName, first_name as firstName, last_name as lastName, email, designation, department, department_id as departmentId, role, role_id as roleId, login_id as loginId, actions FROM users WHERE role = 'employee' ORDER BY full_name ASC");
    
    // Parse actions if they are stored as JSON string
    const employees = rows.map(emp => {
      let actions = [];
      try {
        actions = typeof emp.actions === 'string' ? JSON.parse(emp.actions) : (emp.actions || []);
      } catch (e) {
        console.error('Error parsing actions for user:', emp.id, e);
      }
      return {
        ...emp,
        actions
      };
    });
    
    res.json(employees);
  } catch (error) {
    console.error('Error fetching employee list:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createEmployee = async (req, res) => {
  const { firstName, lastName, email, designation, department, departmentId, roleId, loginId, password, actions } = req.body;

  try {
    // Check if user exists
    const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ? OR login_id = ?', [email, loginId]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User with this email or login ID already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const fullName = `${firstName} ${lastName}`;
    const role = 'employee'; // Fixed as per user request

    const [result] = await db.query(
      `INSERT INTO users (full_name, first_name, last_name, email, password, designation, department, department_id, role, role_id, login_id, actions) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [fullName, firstName, lastName, email, hashedPassword, designation, department, departmentId, role, roleId, loginId, JSON.stringify(actions || [])]
    );

    res.status(201).json({ 
      message: 'Employee created successfully', 
      id: result.insertId 
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateEmployee = async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, designation, department, departmentId, roleId, loginId, password, actions } = req.body;

  try {
    const fullName = `${firstName} ${lastName}`;
    
    let query = `
      UPDATE users 
      SET full_name = ?, first_name = ?, last_name = ?, email = ?, designation = ?, 
          department = ?, department_id = ?, role_id = ?, actions = ?
    `;
    const params = [fullName, firstName, lastName, email, designation, department, departmentId, roleId, JSON.stringify(actions || [])];

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      query += `, password = ?`;
      params.push(hashedPassword);
    }

    query += ` WHERE id = ?`;
    params.push(id);

    await db.query(query, params);
    res.json({ message: 'Employee updated successfully' });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteEmployee = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getRoles = async (req, res) => {
  try {
    const [roles] = await db.query(`
      SELECT r.*, 
      (SELECT COUNT(*) FROM users u WHERE u.role_id = r.id) as userCount,
      (SELECT GROUP_CONCAT(permission_id) FROM role_permissions rp WHERE rp.role_id = r.id) as permissions
      FROM roles r
      ORDER BY r.name ASC
    `);

    const formattedRoles = roles.map(role => ({
      ...role,
      permissions: role.permissions ? role.permissions.split(',').map(Number) : [],
      is_active: !!role.is_active
    }));

    res.json({ roles: formattedRoles });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createRole = async (req, res) => {
  const { name, description, permissions } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO roles (name, description) VALUES (?, ?)',
      [name, description]
    );
    const roleId = result.insertId;

    if (permissions && permissions.length > 0) {
      const values = permissions.map(pId => [roleId, pId]);
      await db.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ?', [values]);
    }

    res.status(201).json({ message: 'Role created successfully', id: roleId });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateRole = async (req, res) => {
  const { id } = req.params;
  const { name, description, permissions } = req.body;
  try {
    await db.query(
      'UPDATE roles SET name = ?, description = ? WHERE id = ?',
      [name, description, id]
    );

    // Update permissions: delete old ones and insert new ones
    await db.query('DELETE FROM role_permissions WHERE role_id = ?', [id]);
    if (permissions && permissions.length > 0) {
      const values = permissions.map(pId => [id, pId]);
      await db.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ?', [values]);
    }

    res.json({ message: 'Role updated successfully' });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteRole = async (req, res) => {
  const { id } = req.params;
  try {
    // Check if role is assigned to any user
    const [users] = await db.query('SELECT id FROM users WHERE role_id = ? LIMIT 1', [id]);
    if (users.length > 0) {
      return res.status(400).json({ message: 'Cannot delete role as it is assigned to one or more users' });
    }

    await db.query('DELETE FROM roles WHERE id = ?', [id]);
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateRoleStatus = async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  try {
    await db.query('UPDATE roles SET is_active = ? WHERE id = ?', [is_active, id]);
    res.json({ message: 'Role status updated successfully' });
  } catch (error) {
    console.error('Error updating role status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getPermissions = async (req, res) => {
  try {
    const [permissions] = await db.query('SELECT * FROM permissions ORDER BY name ASC');
    res.json(permissions);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getDesignations = async (req, res) => {
  // Hardcoded designations
  const designations = [
    { id: 1, name: 'Design Engineer' },
    { id: 2, name: 'Production Head' },
    { id: 3, name: 'Quality Inspector' },
    { id: 4, name: 'Procurement Officer' },
    { id: 5, name: 'Inventory Manager' },
    { id: 6, name: 'Accountant' },
    { id: 7, name: 'Worker' }
  ];
  res.json({ designations }); // Ensure it matches what frontend expects
};

const sendCredentials = async (req, res) => {
  // Mock sending email
  const { email, loginId, password, name } = req.body;
  console.log(`Sending credentials to ${email}: LoginID: ${loginId}, Password: ${password}`);
  res.json({ message: `Registration email sent to ${email}` });
};

const getDepartments = async (req, res) => {
  // Hardcoded departments
  const departments = [
    { id: 1, name: 'Admin' },
    { id: 2, name: 'Design Engineer' },
    { id: 3, name: 'Production' },
    { id: 4, name: 'Procurement' },
    { id: 5, name: 'Quality' },
    { id: 6, name: 'Inventory' },
    { id: 7, name: 'Accountant' }
  ];
  res.json(departments);
};

const getAuditLogs = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM audit_logs ORDER BY timestamp DESC');
    res.json(rows.map(log => ({
      id: log.id,
      user: log.user_name,
      action: log.action,
      type: log.type,
      details: log.details,
      timestamp: log.timestamp,
      ipAddress: log.ip_address,
      status: log.status
    })));
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getEmployeeList,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  updateRoleStatus,
  getPermissions,
  getDesignations,
  getDepartments,
  sendCredentials,
  getAuditLogs
};
