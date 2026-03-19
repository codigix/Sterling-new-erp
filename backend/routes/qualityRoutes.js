const express = require('express');
const router = express.Router();
const qualityController = require('../controllers/qualityController');

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
router.post('/outsource/challan', qualityController.createOutsourceChallan);
router.post('/outsource/update-status', qualityController.updateOutsourceStatus);
router.post('/outsource/submit-results', qualityController.submitOutsourceResults);

module.exports = router;
