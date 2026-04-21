const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const {
  getAllTasks,
  createTask,
  updateTask,
  deleteTask,
  getDepartmentTasks,
  updateTaskStatus
} = require('../controllers/departmentTaskController');

// All routes are protected
router.use(auth);

// Admin Routes
router.get('/all', getAllTasks);
router.post('/create', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

// Department Routes
router.get('/department/:departmentId', getDepartmentTasks);
router.patch('/:id/status', updateTaskStatus);

module.exports = router;
