const express = require('express');
const router = express.Router();
const { 
    createStockEntry, 
    getStockEntries, 
    getStockMovements,
    getWarehouses, 
    getStockBalance,
    getInventoryPortalData,
    addManualStock
} = require('../controllers/inventoryController');
const auth = require('../middleware/authMiddleware');

router.get('/stock-entries', auth, getStockEntries);
router.get('/stock-movements', auth, getStockMovements);
router.post('/stock-entries', auth, createStockEntry);
router.post('/manual-stock', auth, addManualStock);
router.post('/materials/manual', auth, addManualStock);
router.get('/warehouses', auth, getWarehouses);
router.get('/materials', auth, getStockBalance);
router.get('/stock', auth, getInventoryPortalData);

module.exports = router;
