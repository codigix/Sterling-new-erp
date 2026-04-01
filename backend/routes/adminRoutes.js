const express = require('express');
const router = express.Router();
const { 
  getEmployeeList, 
  createEmployee, 
  updateEmployee, 
  deleteEmployee, 
  getRoles, 
  getDesignations,
  getDepartments,
  sendCredentials
} = require('../controllers/adminController');
const auth = require('../middleware/authMiddleware');

// @route   GET api/admin/employee-list
// @desc    Get all employees
router.get('/employee-list', auth, getEmployeeList);

// @route   POST api/admin/employee-list
// @desc    Create a new employee
router.post('/employee-list', auth, createEmployee);

// @route   PUT api/admin/employee-list/:id
// @desc    Update an employee
router.put('/employee-list/:id', auth, updateEmployee);

// @route   DELETE api/admin/employee-list/:id
// @desc    Delete an employee
router.delete('/employee-list/:id', auth, deleteEmployee);

// @route   GET api/admin/roles
// @desc    Get all roles
router.get('/roles', auth, getRoles);

// @route   GET api/admin/designations
// @desc    Get all designations
router.get('/designations', auth, getDesignations);

// @route   GET api/admin/departments
// @desc    Get all departments
router.get('/departments', auth, getDepartments);

// @route   POST api/admin/employee-list/:id/send-credentials
// @desc    Send registration credentials email
router.post('/employee-list/:id/send-credentials', auth, sendCredentials);

module.exports = router;
