const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
    getQuotations,
    getQuotationById,
    createQuotation,
    getQuotationStats,
    getVendors,
    getVendorById,
    getVendorStats,
    getVendorCategories,
    createVendor,
    updateVendor,
    deleteVendor,
    analyzeQuotation,
    getCommunications,
    downloadAttachment,
    sendQuotationEmail,
    updateQuotationStatus,
    downloadReceivedQuotation,
    deleteQuotation
} = require('../controllers/quotationController');
const auth = require('../middleware/authMiddleware');

// Multer storage configuration for temporary analysis and uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = process.env.UPLOAD_PATH || 'uploads/';
        cb(null, path.resolve(__dirname, '../', uploadPath));
    },
    filename: (req, file, cb) => {
        const prefix = file.fieldname === 'received_quotation' ? 'quote-' : 'analysis-';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF and images are allowed'), false);
        }
    }
});

// @route   GET api/department/procurement/vendors
// This will be called when base is /api/department/procurement/vendors
router.get('/', auth, (req, res, next) => {
    if (req.baseUrl.endsWith('/vendors')) {
        return getVendors(req, res);
    }
    next();
});

// Vendor specific management routes (when base is /api/department/procurement/vendors)
router.get('/stats', auth, (req, res, next) => {
    if (req.baseUrl.endsWith('/vendors')) {
        return getVendorStats(req, res);
    }
    next();
});

router.get('/categories', auth, (req, res, next) => {
    if (req.baseUrl.endsWith('/vendors')) {
        return getVendorCategories(req, res);
    }
    next();
});

router.post('/', auth, (req, res, next) => {
    if (req.baseUrl.endsWith('/vendors')) {
        return createVendor(req, res);
    }
    next();
});

router.get('/:id', auth, (req, res, next) => {
    if (req.baseUrl.endsWith('/vendors')) {
        return getVendorById(req, res);
    }
    next();
});

router.put('/:id', auth, (req, res, next) => {
    if (req.baseUrl.endsWith('/vendors')) {
        return updateVendor(req, res);
    }
    next();
});

router.delete('/:id', auth, (req, res, next) => {
    if (req.baseUrl.endsWith('/vendors')) {
        return deleteVendor(req, res);
    }
    // Otherwise it's a quotation deletion
    return deleteQuotation(req, res);
});

// @route   GET api/department/procurement/quotations/vendors
router.get('/vendors', auth, getVendors);

// @route   GET api/department/procurement/quotations
router.get('/', auth, getQuotations);

// @route   GET api/department/procurement/quotations/stats
router.get('/stats', auth, getQuotationStats);

// @route   POST api/department/procurement/quotations
router.post('/', auth, createQuotation);

// @route   GET api/department/procurement/quotations/:id/download
router.get('/:id/download', auth, downloadReceivedQuotation);

// @route   GET api/department/procurement/quotations/:id
router.get('/:id', auth, getQuotationById);

// @route   PATCH api/department/procurement/quotations/:id/status
router.patch('/:id/status', auth, upload.single('received_quotation'), updateQuotationStatus);

// @route   GET api/department/procurement/quotations/communications/attachment/:id
router.get('/communications/attachment/:id', auth, downloadAttachment);

module.exports = router;
