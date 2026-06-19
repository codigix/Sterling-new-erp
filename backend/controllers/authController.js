const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

const register = async (req, res) => {
  const { fullName, email, password, department } = req.body;

  try {
    // Check if user exists
    const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Map department to ID and Role
    const departmentMap = {
      'Admin': { id: 1, role: 'admin' },
      'Design Engineer': { id: 2, role: 'design_engineer' },
      'Production': { id: 3, role: 'production' },
      'Procurement': { id: 4, role: 'procurement' },
      'Quality': { id: 5, role: 'quality' },
      'Inventory': { id: 6, role: 'inventory' },
      'Accountant': { id: 7, role: 'accountant' },
      // Added lowercase variants for robustness
      'admin': { id: 1, role: 'admin' },
      'design_engineer': { id: 2, role: 'design_engineer' },
      'production': { id: 3, role: 'production' },
      'procurement': { id: 4, role: 'procurement' },
      'quality': { id: 5, role: 'quality' },
      'inventory': { id: 6, role: 'inventory' },
      'accountant': { id: 7, role: 'accountant' }
    };

    const deptInfo = departmentMap[department] || { id: null, role: department.toLowerCase().replace(/\s+/g, '_') };
    const role = deptInfo.role;
    const departmentId = deptInfo.id;

    // Insert user
    const [result] = await db.query(
      'INSERT INTO users (full_name, email, password, department, department_id, role) VALUES (?, ?, ?, ?, ?, ?)',
      [fullName, email, hashedPassword, department, departmentId, role]
    );

    res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const login = async (req, res) => {
  const { username, password } = req.body; // username is the email address based on our frontend

  try {
    // Find user
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [username]);
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    // Block inactive users from logging in
    if (user.status === 'inactive') {
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact your administrator.' });
    }

    // Block individual employees from logging in
    if (user.role === 'employee') {
      return res.status(403).json({ message: 'Individual employees do not have access to the portal. Please contact your department manager.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await logAudit(username, 'Login Attempt', 'auth', `Failed login attempt for ${username}`, req.ip, 'warning');
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, fullName: user.full_name, role: user.role, department: user.department, departmentId: user.department_id },
      process.env.JWT_SECRET || 'sterling_secret',
      { expiresIn: '1d' }
    );

    await logAudit(user.full_name, 'User Login', 'auth', `${user.full_name} logged in successfully`, req.ip, 'success');

    res.json({
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        department: user.department,
        departmentId: user.department_id
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMe = async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, full_name, email, department, department_id, role FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];
    res.json({
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        department: user.department,
        departmentId: user.department_id
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const forgotPassword = async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ message: 'Email Address or Login ID is required' });
  }

  try {
    // Search user by email or login_id
    const [users] = await db.query(
      'SELECT id, full_name, email, login_id, role FROM users WHERE email = ? OR login_id = ?',
      [username, username]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found. Please verify your Email or Login ID.' });
    }

    const user = users[0];

    // Block individual employee accounts from password reset requests
    if (user.role === 'employee') {
      return res.status(403).json({ message: 'Individual employee accounts do not have portal login or password reset access.' });
    }

    // Check if there is already a PENDING request
    const [existing] = await db.query(
      'SELECT id FROM password_reset_requests WHERE user_id = ? AND status = "PENDING"',
      [user.id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ 
        message: 'A password reset request is already pending for this user. Please contact your administrator.' 
      });
    }

    // Insert request
    await db.query(
      'INSERT INTO password_reset_requests (user_id, username, full_name, email, status) VALUES (?, ?, ?, ?, "PENDING")',
      [user.id, username, user.full_name, user.email]
    );

    // Insert notification for Admin
    try {
      await db.query(
        'INSERT INTO notifications (department, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
        [
          'Admin',
          'Password Reset Request',
          `${user.full_name} (${user.email}) has requested a password reset.`,
          'warning',
          '/admin/password-resets'
        ]
      );
    } catch (notifError) {
      console.error('Failed to create admin notification for password reset request:', notifError);
    }

    await logAudit(user.full_name, 'Password Reset Request', 'auth', `${user.full_name} submitted a password reset request`, req.ip, 'success');

    res.json({ message: 'Password reset request submitted successfully' });
  } catch (error) {
    console.error('forgotPassword error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: 'Token and new password are required' });
  }

  try {
    // Verify token exists, is APPROVED and not expired
    const [requests] = await db.query(
      'SELECT * FROM password_reset_requests WHERE token = ? AND status = "APPROVED" AND expires_at > NOW()',
      [token]
    );

    if (requests.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired password reset link. Please submit a new request.' });
    }

    const request = requests[0];

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user's password
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, request.user_id]);

    // Update request status to COMPLETED
    await db.query('UPDATE password_reset_requests SET status = "COMPLETED" WHERE id = ?', [request.id]);

    await logAudit(request.full_name, 'Password Reset Success', 'auth', `${request.full_name} successfully reset their password via token`, req.ip, 'success');

    res.json({ message: 'Password reset successfully. You can now login with your new password.' });
  } catch (error) {
    console.error('resetPassword error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const verifyResetToken = async (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({ message: 'Token is required' });
  }

  try {
    const [requests] = await db.query(
      'SELECT pr.*, u.login_id FROM password_reset_requests pr JOIN users u ON pr.user_id = u.id WHERE pr.token = ? AND pr.status = "APPROVED" AND pr.expires_at > NOW()',
      [token]
    );

    if (requests.length === 0) {
      // Check if it exists but expired or status changed
      const [allRequests] = await db.query(
        'SELECT pr.*, u.login_id FROM password_reset_requests pr JOIN users u ON pr.user_id = u.id WHERE pr.token = ?',
        [token]
      );

      if (allRequests.length > 0) {
        const reqItem = allRequests[0];
        if (reqItem.status !== 'APPROVED') {
          return res.status(400).json({ message: `This password reset request has already been ${reqItem.status.toLowerCase()}. Please request a new one.` });
        } else if (new Date(reqItem.expires_at) <= new Date()) {
          return res.status(400).json({ message: 'This password reset link has expired (valid for 1 hour). Please request a new one.' });
        }
      }

      return res.status(400).json({ message: 'Invalid or expired password reset link. Please check the URL or request a new one.' });
    }

    const request = requests[0];
    res.json({
      valid: true,
      username: request.username,
      login_id: request.login_id,
      email: request.email,
      full_name: request.full_name
    });
  } catch (error) {
    console.error('verifyResetToken error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { register, login, getMe, forgotPassword, resetPassword, verifyResetToken };
