const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { logAudit } = require('../utils/auditLogger');

// Operator management for the Production department.
// Operators are users with role 'employee' (same records the Admin "Operators" tab manages).
// These endpoints can only list/create/update operators and change their status: they never
// touch department login users or admins, and there is no delete (work logs keep their operator).

const PRODUCTION_DEPARTMENT = { name: 'Production', id: 3 };

const canManageOperators = (user) => {
  const role = String(user?.role || '').toLowerCase();
  const department = String(user?.department || '').toLowerCase();
  return role === 'admin' || role.includes('production') || department.includes('production');
};

const requireOperatorManager = (req, res, next) => {
  if (!canManageOperators(req.user)) {
    return res.status(403).json({ message: 'Only Production or Admin users can manage operators' });
  }
  next();
};

const OPERATOR_FIELDS = `id, full_name AS fullName, first_name AS firstName, last_name AS lastName, email,
  designation, department, department_id AS departmentId, login_id AS loginId, status, created_at AS createdAt`;

const findOperator = async (id) => {
  const [rows] = await db.query(`SELECT ${OPERATOR_FIELDS} FROM users WHERE id = ? AND role = 'employee'`, [id]);
  return rows[0] || null;
};

const normaliseStatus = (status) => (status === 'inactive' ? 'inactive' : 'active');

const validateOperatorInput = ({ firstName, lastName }) => {
  if (!firstName || !String(firstName).trim()) return 'First name is required';
  if (!lastName || !String(lastName).trim()) return 'Last name is required';
  return null;
};

// @route GET api/production/operators
const getOperators = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT ${OPERATOR_FIELDS} FROM users WHERE role = 'employee' ORDER BY full_name ASC`);
    res.json({ success: true, operators: rows });
  } catch (error) {
    console.error('Error fetching operators:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route POST api/production/operators
const createOperator = async (req, res) => {
  const validationError = validateOperatorInput(req.body);
  if (validationError) return res.status(400).json({ message: validationError });

  const firstName = String(req.body.firstName).trim();
  const lastName = String(req.body.lastName).trim();
  const email = req.body.email && String(req.body.email).trim() ? String(req.body.email).trim() : null;
  const designation = req.body.designation && String(req.body.designation).trim() ? String(req.body.designation).trim() : null;
  const status = normaliseStatus(req.body.status);

  try {
    if (email) {
      const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length > 0) return res.status(400).json({ message: 'A user with this email already exists' });
    }

    // Same conventions as the Admin "Add Operator": firstname.lastname login id and a random,
    // unusable password (operators do not log in to the portal)
    let loginId = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/\s+/g, '');
    const [existingLogin] = await db.query('SELECT id FROM users WHERE login_id = ?', [loginId]);
    if (existingLogin.length > 0) loginId = `${loginId}${Math.floor(100 + Math.random() * 900)}`;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(Math.random().toString(36) + Math.random().toString(36), salt);
    const fullName = `${firstName} ${lastName}`;

    const [result] = await db.query(
      `INSERT INTO users (full_name, first_name, last_name, email, password, designation, department, department_id, role, role_id, login_id, actions, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'employee', 2, ?, '[]', ?)`,
      [fullName, firstName, lastName, email, hashedPassword, designation, PRODUCTION_DEPARTMENT.name, PRODUCTION_DEPARTMENT.id, loginId, status]
    );

    await logAudit(req.user?.fullName || 'Production', 'Create Employee', 'account', `New operator created from Production: ${fullName}`, req.ip, 'success');
    res.status(201).json({ message: 'Operator created successfully', operator: await findOperator(result.insertId) });
  } catch (error) {
    console.error('Error creating operator:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route PUT api/production/operators/:id
const updateOperator = async (req, res) => {
  const { id } = req.params;
  const validationError = validateOperatorInput(req.body);
  if (validationError) return res.status(400).json({ message: validationError });

  const firstName = String(req.body.firstName).trim();
  const lastName = String(req.body.lastName).trim();
  const email = req.body.email && String(req.body.email).trim() ? String(req.body.email).trim() : null;
  const designation = req.body.designation && String(req.body.designation).trim() ? String(req.body.designation).trim() : null;

  try {
    const operator = await findOperator(id);
    if (!operator) return res.status(404).json({ message: 'Operator not found' });

    if (email) {
      const [existing] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
      if (existing.length > 0) return res.status(400).json({ message: 'A user with this email already exists' });
    }

    const status = req.body.status ? normaliseStatus(req.body.status) : operator.status || 'active';
    const fullName = `${firstName} ${lastName}`;

    // Role, department, login id and password are left as they are
    await db.query(
      `UPDATE users SET full_name = ?, first_name = ?, last_name = ?, email = ?, designation = ?, status = ?
       WHERE id = ? AND role = 'employee'`,
      [fullName, firstName, lastName, email, designation, status, id]
    );

    await logAudit(req.user?.fullName || 'Production', 'Update Employee', 'account', `Operator details updated from Production: ${fullName}`, req.ip, 'success');
    res.json({ message: 'Operator updated successfully', operator: await findOperator(id) });
  } catch (error) {
    console.error('Error updating operator:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route PATCH api/production/operators/:id/status
const updateOperatorStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (status !== 'active' && status !== 'inactive') {
    return res.status(400).json({ message: "Status must be 'active' or 'inactive'" });
  }

  try {
    const operator = await findOperator(id);
    if (!operator) return res.status(404).json({ message: 'Operator not found' });

    await db.query("UPDATE users SET status = ? WHERE id = ? AND role = 'employee'", [status, id]);
    await logAudit(req.user?.fullName || 'Production', 'Toggle User Status', 'account', `Operator ${operator.fullName} set to ${status} from Production`, req.ip, 'success');
    res.json({ message: `Operator marked ${status}`, operator: await findOperator(id) });
  } catch (error) {
    console.error('Error updating operator status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  requireOperatorManager,
  getOperators,
  createOperator,
  updateOperator,
  updateOperatorStatus
};
