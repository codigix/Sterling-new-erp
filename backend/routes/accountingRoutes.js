const express = require("express");
const router = express.Router();
const accountingController = require("../controllers/accountingController");
const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");

// Multer storage configuration for project documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve(__dirname, '../', process.env.UPLOAD_PATH || 'uploads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.pdf', '.dwg', '.dxf', '.jpg', '.jpeg', '.png', '.xls', '.xlsx', '.doc', '.docx', '.csv', '.zip', '.rar', '.step', '.stp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed.'), false);
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

// All accounting routes are protected
router.use(authMiddleware);

router.get("/vendor-invoices", accountingController.getVendorInvoices);
router.get("/vendor-invoices/eligible-challans", accountingController.getEligibleOutwardChallans);
router.get("/vendor-invoices/challans/:id", accountingController.getOutwardChallanDetails);
router.get("/vendor-invoices/pending", accountingController.getPendingInvoices);
router.get("/vendor-invoices/next-number", accountingController.getNextInvoiceNumber);
router.get("/vendor-invoices/:id", accountingController.getVendorInvoiceById);
router.post("/vendor-invoices", accountingController.createVendorInvoice);

router.get("/vendor-payments", accountingController.getVendorPayments);
router.get("/vendor-payments/next-number", accountingController.getNextPaymentNumber);
router.get("/vendor-payments/:id", accountingController.getVendorPaymentById);
router.post("/vendor-payments", accountingController.createVendorPayment);

// Customer Routes
router.get("/customer-invoices", accountingController.getCustomerInvoices);
router.get("/customer-invoices/next-number", accountingController.getNextCustomerInvoiceNumber);
router.get("/customer-invoices/selection", accountingController.getInvoicesForSelection);
router.get("/customer-invoices/:id", accountingController.getCustomerInvoiceById);
router.post("/customer-invoices", accountingController.createCustomerInvoice);
router.put("/customer-invoices/:id", accountingController.updateCustomerInvoice);

router.get("/customer-payments", accountingController.getCustomerPayments);
router.get("/customer-payments/next-number", accountingController.getNextReceiptNumber);
router.post("/customer-payments", accountingController.createCustomerPayment);

router.get("/ledger-entries", accountingController.getLedgerEntries);

router.get("/projects", accountingController.getProjects);

// Project Documents Routes
router.get("/project-documents", accountingController.getProjectDocuments);
router.post("/project-documents", (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
}, accountingController.createProjectDocument);
router.put("/project-documents/:id", (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
}, accountingController.updateProjectDocument);
router.delete("/project-documents/:id", accountingController.deleteProjectDocument);

// Dashboard Stats Route
router.get("/dashboard-stats", accountingController.getDashboardStats);

// Reminder Routes
router.get("/reminders", accountingController.getReminders);
router.post("/reminders", accountingController.createReminder);
router.delete("/reminders/:id", accountingController.deleteReminder);

module.exports = router;
