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
  getDesignEngineerReport,
  getOperatorLogsReport,
  getProjectManhoursReport,
  updateOperatorRates
} = require('../controllers/reportController');
const auth = require('../middleware/authMiddleware');

// Changing operator pay rates is limited to Admin (the Reports page itself is admin-only)
const adminOnly = (req, res, next) => {
  if (String(req.user?.role || '').toLowerCase() !== 'admin') {
    return res.status(403).json({ message: 'Only Admin can change operator rates' });
  }
  next();
};

router.get('/overview', auth, getOverviewReport);
router.get('/projects', auth, getProjectsReport);
router.get('/departments', auth, getDepartmentsReport);
router.get('/vendors', auth, getVendorsReport);
router.get('/inventory', auth, getInventoryReport);
router.get('/employees', auth, getEmployeesReport);
router.get('/design-engineer', auth, getDesignEngineerReport);
router.get('/operator-logs', auth, getOperatorLogsReport);
router.get('/project-manhours', auth, getProjectManhoursReport);
router.post('/operator-rates', auth, adminOnly, updateOperatorRates);
router.get('/employees/:id/performance', auth, getEmployeePerformance);
router.get('/employees/:id/daily-reports', auth, getEmployeeDailyReports);
router.get('/employees/:id/working-hours', auth, getEmployeeWorkingHours);

module.exports = router;
