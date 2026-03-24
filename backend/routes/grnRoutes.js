const express = require('express');
const router = express.Router();
const { 
    addGRNToStock,
    approveGRN,
    getPurchaseReceiptById,
    releaseGRNMaterial
} = require('../controllers/purchaseOrderController');
const auth = require('../middleware/authMiddleware');

router.get('/:id', auth, getPurchaseReceiptById);
router.post('/:id/approve', auth, approveGRN);
router.post('/:id/add-to-stock', auth, addGRNToStock);
router.post('/:id/release-material', auth, releaseGRNMaterial);

module.exports = router;
