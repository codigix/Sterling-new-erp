const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { 
    getPurchaseOrders, 
    getPurchaseOrderById, 
    createPurchaseOrder, 
    updatePurchaseOrder,
    updatePurchaseOrderStatus, 
    deletePurchaseOrder,
    getPurchaseOrderStats,
    sendPurchaseOrderEmail,
    getCommunications,
    downloadAttachment,
    uploadInvoice,
    createPurchaseReceipt,
    getPurchaseReceipts,
    getPurchaseReceiptById,
    getInventorySerials
} = require('../controllers/purchaseOrderController');

const auth = require('../middleware/authMiddleware');

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../', process.env.UPLOAD_PATH || 'uploads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.xls', '.xlsx', '.doc', '.docx', '.csv', '.zip', '.rar'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Please upload PDF, images, or documents.'), false);
    }
  }
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: `Multer error: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

router.get('/', auth, getPurchaseOrders);
router.get('/stats/summary', auth, getPurchaseOrderStats);
router.get('/receipts/all', auth, getPurchaseReceipts);
router.get('/receipts/serials', auth, getInventorySerials);
router.get('/receipts/:id', auth, getPurchaseReceiptById);
router.post('/receipts', auth, createPurchaseReceipt);
router.get('/:id', auth, getPurchaseOrderById);
router.post('/', auth, createPurchaseOrder);
router.put('/:id', auth, updatePurchaseOrder);
router.patch('/:id/status', auth, updatePurchaseOrderStatus);
router.post('/:id/email', auth, sendPurchaseOrderEmail);
router.get('/:id/communications', auth, getCommunications);
router.get('/attachments/:id/download', auth, downloadAttachment);
router.delete('/:id', auth, deletePurchaseOrder);

router.post('/:id/invoices', auth, (req, res, next) => {
  upload.array('files')(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
}, uploadInvoice);

module.exports = router;
