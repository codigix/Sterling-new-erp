const db = require('../config/db');

const getNotifications = async (req, res) => {
  const { userId, department, role } = req.query;
  
  try {
    // If we have any of these, we build a query to find relevant notifications
    // department and role are treated similarly as group identifiers
    
    // We use DATE_FORMAT or just let the database return it, but to ensure consistency 
    // we want ISO format. MySQL CURRENT_TIMESTAMP might be in local time.
    let query = 'SELECT *, type as alert_type FROM notifications WHERE 1=0';
    const params = [];

    // Helper to add department/role variants (with spaces and underscores)
    const addVariantParams = (val) => {
      if (!val) return [];
      const variants = [val];
      if (val.includes(' ')) variants.push(val.replace(/\s+/g, '_'));
      if (val.includes('_')) variants.push(val.replace(/_/g, ' '));
      return [...new Set(variants)]; // unique variants
    };

    if (userId) {
      query = 'SELECT *, type as alert_type FROM notifications WHERE (user_id = ?';
      params.push(userId);
      
      const deptVariants = addVariantParams(department);
      const roleVariants = addVariantParams(role);
      const allVariants = [...new Set([...deptVariants, ...roleVariants])];

      if (allVariants.length > 0) {
        query += ' OR department IN (' + allVariants.map(() => '?').join(',') + ')';
        query += ' OR LOWER(department) IN (' + allVariants.map(() => 'LOWER(?)').join(',') + ')';
        params.push(...allVariants, ...allVariants);
      }
      query += ')';
    } else if (department || role) {
      const deptVariants = addVariantParams(department);
      const roleVariants = addVariantParams(role);
      const allVariants = [...new Set([...deptVariants, ...roleVariants])];

      if (allVariants.length > 0) {
        query = 'SELECT *, type as alert_type FROM notifications WHERE (';
        query += 'department IN (' + allVariants.map(() => '?').join(',') + ')';
        query += ' OR LOWER(department) IN (' + allVariants.map(() => 'LOWER(?)').join(',') + ')';
        params.push(...allVariants, ...allVariants);
        query += ')';
      }
    } else {
      // If no filters provided, return nothing for security
      return res.json({ notifications: [] });
    }
    
    query += ' ORDER BY created_at DESC LIMIT 50';
    
    const [rows] = await db.query(query, params);
    res.json({ notifications: rows });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const markAsRead = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('UPDATE notifications SET read_status = TRUE WHERE id = ?', [id]);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const markAllAsRead = async (req, res) => {
  const { userId, department, role } = req.body;
  try {
    // Helper to add department/role variants (with spaces and underscores)
    const addVariantParams = (val) => {
      if (!val) return [];
      const variants = [val];
      if (val.includes(' ')) variants.push(val.replace(/\s+/g, '_'));
      if (val.includes('_')) variants.push(val.replace(/_/g, ' '));
      return [...new Set(variants)]; // unique variants
    };

    let query = 'UPDATE notifications SET read_status = TRUE WHERE (read_status = FALSE';
    const params = [];

    const conditions = [];
    if (userId) {
      conditions.push('user_id = ?');
      params.push(userId);
    }
    
    const deptVariants = addVariantParams(department);
    const roleVariants = addVariantParams(role);
    const allVariants = [...new Set([...deptVariants, ...roleVariants])];

    if (allVariants.length > 0) {
      conditions.push('department IN (' + allVariants.map(() => '?').join(',') + ')');
      params.push(...allVariants);
      conditions.push('LOWER(department) IN (' + allVariants.map(() => 'LOWER(?)').join(',') + ')');
      params.push(...allVariants);
    }

    if (conditions.length > 0) {
      query += ' AND (' + conditions.join(' OR ') + ')';
    }
    query += ')';

    await db.query(query, params);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteNotification = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM notifications WHERE id = ?', [id]);
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createNotification = async (req, res) => {
  const { userId, department, title, message, type, link, metadata } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO notifications (user_id, department, title, message, type, link, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        userId || null, 
        department || null, 
        title, 
        message, 
        type || 'info',
        link || null,
        metadata ? JSON.stringify(metadata) : null
      ]
    );
    res.status(201).json({ message: 'Notification created', id: result.insertId });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification
};
