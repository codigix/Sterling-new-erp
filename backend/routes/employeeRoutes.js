const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const auth = require('../middleware/authMiddleware');

// @route   GET api/employee/tasks
// @desc    Get employee tasks
// @access  Private
router.get('/tasks', auth, employeeController.getEmployeeTasks);

// @route   GET api/employee/projects
// @desc    Get employee projects
// @access  Private
router.get('/projects', auth, employeeController.getEmployeeProjects);

module.exports = router;
