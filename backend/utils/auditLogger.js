const db = require('../config/db');

/**
 * Log an audit action to the database
 * 
 * @param {string} userName - The name of the user performing the action
 * @param {string} action - The action being performed (e.g., 'User Login', 'Create Employee')
 * @param {string} type - The category of the action ('auth', 'admin', 'export', 'account', 'security')
 * @param {string} details - Detailed description of the action
 * @param {string} ipAddress - IP address of the user
 * @param {string} status - Status of the action ('success', 'warning', 'error')
 */
const logAudit = async (userName, action, type, details, ipAddress = 'unknown', status = 'success') => {
  try {
    const query = `
      INSERT INTO audit_logs (user_name, action, type, details, ip_address, status) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await db.query(query, [userName, action, type, details, ipAddress, status]);
  } catch (error) {
    console.error('Audit Logger Error:', error);
    // We don't want to crash the main application if logging fails
  }
};

module.exports = { logAudit };
