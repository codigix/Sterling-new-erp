const db = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { logAudit } = require('../utils/auditLogger');

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

    // Get all admin assigned departmental tasks for filtering and stats
    const [tasks] = await db.query(`
      SELECT id, department_id, status, due_date, completed_date, updated_at
      FROM department_tasks
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
      monthlyTrends,
      materialConsumption,
      operationStats,
      recentProjects,
      tasks
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getEmployeeList = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, full_name as fullName, first_name as firstName, last_name as lastName, email, designation, department, department_id as departmentId, role, role_id as roleId, login_id as loginId, actions, status FROM users ORDER BY full_name ASC");
    
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
  const { firstName, lastName, email, department, departmentId, isLoginUser, password, status, designation } = req.body;

  try {
    // Check if user exists
    const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    let userRole = 'employee';
    let userRoleId = 2; // Default Employee role in roles table
    let loginId = null;
    let finalPassword = password;

    if (isLoginUser) {
      // Map department to Role and RoleId
      const departmentMap = {
        'Admin': { id: 1, role: 'admin' },
        'Design Engineer': { id: 2, role: 'design_engineer' },
        'Production': { id: 3, role: 'production' },
        'Procurement': { id: 4, role: 'procurement' },
        'Quality': { id: 5, role: 'quality' },
        'Inventory': { id: 6, role: 'inventory' },
        'Accountant': { id: 7, role: 'accountant' },
        'admin': { id: 1, role: 'admin' },
        'design_engineer': { id: 2, role: 'design_engineer' },
        'production': { id: 3, role: 'production' },
        'procurement': { id: 4, role: 'procurement' },
        'quality': { id: 5, role: 'quality' },
        'inventory': { id: 6, role: 'inventory' },
        'accountant': { id: 7, role: 'accountant' }
      };
      
      const deptInfo = departmentMap[department] || { id: null, role: department.toLowerCase().replace(/\s+/g, '_') };
      userRole = deptInfo.role;
      userRoleId = null; // Login users have role_id = null based on existing data
      loginId = null;
    } else {
      // Daily employee - auto-generate unique login ID format: firstname.lastname
      loginId = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
      const [existingLoginId] = await db.query('SELECT * FROM users WHERE login_id = ?', [loginId]);
      if (existingLoginId.length > 0) {
        loginId = `${loginId}${Math.floor(100 + Math.random() * 900)}`;
      }
      // Generate dummy password for daily workers
      finalPassword = Math.random().toString(36) + Math.random().toString(36);
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(finalPassword, salt);

    const fullName = `${firstName} ${lastName}`;

    const [result] = await db.query(
      `INSERT INTO users (full_name, first_name, last_name, email, password, designation, department, department_id, role, role_id, login_id, actions, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [fullName, firstName, lastName, email, hashedPassword, designation || null, department, departmentId, userRole, userRoleId, loginId, '[]', status || 'active']
    );

    const auditAction = isLoginUser ? 'Create Login User' : 'Create Employee';
    const auditDetail = isLoginUser ? `New department login user created: ${fullName} (${userRole})` : `New employee created: ${fullName}`;
    await logAudit(req.user?.fullName || 'Admin', auditAction, 'account', auditDetail, req.ip, 'success');

    res.status(201).json({ 
      message: isLoginUser ? 'Login user created successfully' : 'Employee created successfully', 
      id: result.insertId 
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateEmployee = async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, department, departmentId, isLoginUser, password, status, designation } = req.body;

  try {
    const fullName = `${firstName} ${lastName}`;
    
    let userRole = 'employee';
    let userRoleId = 2;
    let loginId = null;

    if (isLoginUser) {
      const departmentMap = {
        'Admin': { id: 1, role: 'admin' },
        'Design Engineer': { id: 2, role: 'design_engineer' },
        'Production': { id: 3, role: 'production' },
        'Procurement': { id: 4, role: 'procurement' },
        'Quality': { id: 5, role: 'quality' },
        'Inventory': { id: 6, role: 'inventory' },
        'Accountant': { id: 7, role: 'accountant' },
        'admin': { id: 1, role: 'admin' },
        'design_engineer': { id: 2, role: 'design_engineer' },
        'production': { id: 3, role: 'production' },
        'procurement': { id: 4, role: 'procurement' },
        'quality': { id: 5, role: 'quality' },
        'inventory': { id: 6, role: 'inventory' },
        'accountant': { id: 7, role: 'accountant' }
      };
      
      const deptInfo = departmentMap[department] || { id: null, role: department.toLowerCase().replace(/\s+/g, '_') };
      userRole = deptInfo.role;
      userRoleId = null;
      loginId = null;
    } else {
      userRole = 'employee';
      userRoleId = 2;
      
      // Keep or generate loginId for employee
      const [currentUser] = await db.query('SELECT login_id FROM users WHERE id = ?', [id]);
      if (currentUser.length > 0 && currentUser[0].login_id) {
        loginId = currentUser[0].login_id;
      } else {
        loginId = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
        const [existingLoginId] = await db.query('SELECT * FROM users WHERE login_id = ? AND id != ?', [loginId, id]);
        if (existingLoginId.length > 0) {
          loginId = `${loginId}${Math.floor(100 + Math.random() * 900)}`;
        }
      }
    }

    let query = `
      UPDATE users 
      SET full_name = ?, first_name = ?, last_name = ?, email = ?, 
          department = ?, department_id = ?, role = ?, role_id = ?, login_id = ?, status = ?, designation = ?
    `;
    const params = [fullName, firstName, lastName, email, department, departmentId, userRole, userRoleId, loginId, status || 'active', designation || null];

    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      query += `, password = ? `;
      params.push(hashedPassword);
    }

    query += ` WHERE id = ?`;
    params.push(id);

    await db.query(query, params);
    
    const auditAction = isLoginUser ? 'Update Login User' : 'Update Employee';
    const auditDetail = isLoginUser ? `Login user details updated for: ${fullName} (${userRole})` : `Employee details updated for: ${fullName}`;
    await logAudit(req.user?.fullName || 'Admin', auditAction, 'account', auditDetail, req.ip, 'success');
    
    res.json({ message: 'Employee updated successfully' });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteEmployee = async (req, res) => {
  const { id } = req.params;
  try {
    // Get user details before deleting for logging
    const [users] = await db.query('SELECT full_name FROM users WHERE id = ?', [id]);
    const userName = users.length > 0 ? users[0].full_name : 'Unknown User';

    await db.query('DELETE FROM users WHERE id = ?', [id]);
    await logAudit(req.user?.fullName || 'Admin', 'Delete Employee', 'account', `Employee deleted: ${userName}`, req.ip, 'success');
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateEmployeeStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'active' | 'inactive'

  try {
    await db.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
    await logAudit(req.user?.fullName || 'Admin', 'Toggle User Status', 'account', `User status updated to ${status} for user ID: ${id}`, req.ip, 'success');
    res.json({ message: 'User status updated successfully' });
  } catch (error) {
    console.error('Error updating user status:', error);
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

const getPasswordResetRequests = async (req, res) => {
  try {
    const [requests] = await db.query(
      'SELECT pr.*, u.login_id FROM password_reset_requests pr JOIN users u ON pr.user_id = u.id ORDER BY pr.created_at DESC'
    );
    res.json(requests);
  } catch (error) {
    console.error('Error fetching password reset requests:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const approvePasswordResetRequest = async (req, res) => {
  const { id } = req.params;

  try {
    // Get the request
    const [requests] = await db.query('SELECT * FROM password_reset_requests WHERE id = ?', [id]);
    if (requests.length === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const request = requests[0];
    if (request.status !== 'PENDING') {
      return res.status(400).json({ message: 'Request is already processed' });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    // Update request
    await db.query(
      'UPDATE password_reset_requests SET status = "APPROVED", token = ?, expires_at = ? WHERE id = ?',
      [token, expiresAt, id]
    );

    // Construct reset link using FRONTEND_URL from environment variable
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${token}`;

    await logAudit(
      req.user?.fullName || 'Admin',
      'Approve Password Reset',
      'account',
      `Approved password reset and generated link for: ${request.full_name}`,
      req.ip,
      'success'
    );

    // (Mock email delivery logging or email sending if SMTP configured)
    console.log(`Password reset link generated for ${request.email}: ${resetLink}`);

    res.json({
      message: 'Password reset request approved and link generated successfully',
      resetLink,
    });
  } catch (error) {
    console.error('Error approving password reset:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const rejectPasswordResetRequest = async (req, res) => {
  const { id } = req.params;

  try {
    // Get the request
    const [requests] = await db.query('SELECT * FROM password_reset_requests WHERE id = ?', [id]);
    if (requests.length === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const request = requests[0];
    if (request.status !== 'PENDING') {
      return res.status(400).json({ message: 'Request is already processed' });
    }

    // Update request status to REJECTED
    await db.query('UPDATE password_reset_requests SET status = "REJECTED" WHERE id = ?', [id]);

    await logAudit(
      req.user?.fullName || 'Admin',
      'Reject Password Reset',
      'account',
      `Rejected password reset request for: ${request.full_name}`,
      req.ip,
      'success'
    );

    res.json({ message: 'Password reset request rejected successfully' });
  } catch (error) {
    console.error('Error rejecting password reset:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const sendResetLinkEmail = async (req, res) => {
  const { id } = req.params;

  try {
    const [requests] = await db.query('SELECT * FROM password_reset_requests WHERE id = ?', [id]);
    if (requests.length === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const request = requests[0];
    if (request.status !== 'APPROVED') {
      return res.status(400).json({ message: 'Request must be approved before sending the email' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${request.token}`;

    const { sendEmail } = require('../utils/emailService');
    await sendEmail({
      to: request.email,
      subject: 'Sterling ERP - Password Reset Link',
      text: `Hello ${request.full_name},\n\nYour administrator has approved your password reset request.\n\nPlease click the link below to set a new password:\n${resetLink}\n\nThis link will expire in 1 hour.\n\nRegards,\nSterling Manufacturing Support`
    });

    await logAudit(
      req.user?.fullName || 'Admin',
      'Send Password Reset Email',
      'account',
      `Sent password reset link email to: ${request.email}`,
      req.ip,
      'success'
    );

    res.json({ message: 'Reset link email sent successfully' });
  } catch (error) {
    console.error('Error sending reset link email:', error);
    res.status(500).json({ message: 'Failed to send email', error: error.message });
  }
};

/**
 * GET /admin/dept-progress
 * ───────────────────────────────────────────────────────────────────────────
 * Actual Sterling ERP workflow:
 *  1. Admin          → Creates Route Card
 *  2. Design Eng     → Uploads design drawings, sends to Quality
 *  3. Quality        → Uploads QAP + ATP files
 *  4. Design Eng     → Reviews & approves QAP, sends RC to Production
 *  5. Production     → Views drawings, creates BOM, raises Material Request
 *  6. Procurement    → RFQ → vendor quotation → PO → vendor
 *  7. Inventory      → Material received, GRN, ST numbers, stock added
 *  8. Quality        → Material QC inspection, documents, report → Inventory
 *  9. Inventory      → Reviews report, releases material to Production
 * 10. Production     → Phase-1 ops (Cutting/Welding), daily plans, reports
 * 11. Quality        → Phase-1 QC inspection → back to Production
 * 12. Production     → Phase-2 ops (Painting/Surface Prep)
 * 13. Quality        → Final QC inspection → approves
 * 14. Admin          → Project ready for dispatch
 * ───────────────────────────────────────────────────────────────────────────
 * Quality appears in 3 rounds (QAP + Material QC + Production QC) → each round ~33%
 * Production appears in 2 rounds (BOM/MR + Phase-1/Phase-2 ops) → each round ~50%
 */
const getDeptProgressByProject = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        id,
        project_name,
        project_code,
        status,
        priority,
        updated_at
      FROM root_cards
      ORDER BY updated_at DESC
      LIMIT 30
    `);

    // ─── Exact per-status department progress ──────────────────────────────────
    // Keys: Admin | Design Engineer | Quality | Production | Procurement | Inventory
    // Values: % of that department's TOTAL project involvement completed.
    //
    // Quality has 3 rounds → QAP(33%) + Material QC(66%) + Production QC(100%)
    // Production has 2 rounds → BOM/MR(50%) + Phase-1+2 ops(100%)
    const D = {
      RC_CREATED:                  { Admin:10,  'Design Engineer':0,   Quality:0,  Production:0,  Procurement:0,   Inventory:0   },
      DESIGN_IN_PROGRESS:          { Admin:100, 'Design Engineer':40,  Quality:0,  Production:0,  Procurement:0,   Inventory:0   },
      // Design sent drawings to Quality; Quality uploads QAP + ATP
      DESIGN_APPROVED:             { Admin:100, 'Design Engineer':80,  Quality:33, Production:0,  Procurement:0,   Inventory:0   },
      // Design reviewed & approved QAP, RC sent to Production
      BOM_PREPARATION:             { Admin:100, 'Design Engineer':100, Quality:33, Production:20, Procurement:0,   Inventory:0   },
      MATERIAL_PLANNING:           { Admin:100, 'Design Engineer':100, Quality:33, Production:35, Procurement:0,   Inventory:0   },
      // Material Request raised, sent to Procurement
      MATERIAL_RELEASED:           { Admin:100, 'Design Engineer':100, Quality:33, Production:40, Procurement:10,  Inventory:0   },
      MATERIAL_PARTIALLY_RELEASED: { Admin:100, 'Design Engineer':100, Quality:33, Production:40, Procurement:20,  Inventory:0   },
      PARTIALLY_RELEASED:          { Admin:100, 'Design Engineer':100, Quality:33, Production:40, Procurement:20,  Inventory:0   },
      // Procurement: RFQ → vendor quotation in system → PO created & sent
      PURCHASE_ORDER_RELEASED:     { Admin:100, 'Design Engineer':100, Quality:33, Production:40, Procurement:80,  Inventory:0   },
      PO_RELEASED:                 { Admin:100, 'Design Engineer':100, Quality:33, Production:40, Procurement:80,  Inventory:0   },
      PROCUREMENT_IN_PROGRESS:     { Admin:100, 'Design Engineer':100, Quality:33, Production:40, Procurement:90,  Inventory:0   },
      // Inventory: material arrived, GRN created, ST numbers assigned, added to stock
      MATERIAL_RECEIVED:           { Admin:100, 'Design Engineer':100, Quality:33, Production:40, Procurement:100, Inventory:30  },
      // Quality Round 2: material QC inspection started
      MATERIAL_QC_PENDING:         { Admin:100, 'Design Engineer':100, Quality:55, Production:40, Procurement:100, Inventory:60  },
      // Quality: inspection done, docs uploaded, report sent to Inventory; Inventory releasing material
      MATERIAL_QC_APPROVED:        { Admin:100, 'Design Engineer':100, Quality:66, Production:40, Procurement:100, Inventory:85  },
      SEND_TO_PRODUCTION:          { Admin:100, 'Design Engineer':100, Quality:66, Production:45, Procurement:100, Inventory:100 },
      SEND_TO_PRODUCTION_FOR_COMPLETE_FINAL_PRODUCTION:
                                   { Admin:100, 'Design Engineer':100, Quality:66, Production:50, Procurement:100, Inventory:100 },
      // Production: Phase-1 ops (Cutting, Welding…), daily plans, operator assign, reports
      PRODUCTION_IN_PROGRESS:      { Admin:100, 'Design Engineer':100, Quality:66, Production:65, Procurement:100, Inventory:100 },
      // Phase-1 complete; sent to Quality for QC inspection
      DIMENSIONAL_QC_PENDING:      { Admin:100, 'Design Engineer':100, Quality:80, Production:75, Procurement:100, Inventory:100 },
      // Quality Phase-1 QC done; RC back to Production for Phase-2
      DIMENSIONAL_QC_APPROVED:     { Admin:100, 'Design Engineer':100, Quality:85, Production:80, Procurement:100, Inventory:100 },
      // Production: Phase-2 ops (Painting, Surface Prep…)
      PAINTING_IN_PROGRESS:        { Admin:100, 'Design Engineer':100, Quality:85, Production:90, Procurement:100, Inventory:100 },
      // Phase-2 complete; sent to Quality for Final QC
      FINAL_QC_PENDING:            { Admin:100, 'Design Engineer':100, Quality:92, Production:100, Procurement:100, Inventory:100 },
      // Final QC approved — all departments done
      FINAL_QC_APPROVED:           { Admin:100, 'Design Engineer':100, Quality:100, Production:100, Procurement:100, Inventory:100 },
      READY_FOR_DELIVERY:          { Admin:100, 'Design Engineer':100, Quality:100, Production:100, Procurement:100, Inventory:100 },
      READY_FOR_DISPATCH:          { Admin:100, 'Design Engineer':100, Quality:100, Production:100, Procurement:100, Inventory:100 },
      DISPATCHED:                  { Admin:100, 'Design Engineer':100, Quality:100, Production:100, Procurement:100, Inventory:100 },
      DELIVERED:                   { Admin:100, 'Design Engineer':100, Quality:100, Production:100, Procurement:100, Inventory:100 },
      ON_HOLD:                     { Admin:10,  'Design Engineer':0,   Quality:0,  Production:0,  Procurement:0,   Inventory:0   },
      CANCELLED:                   { Admin:0,   'Design Engineer':0,   Quality:0,  Production:0,  Procurement:0,   Inventory:0   },
    };

    // Overall project % for progress bar
    const OVERALL = {
      RC_CREATED:3, DESIGN_IN_PROGRESS:10, DESIGN_APPROVED:18,
      BOM_PREPARATION:25, MATERIAL_PLANNING:32, MATERIAL_RELEASED:38,
      MATERIAL_PARTIALLY_RELEASED:40, PARTIALLY_RELEASED:40,
      PURCHASE_ORDER_RELEASED:48, PO_RELEASED:48,
      PROCUREMENT_IN_PROGRESS:54, MATERIAL_RECEIVED:60,
      MATERIAL_QC_PENDING:65, MATERIAL_QC_APPROVED:70,
      SEND_TO_PRODUCTION:73, SEND_TO_PRODUCTION_FOR_COMPLETE_FINAL_PRODUCTION:75,
      PRODUCTION_IN_PROGRESS:80, DIMENSIONAL_QC_PENDING:85,
      DIMENSIONAL_QC_APPROVED:88, PAINTING_IN_PROGRESS:92,
      FINAL_QC_PENDING:95, FINAL_QC_APPROVED:98,
      READY_FOR_DELIVERY:100, READY_FOR_DISPATCH:100,
      DISPATCHED:100, DELIVERED:100, ON_HOLD:3, CANCELLED:0,
    };

    // Normalise: uppercase + underscores (handles spaces, hyphens, mixed case)
    const normalise = (s) => (s || '').toUpperCase().trim().replace(/\s+/g, '_').replace(/-/g, '_');

    // Keyword fallback for any DB status not explicitly in the table above
    const keywordFallback = (n) => {
      if (n.includes('DELIVER') || n.includes('DISPATCH'))
        return { Admin:100,'Design Engineer':100,Quality:100,Production:100,Procurement:100,Inventory:100 };
      if (n.includes('FINAL_QC'))
        return { Admin:100,'Design Engineer':100,Quality:92, Production:100,Procurement:100,Inventory:100 };
      if (n.includes('PAINTING') || n.includes('SURFACE'))
        return { Admin:100,'Design Engineer':100,Quality:85, Production:90, Procurement:100,Inventory:100 };
      if (n.includes('DIMENSIONAL') || n.includes('DIM_QC'))
        return { Admin:100,'Design Engineer':100,Quality:80, Production:75, Procurement:100,Inventory:100 };
      if (n.includes('PRODUCTION') || n.includes('SEND_TO_PROD'))
        return { Admin:100,'Design Engineer':100,Quality:66, Production:60, Procurement:100,Inventory:100 };
      if (n.includes('MATERIAL_QC') || n.includes('QC_INSP'))
        return { Admin:100,'Design Engineer':100,Quality:55, Production:40, Procurement:100,Inventory:65 };
      if (n.includes('MATERIAL_RECEIV'))
        return { Admin:100,'Design Engineer':100,Quality:33, Production:40, Procurement:100,Inventory:30 };
      if (n.includes('PROCUREMENT') || n.includes('PURCHASE') || n.includes('PO_'))
        return { Admin:100,'Design Engineer':100,Quality:33, Production:40, Procurement:70, Inventory:0  };
      if (n.includes('MATERIAL_PLAN') || n.includes('MATERIAL_RELEAS') || n.includes('PARTIAL'))
        return { Admin:100,'Design Engineer':100,Quality:33, Production:38, Procurement:15, Inventory:0  };
      if (n.includes('BOM'))
        return { Admin:100,'Design Engineer':100,Quality:33, Production:20, Procurement:0,  Inventory:0  };
      if (n.includes('DESIGN'))
        return { Admin:100,'Design Engineer':60, Quality:10, Production:0,  Procurement:0,  Inventory:0  };
      return   { Admin:10, 'Design Engineer':0,  Quality:0,  Production:0,  Procurement:0,  Inventory:0  };
    };

    const overallKeyword = (n) => {
      if (n.includes('DELIVER') || n.includes('DISPATCH')) return 100;
      if (n.includes('FINAL_QC'))  return 96;
      if (n.includes('PAINTING'))  return 92;
      if (n.includes('DIMENSIONAL')) return 85;
      if (n.includes('PRODUCTION') || n.includes('SEND_TO_PROD')) return 78;
      if (n.includes('MATERIAL_QC')) return 67;
      if (n.includes('MATERIAL_RECEIV')) return 60;
      if (n.includes('PROCUREMENT') || n.includes('PO') || n.includes('PURCHASE')) return 50;
      if (n.includes('MATERIAL')) return 35;
      if (n.includes('BOM')) return 25;
      if (n.includes('DESIGN')) return 12;
      return 3;
    };

    const DEPTS = ['Admin', 'Design Engineer', 'Quality', 'Production', 'Procurement', 'Inventory'];

    const projects = rows.map(row => {
      const norm    = normalise(row.status);
      const deptMap = D[norm] || keywordFallback(norm);
      const overall = OVERALL[norm] !== undefined ? OVERALL[norm] : overallKeyword(norm);

      const departments = {};
      DEPTS.forEach(dept => {
        const pct = deptMap[dept] ?? 0;
        departments[dept] = {
          progress: pct,
          status: pct === 100 ? 'completed' : pct > 0 ? 'in_progress' : 'pending',
        };
      });

      return {
        id: row.id,
        project_name: row.project_name,
        project_code: row.project_code,
        status: row.status,
        priority: row.priority,
        overall_progress: overall,
        departments,
      };
    });

    res.json({ projects });
  } catch (error) {
    console.error('Error fetching dept progress:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



module.exports = {
  getDashboardStats,
  getDeptProgressByProject,
  getEmployeeList,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  updateEmployeeStatus,
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  updateRoleStatus,
  getPermissions,
  getDesignations,
  getDepartments,
  sendCredentials,
  getPasswordResetRequests,
  approvePasswordResetRequest,
  rejectPasswordResetRequest,
  sendResetLinkEmail
};
