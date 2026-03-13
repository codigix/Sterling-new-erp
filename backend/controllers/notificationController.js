const db = require('../config/db');

const getNotifications = async (req, res) => {
  const { userId, department } = req.query;
  
  try {
    let query = 'SELECT * FROM notifications WHERE (user_id = ? OR department = ?) ORDER BY created_at DESC LIMIT 50';
    const [rows] = await db.query(query, [userId || null, department || null]);
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

const createNotification = async (req, res) => {
  const { userId, department, title, message, type } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO notifications (user_id, department, title, message, type) VALUES (?, ?, ?, ?, ?)',
      [userId || null, department || null, title, message, type || 'info']
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
  createNotification
};
