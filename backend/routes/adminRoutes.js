const express = require('express');
const router = express.Router();
const { 
  getDashboardStats,
  getEmployeeList, 
  createEmployee, 
  updateEmployee, 
  deleteEmployee, 
  getRoles, 
  createRole,
  updateRole,
  deleteRole,
  updateRoleStatus,
  getPermissions,
  getDesignations,
  getDepartments,
  sendCredentials,
  getPasswordResetRequests,
  approvePasswordResetRequest,
  rejectPasswordResetRequest,
  sendResetLinkEmail
} = require('../controllers/adminController');
const auth = require('../middleware/authMiddleware');

// @route   GET api/admin/stats
// @desc    Get dashboard stats
router.get('/stats', auth, getDashboardStats);

// @route   GET api/admin/employee-list
// @desc    Get all employees
router.get('/employee-list', auth, getEmployeeList);

// @route   POST api/admin/employee-list
// @desc    Create a new employee
router.post('/employee-list', auth, createEmployee);

// @route   PUT api/admin/employee-list/:id
// @desc    Update employee details
router.put('/employee-list/:id', auth, updateEmployee);

// @route   DELETE api/admin/employee-list/:id
// @desc    Delete an employee
router.delete('/employee-list/:id', auth, deleteEmployee);

// @route   GET api/admin/permissions
// @desc    Get all permissions
router.get('/permissions', auth, getPermissions);

// @route   GET api/admin/roles
// @desc    Get all roles
router.get('/roles', auth, getRoles);

// @route   POST api/admin/roles
// @desc    Create a new role
router.post('/roles', auth, createRole);

// @route   PUT api/admin/roles/:id
// @desc    Update role details
router.put('/roles/:id', auth, updateRole);

// @route   DELETE api/admin/roles/:id
// @desc    Delete a role
router.delete('/roles/:id', auth, deleteRole);

// @route   PUT api/admin/roles/:id/status
// @desc    Toggle role status
router.put('/roles/:id/status', auth, updateRoleStatus);

// @route   GET api/admin/designations
// @desc    Get all designations
router.get('/designations', auth, getDesignations);

// @route   GET api/admin/departments
// @desc    Get all departments
router.get('/departments', auth, getDepartments);

// @route   POST api/admin/employee-list/:id/send-credentials
// @desc    Send registration credentials email
router.post('/employee-list/:id/send-credentials', auth, sendCredentials);

// @route   GET api/admin/password-reset-requests
// @desc    Get all password reset requests
router.get('/password-reset-requests', auth, getPasswordResetRequests);

// @route   POST api/admin/password-reset-requests/:id/approve
// @desc    Approve a password reset request
router.post('/password-reset-requests/:id/approve', auth, approvePasswordResetRequest);

// @route   POST api/admin/password-reset-requests/:id/reject
// @desc    Reject a password reset request
router.post('/password-reset-requests/:id/reject', auth, rejectPasswordResetRequest);

// @route   POST api/admin/password-reset-requests/:id/send-email
// @desc    Send password reset link email
router.post('/password-reset-requests/:id/send-email', auth, sendResetLinkEmail);

module.exports = router;
