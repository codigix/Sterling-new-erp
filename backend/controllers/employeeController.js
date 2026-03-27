const db = require('../config/db');

const getEmployeeTasks = async (req, res) => {
  const { type, limit } = req.query;
  const userId = req.user ? req.user.id : null;

  try {
    const types = type ? type.split(',') : [];
    
    // If specific step types are requested, use the step-based query
    if (types.length > 0 && !['design_engineering', 'production_plan'].includes(type)) {
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
      const placeholders = types.map(() => '?').join(',');
      query += ` WHERE rcs.step_key IN (${placeholders})`;
      queryParams.push(...types);
      
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
      
      return res.json({ tasks });
    }

    // Default logic: derive tasks from root cards
    const [rootCards] = await db.query('SELECT * FROM root_cards ORDER BY created_at DESC');

    // Filter and map root cards to the "task" format expected by the frontend
    let tasks = rootCards.map(rc => {
      // Map root card status to task status
      let taskStatus = 'pending';
      if (rc.status === 'DESIGN_IN_PROGRESS' || 
          rc.status === 'PRODUCTION_IN_PROGRESS' || 
          rc.status === 'MATERIAL_PLANNING' ||
          rc.status === 'BOM_PREPARATION' ||
          rc.status === 'PARTIALLY_RELEASED' ||
          rc.status === 'MATERIAL_RELEASED') {
        taskStatus = 'in_progress';
      } else if (rc.status === 'APPROVED' || rc.status === 'COMPLETED' || rc.status === 'READY_FOR_DELIVERY') {
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
        rootCardId: rc.id, // For backward compatibility
        rootCard: {
          id: rc.id,
          title: rc.project_name,
          customer: 'Internal', 
          poNumber: rc.po_number
        },
        salesOrder: {
          customer: 'Internal',
          poNumber: rc.po_number
        },
        createdAt: rc.created_at,
        updatedAt: rc.updated_at
      };
    });

    // Filter by type if provided
    if (type === 'design_engineering') {
      tasks = tasks.filter(t => ['pending', 'in_progress'].includes(t.status));
    } else if (type === 'production_plan') {
      tasks = tasks.filter(t => ['pending', 'in_progress'].includes(t.status));
    }

    if (limit) {
      tasks = tasks.slice(0, parseInt(limit));
    }

    res.json({ tasks });
  } catch (error) {
    console.error('Error fetching employee tasks:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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
