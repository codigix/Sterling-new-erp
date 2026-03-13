const express = require('express');
const router = express.Router();
const materialRequestController = require('../controllers/materialRequestController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, materialRequestController.getMaterialRequests);
router.get('/:id', authMiddleware, materialRequestController.getMaterialRequestById);
router.post('/', authMiddleware, materialRequestController.createMaterialRequest);
router.patch('/:id/status', authMiddleware, materialRequestController.updateRequestStatus);

module.exports = router;
