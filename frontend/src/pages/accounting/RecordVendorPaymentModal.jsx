import React, { useState, useEffect } from "react";
import { X, Save, RefreshCw, FileText, Calendar, CreditCard, DollarSign } from "lucide-react";
import axios from "../../utils/api";
import Swal from "sweetalert2";
import toastUtils from "../../utils/toastUtils";
import SearchableSelect from "../../components/ui/SearchableSelect";

const RecordVendorPaymentModal = ({ isOpen, onClose, onPaymentRecorded, editData = null, initialViewMode = false }) => {
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState(initialViewMode);

  const [formData, setFormData] = useState({
    payment_number: "",
    invoice_id: "",
    vendor_id: "",
    vendor_name: "",
    ref_invoice_no: "",
    invoice_amount: 0,
    paid_already: 0,
    balance_amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    amount_paid: "",
    payment_method: "Bank Transfer",
    reference_number: "",
    notes: ""
  });

  useEffect(() => {
    if (isOpen) {
      setViewMode(initialViewMode);
      if (editData) {
        fetchPaymentDetails(editData.id);
      } else {
        fetchPendingInvoices();
        fetchNextPaymentNumber();
        // Reset form
        setFormData({
          payment_number: "",
          invoice_id: "",
          vendor_id: "",
          vendor_name: "",
          ref_invoice_no: "",
          invoice_amount: 0,
          paid_already: 0,
          balance_amount: 0,
          payment_date: new Date().toISOString().split('T')[0],
          amount_paid: "",
          payment_method: "Bank Transfer",
          reference_number: "",
          notes: ""
        });
      }
    }
  }, [isOpen, editData, initialViewMode]);

  const fetchPaymentDetails = async (id) => {
    setLoading(true);
    try {
      const response = await axios.get(`/accounting/vendor-payments/${id}`);
      const pay = response.data;
      setFormData({
        payment_number: pay.payment_number,
        invoice_id: pay.invoice_id,
        vendor_id: pay.vendor_id,
        vendor_name: pay.vendor_name,
        ref_invoice_no: pay.ref_invoice_no,
        invoice_amount: parseFloat(pay.invoice_amount || 0),
        paid_already: 0, // Not strictly needed for view
        balance_amount: 0, // Not strictly needed for view
        payment_date: pay.payment_date.split('T')[0],
        amount_paid: parseFloat(pay.amount_paid),
        payment_method: pay.payment_method,
        reference_number: pay.reference_number || "",
        notes: pay.notes || ""
      });
    } catch (error) {
      console.error("Error fetching payment details:", error);
      toastUtils.error("Failed to load payment details");
    } finally {
      setLoading(false);
    }
  };

  const fetchNextPaymentNumber = async () => {
    try {
      const response = await axios.get("/accounting/vendor-payments/next-number");
      setFormData(prev => ({
        ...prev,
        payment_number: response.data.nextPaymentNumber
      }));
    } catch (error) {
      console.error("Error fetching next payment number:", error);
    }
  };

  const fetchPendingInvoices = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/accounting/vendor-invoices/pending");
      setPendingInvoices(response.data.invoices || []);
    } catch (error) {
      console.error("Error fetching pending invoices:", error);
      toastUtils.error("Failed to load pending invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceChange = (invoiceId) => {
    if (!invoiceId) {
      setFormData(prev => ({
        ...prev,
        invoice_id: "",
        vendor_id: "",
        vendor_name: "",
        ref_invoice_no: "",
        invoice_amount: 0,
        paid_already: 0,
        balance_amount: 0,
        amount_paid: ""
      }));
      return;
    }

    const invoice = pendingInvoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      setFormData(prev => ({
        ...prev,
        invoice_id: invoiceId,
        vendor_id: invoice.vendor_id,
        vendor_name: invoice.vendor_name,
        ref_invoice_no: invoice.invoice_number,
        invoice_amount: parseFloat(invoice.grand_total),
        paid_already: parseFloat(invoice.paid_amount),
        balance_amount: parseFloat(invoice.balance_amount),
        amount_paid: parseFloat(invoice.balance_amount) // Default to full remaining balance
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.invoice_id) {
      toastUtils.error("Please select an Invoice");
      return;
    }
    if (!formData.amount_paid || parseFloat(formData.amount_paid) <= 0) {
      toastUtils.error("Please enter a valid amount");
      return;
    }
    if (parseFloat(formData.amount_paid) > formData.balance_amount) {
      toastUtils.error("Amount cannot exceed remaining balance");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post("/accounting/vendor-payments", {
        payment_number: formData.payment_number,
        invoice_id: formData.invoice_id,
        vendor_id: formData.vendor_id,
        payment_date: formData.payment_date,
        amount_paid: formData.amount_paid,
        payment_method: formData.payment_method,
        reference_number: formData.reference_number,
        notes: formData.notes
      });
      
      Swal.fire({
        title: "Success!",
        text: "Vendor payment recorded successfully",
        icon: "success",
        confirmButtonColor: "#3B82F6"
      });
      
      if (onPaymentRecorded) onPaymentRecorded();
      onClose();
    } catch (error) {
      console.error("Error recording payment:", error);
      toastUtils.error("Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded shadow-2xl w-full max-w-lg overflow-auto flex max-h-[90vh] overflow-auto flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <DollarSign size={20} />
            </div>
            <div>
              <h2 className="text-lg  text-slate-900 dark:text-white">Record Vendor Payment</h2>
              <p className="text-xs text-slate-500">Log a payment made against an invoice</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            {/* Payment Number & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px]   text-slate-400">Payment #</label>
                <input
                  type="text"
                  name="payment_number"
                  value={formData.payment_number}
                  onChange={handleInputChange}
                  readOnly={viewMode}
                  className={`w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 outline-none ${viewMode ? 'cursor-default' : ''}`}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px]   text-slate-400">Payment Date</label>
                <input
                  type="date"
                  name="payment_date"
                  value={formData.payment_date}
                  onChange={handleInputChange}
                  readOnly={viewMode}
                  className={`w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none ${viewMode ? 'cursor-default' : ''}`}
                  required
                />
              </div>
            </div>

            {/* Invoice Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px]   text-slate-400">Select Invoice to Pay</label>
              {viewMode ? (
                <div className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono">
                  {formData.ref_invoice_no}
                </div>
              ) : (
                <SearchableSelect
                  options={pendingInvoices.map(inv => ({
                    value: inv.id,
                    label: inv.invoice_number,
                    subLabel: `${inv.vendor_name} | Balance: ₹${parseFloat(inv.balance_amount).toLocaleString()}`
                  }))}
                  value={formData.invoice_id}
                  onChange={handleInvoiceChange}
                  placeholder="Search Invoice Number..."
                  loading={loading}
                />
              )}
            </div>

            {/* Summary details if invoice selected */}
            {formData.invoice_id && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Vendor:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{formData.vendor_name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Invoice Amount:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">₹{formData.invoice_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Remaining Balance:</span>
                  <span className=" text-red-600">₹{formData.balance_amount.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Payment Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px]   text-slate-400">Amount to Pay (₹)</label>
                <input
                  type="number"
                  name="amount_paid"
                  value={formData.amount_paid}
                  onChange={handleInputChange}
                  readOnly={viewMode}
                  className={`w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs  focus:ring-2 focus:ring-emerald-500/20 outline-none text-emerald-600 ${viewMode ? 'cursor-default' : ''}`}
                  placeholder="0.00"
                  max={viewMode ? undefined : formData.balance_amount}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px]   text-slate-400">Payment Method</label>
                <select
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleInputChange}
                  disabled={viewMode}
                  className={`w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none ${viewMode ? 'cursor-default appearance-none' : ''}`}
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px]   text-slate-400">Reference / Transaction #</label>
              <input
                type="text"
                name="reference_number"
                value={formData.reference_number}
                onChange={handleInputChange}
                readOnly={viewMode}
                className={`w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none ${viewMode ? 'cursor-default' : ''}`}
                placeholder="UTR No. / Cheque No."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px]   text-slate-400">Internal Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                readOnly={viewMode}
                className={`w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs h-20 resize-none outline-none ${viewMode ? 'cursor-default' : ''}`}
                placeholder="Any remarks..."
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs  hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              {viewMode ? 'Close' : 'Cancel'}
            </button>
            {!viewMode && (
              <button
                type="submit"
                disabled={submitting || loading}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded text-xs  hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
              >
                {submitting ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                Record Payment
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordVendorPaymentModal;
