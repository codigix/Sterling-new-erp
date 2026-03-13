const express = require('express');
const router = express.Router();
const bomController = require('../controllers/bomController');
const authMiddleware = require('../middleware/authMiddleware');

// Base path will be /api/engineering/bom/comprehensive in server.js
// but since the frontend calls /engineering/bom/comprehensive directly with axios.baseURL = /api,
// I should probably register it carefully.

router.get('/', authMiddleware, bomController.getBOMs);
router.get('/:bomId', authMiddleware, bomController.getBOMById);
router.post('/', authMiddleware, bomController.createBOM);
router.put('/:bomId', authMiddleware, bomController.updateBOM);
router.delete('/:bomId', authMiddleware, bomController.deleteBOM);

module.exports = router;
