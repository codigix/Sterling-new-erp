const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

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
      'Accountant': { id: 7, role: 'accountant' }
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

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, fullName: user.full_name, role: user.role, department: user.department, departmentId: user.department_id },
      process.env.JWT_SECRET || 'sterling_secret',
      { expiresIn: '1d' }
    );

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

module.exports = { register, login, getMe };
