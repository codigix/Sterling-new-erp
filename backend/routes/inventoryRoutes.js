const express = require('express');
const router = express.Router();
const { 
    createStockEntry, 
    getStockEntries, 
    getStockMovements,
    getWarehouses, 
    getStockBalance,
    getInventoryPortalData
} = require('../controllers/inventoryController');
const auth = require('../middleware/authMiddleware');

router.get('/stock-entries', auth, getStockEntries);
router.get('/stock-movements', auth, getStockMovements);
router.post('/stock-entries', auth, createStockEntry);
router.get('/warehouses', auth, getWarehouses);
router.get('/materials', auth, getStockBalance);
router.get('/stock', auth, getInventoryPortalData);

module.exports = router;
