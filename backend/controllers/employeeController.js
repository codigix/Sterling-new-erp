const db = require('../config/db');

const getEmployeeTasks = async (req, res) => {
  const { type } = req.query;
  const userId = req.user ? req.user.id : null;

  try {
    let tasks = [];
    
    // Fetch all root cards to derive tasks from them
    // In a more complex system, there might be a separate tasks table
    // but based on the current codebase, tasks seem to be derived from root cards
    const [rootCards] = await db.query('SELECT * FROM root_cards ORDER BY created_at DESC');

    // Filter and map root cards to the "task" format expected by the frontend
    tasks = rootCards.map(rc => {
      // Map root card status to task status
      let taskStatus = 'pending';
      if (rc.status === 'DESIGN_IN_PROGRESS' || rc.status === 'PRODUCTION_IN_PROGRESS') {
        taskStatus = 'in_progress';
      } else if (rc.status === 'APPROVED' || rc.status === 'COMPLETED') {
        taskStatus = 'completed';
      } else if (rc.status === 'ON_HOLD') {
        taskStatus = 'on_hold';
      }

      return {
        id: rc.id,
        title: `Task for ${rc.project_name || 'Project'}`,
        description: rc.notes || '',
        status: taskStatus,
        priority: rc.priority || 'medium',
        rootCard: {
          id: rc.id,
          title: rc.project_name,
          customer: 'Internal', // Placeholder or fetch from PO
          poNumber: rc.po_number
        },
        salesOrder: {
          customer: 'Internal', // Placeholder or fetch from PO
          poNumber: rc.po_number
        },
        createdAt: rc.created_at,
        updatedAt: rc.updated_at
      };
    });

    // Filter by type if provided
    if (type === 'design_engineering') {
      // For design engineering, show all root cards that are in relevant statuses
      // or filter based on some other criteria if needed
      tasks = tasks.filter(t => ['pending', 'in_progress'].includes(t.status));
    } else if (type === 'production_plan') {
      tasks = tasks.filter(t => ['pending', 'in_progress'].includes(t.status));
    }

    res.json({ tasks });
  } catch (error) {
    console.error('Error fetching employee tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getEmployeeProjects = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM root_cards ORDER BY created_at DESC');
    res.json({ projects: rows });
  } catch (error) {
    console.error('Error fetching employee projects:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getEmployeeTasks,
  getEmployeeProjects
};
exports.getEmployeeTasks = async (req, res) => {
  const { type, limit } = req.query;
  try {
    const types = type ? type.split(',') : [];
    
    let query = `
      SELECT 
        rcs.id, 
        rcs.status, 
        rcs.step_key,
        rcs.updated_at,
        rc.id as root_card_id,
        rc.project_name as title,
        rc.po_number as poNumber,
        rc.priority,
        rc.project_name,
        rc.items
      FROM root_card_steps rcs
      JOIN root_cards rc ON rcs.root_card_id = rc.id
    `;
    
    const queryParams = [];
    if (types.length > 0) {
      // Use placeholders for each type in the list
      const placeholders = types.map(() => '?').join(',');
      query += ` WHERE rcs.step_key IN (${placeholders})`;
      queryParams.push(...types);
    }
    
    query += ' ORDER BY rcs.updated_at DESC';
    
    if (limit) {
      query += ' LIMIT ?';
      queryParams.push(parseInt(limit));
    }
    
    const [rows] = await db.query(query, queryParams);
    
    const tasks = rows.map(row => ({
      id: row.id,
      status: row.status,
      stepKey: row.step_key,
      priority: row.priority,
      updated_at: row.updated_at,
      rootCard: {
        id: row.root_card_id,
        title: row.title,
        projectName: row.project_name,
        poNumber: row.poNumber,
        items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items
      }
    }));
    
    res.json({ tasks });
  } catch (error) {
    console.error('Error in getEmployeeTasks:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
