const express = require('express');
const router = express.Router();
const {
    getQuotations,
    getQuotationById,
    createQuotation,
    getQuotationStats,
    getVendors,
    analyzeQuotation,
    getCommunications
} = require('../controllers/quotationController');
const auth = require('../middleware/authMiddleware');

// @route   GET api/department/procurement/vendors
// This will be called when base is /api/department/procurement/vendors
router.get('/', auth, (req, res, next) => {
    if (req.baseUrl.endsWith('/vendors')) {
        return getVendors(req, res);
    }
    next();
});

// @route   GET api/department/procurement/quotations/vendors
router.get('/vendors', auth, getVendors);

// @route   GET api/department/procurement/quotations
router.get('/', auth, getQuotations);

// @route   GET api/department/procurement/quotations/stats
router.get('/stats', auth, getQuotationStats);

// @route   POST api/department/procurement/quotations
router.post('/', auth, createQuotation);

// @route   GET api/department/procurement/quotations/:id
router.get('/:id', auth, getQuotationById);

// @route   POST api/department/procurement/quotations/analyze
router.post('/analyze', auth, analyzeQuotation);

// @route   GET api/department/procurement/quotations/:id/communications
router.get('/:id/communications', auth, getCommunications);

module.exports = router;
