const db = require('../config/db');
const bcrypt = require('bcryptjs');

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
  // Hardcoded roles as no roles table exists yet
  const roles = [
    { id: 1, name: 'Admin' },
    { id: 2, name: 'Employee' },
    { id: 3, name: 'Manager' }
  ];
  res.json({ roles }); // Ensure it matches what frontend expects
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

module.exports = {
  getEmployeeList,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getRoles,
  getDesignations,
  getDepartments,
  sendCredentials
};
