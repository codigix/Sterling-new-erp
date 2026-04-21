const db = require('../config/db');

// Map department IDs to names (sync with adminController.js)
const DEPARTMENT_MAP = {
  1: 'Admin',
  2: 'Design Engineer',
  3: 'Production',
  4: 'Procurement',
  5: 'Quality',
  6: 'Inventory',
  7: 'Accountant'
};

// Get all tasks (Admin view)
const getAllTasks = async (req, res) => {
  try {
    const query = `
      SELECT t.*, u.full_name as assignedByName
      FROM department_tasks t
      LEFT JOIN users u ON t.assigned_by = u.id
      ORDER BY t.created_at DESC
    `;
    const [tasks] = await db.query(query);
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching departmental tasks:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create a new task
const createTask = async (req, res) => {
  const { title, description, departmentId, priority, assignmentDate, dueDate } = req.body;
  const assignedBy = req.user.id; // From auth middleware

  try {
    const [result] = await db.query(
      `INSERT INTO department_tasks (title, description, department_id, priority, assignment_date, due_date, assigned_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, description, departmentId, priority, assignmentDate, dueDate, assignedBy]
    );

    // Create notification for the assigned department
    const departmentName = DEPARTMENT_MAP[departmentId];
    if (departmentName) {
      // Map department to its local task route
      const linkMap = {
        'Design Engineer': '/design-engineer/tasks/assigned',
        'Production': '/department/production/tasks',
        'Quality': '/department/quality/tasks',
        'Procurement': '/department/procurement/tasks',
        'Inventory': '/department/inventory/tasks',
        'Accountant': '/accountant/tasks'
      };

      const notificationLink = linkMap[departmentName] || '/department/tasks';

      await db.query(
        'INSERT INTO notifications (department, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
        [
          departmentName,
          'New Departmental Task Assigned',
          `A new task "${title}" has been assigned to your department.`,
          'info',
          notificationLink
        ]
      );
    }

    res.status(201).json({ 
      message: 'Task assigned successfully', 
      taskId: result.insertId 
    });
  } catch (error) {
    console.error('Error creating departmental task:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update a task
const updateTask = async (req, res) => {
  const { id } = req.params;
  const { title, description, departmentId, priority, assignmentDate, dueDate, status } = req.body;

  try {
    await db.query(
      `UPDATE department_tasks 
       SET title = ?, description = ?, department_id = ?, priority = ?, assignment_date = ?, due_date = ?, status = ?
       WHERE id = ?`,
      [title, description, departmentId, priority, assignmentDate, dueDate, status, id]
    );
    res.json({ message: 'Task updated successfully' });
  } catch (error) {
    console.error('Error updating departmental task:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a task
const deleteTask = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM department_tasks WHERE id = ?', [id]);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting departmental task:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get tasks for a specific department (Employee view)
const getDepartmentTasks = async (req, res) => {
  const { departmentId } = req.params;
  try {
    const [tasks] = await db.query(
      `SELECT t.*, u.full_name as assignedByName
       FROM department_tasks t
       LEFT JOIN users u ON t.assigned_by = u.id
       WHERE t.department_id = ?
       ORDER BY t.created_at DESC`,
      [departmentId]
    );
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching department tasks:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update task status (Employee action)
const updateTaskStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    await db.query(
      'UPDATE department_tasks SET status = ? WHERE id = ?',
      [status, id]
    );
    res.json({ message: 'Task status updated successfully' });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllTasks,
  createTask,
  updateTask,
  deleteTask,
  getDepartmentTasks,
  updateTaskStatus
};
