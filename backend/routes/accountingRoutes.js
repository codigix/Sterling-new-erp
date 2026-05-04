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

// Customer Routes
router.get("/customer-invoices", accountingController.getCustomerInvoices);
router.get("/customer-invoices/next-number", accountingController.getNextCustomerInvoiceNumber);
router.get("/customer-invoices/selection", accountingController.getInvoicesForSelection);
router.get("/customer-invoices/:id", accountingController.getCustomerInvoiceById);
router.post("/customer-invoices", accountingController.createCustomerInvoice);

router.get("/customer-payments", accountingController.getCustomerPayments);
router.get("/customer-payments/next-number", accountingController.getNextReceiptNumber);
router.post("/customer-payments", accountingController.createCustomerPayment);

router.get("/ledger-entries", accountingController.getLedgerEntries);

router.get("/projects", accountingController.getProjects);

module.exports = router;
