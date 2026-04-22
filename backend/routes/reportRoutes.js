const express = require('express');
const router = express.Router();
const {
  getOverviewReport,
  getProjectsReport,
  getDepartmentsReport,
  getVendorsReport,
  getInventoryReport,
  getEmployeesReport,
  getEmployeePerformance,
  getEmployeeDailyReports,
  getEmployeeWorkingHours,
  getDesignEngineerReport
} = require('../controllers/reportController');
const auth = require('../middleware/authMiddleware');

router.get('/overview', auth, getOverviewReport);
router.get('/projects', auth, getProjectsReport);
router.get('/departments', auth, getDepartmentsReport);
router.get('/vendors', auth, getVendorsReport);
router.get('/inventory', auth, getInventoryReport);
router.get('/employees', auth, getEmployeesReport);
router.get('/design-engineer', auth, getDesignEngineerReport);
router.get('/employees/:id/performance', auth, getEmployeePerformance);
router.get('/employees/:id/daily-reports', auth, getEmployeeDailyReports);
router.get('/employees/:id/working-hours', auth, getEmployeeWorkingHours);

module.exports = router;
