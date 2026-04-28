const express = require('express');
const router = express.Router();
const productionController = require('../controllers/productionController');

// Root Card Routes for Production Planning
router.get('/root-cards', productionController.getRootCards);
router.get('/root-cards/:id', productionController.getRootCardById);
router.post('/root-cards/:id/stages', productionController.addProductionOperation);
router.put('/root-cards/:id/stages/:operationId', productionController.updateProductionOperation);
router.delete('/root-cards/:id/stages/:operationId', productionController.deleteProductionOperation);

// Operations Routes
router.get('/operations', productionController.getOperations);
router.post('/operations', productionController.createOperation);
router.delete('/operations/:id', productionController.deleteOperation);

// Daily Planning Routes
router.get('/plans', productionController.getDailyPlans);
router.post('/plans', productionController.createDailyPlan);
router.get('/plans/:id', productionController.getDailyPlanDetails);
router.put('/plans/:id', productionController.updateDailyPlan);
router.delete('/plans/:id', productionController.deleteDailyPlan);
router.post('/assignments', productionController.addAssignment);
router.put('/assignments/:id', productionController.updateAssignment);
router.delete('/assignments/:id', productionController.deleteAssignment);

// Production Update Routes
router.get('/updates', productionController.getProductionUpdates);
router.post('/updates', productionController.createProductionUpdate);
router.post('/send-to-qc', productionController.sendToQC);
router.post('/send-fabrication-to-qc', productionController.sendFabricationToQC);

// MCR Routes
router.get('/mcr/materials', productionController.getReleasedMaterialsForMCR);
router.get('/mcr/summary', productionController.getCombinedMCRSummary);
router.get('/mcr/combined', productionController.getCombinedMCRReport);
router.get('/mcr/:plan_id', productionController.getMCRDetails);
router.post('/mcr/save', productionController.saveMCR);

// Labor & Work Log Routes
router.get('/labor/employees-summary', productionController.getLaborEmployeesSummary);
router.get('/labor/employee/:id/logs', productionController.getEmployeeLaborLogs);

// Outward Challan Routes
router.post('/outward-challans', productionController.createOutwardChallan);
router.get('/outward-challans', productionController.getOutwardChallans);
router.get('/outward-challans/:id', productionController.getOutwardChallanDetails);

// Inward Challan Routes
router.post('/inward-challans', productionController.createInwardChallan);
router.get('/inward-challans', productionController.getInwardChallans);
router.get('/inward-challans/:id', productionController.getInwardChallanDetails);

module.exports = router;
