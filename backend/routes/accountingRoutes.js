const express = require("express");
const router = express.Router();
const accountingController = require("../controllers/accountingController");
const authMiddleware = require("../middleware/authMiddleware");

// All accounting routes are protected
router.use(authMiddleware);

router.get("/vendor-invoices", accountingController.getVendorInvoices);
router.get("/vendor-invoices/pending", accountingController.getPendingInvoices);
router.get("/vendor-invoices/next-number", accountingController.getNextInvoiceNumber);
router.get("/vendor-invoices/:id", accountingController.getVendorInvoiceById);
router.post("/vendor-invoices", accountingController.createVendorInvoice);

router.get("/vendor-payments", accountingController.getVendorPayments);
router.get("/vendor-payments/next-number", accountingController.getNextPaymentNumber);
router.get("/vendor-payments/:id", accountingController.getVendorPaymentById);
router.post("/vendor-payments", accountingController.createVendorPayment);

module.exports = router;
