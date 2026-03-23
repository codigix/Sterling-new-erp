const express = require('express');
const router = express.Router();
const { getEmployeeTasks, getEmployeeProjects } = require('../controllers/employeeController');
const auth = require('../middleware/authMiddleware');

// @route   GET api/employee/tasks
// @desc    Get employee tasks
router.get('/tasks', auth, getEmployeeTasks);

// @route   GET api/employee/projects
// @desc    Get employee projects
router.get('/projects', auth, getEmployeeProjects);

module.exports = router;
