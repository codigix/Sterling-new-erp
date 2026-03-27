const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const qualityController = require('../controllers/qualityController');

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve(__dirname, '../', process.env.UPLOAD_PATH || 'uploads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

router.get('/tasks', qualityController.getQualityTasks);
router.get('/portal/grn-inspections', qualityController.getGRNInspections);
router.get('/portal/ready-root-cards', qualityController.getQCReadyRootCards);
router.get('/portal/materials-for-inspection', qualityController.getGRNMaterialsForInspection);
router.get('/portal/stage-qc', qualityController.getStageQC);
router.post('/grn/:id/send-to-qc', qualityController.sendToQC);

// New Quality Inspection Module Routes
router.post('/grn/:id/inspection-type', qualityController.updateGRNInspectionType);
router.get('/grn/:id/st-numbers', qualityController.getGRNStNumbers);
router.post('/inspection/submit', qualityController.submitQualityInspection);
router.post('/grn/:id/finalize', qualityController.finalizeGRNQC);
router.post('/reports/create', qualityController.createFinalQCReport);
router.get('/reports', qualityController.getFinalQCReports);
router.post('/reports/:id/send-to-inventory', qualityController.sendReportToInventory);
router.post('/outsource/challan', qualityController.createOutsourceChallan);
router.post('/outsource/update-status', qualityController.updateOutsourceStatus);
router.post('/outsource/submit-results', upload.any(), qualityController.submitOutsourceResults);

module.exports = router;
