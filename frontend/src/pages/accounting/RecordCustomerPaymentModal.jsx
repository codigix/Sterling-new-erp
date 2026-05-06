import React, { useState, useEffect } from "react";
import { X, Save, DollarSign } from "lucide-react";
import toastUtils from "../../utils/toastUtils";
import axios from "../../utils/api";
import SearchableSelect from "../../components/ui/SearchableSelect";

const RecordCustomerPaymentModal = ({ isOpen, onClose, onPaymentRecorded, editData = null, initialViewMode = false }) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [invoices, setInvoices] = useState([]);

  const [formData, setFormData] = useState({
    receipt_number: "",
    invoice_id: "",
    customer_name: "",
    received_date: new Date().toISOString().split('T')[0],
    amount_received: "",
    payment_method: "NEFT/Bank Transfer",
    transaction_ref: "",
    notes: ""
  });

  useEffect(() => {
    if (isOpen) {
      setViewMode(initialViewMode);
      fetchInvoices();
      if (editData) {
        setFormData({
          receipt_number: editData.id || "",
          invoice_id: editData.invoice_id || "",
          customer_name: editData.customer_name || editData.customer || "",
          received_date: editData.received_date ? editData.received_date.split('T')[0] : (editData.date || new Date().toISOString().split('T')[0]),
          amount_received: editData.amount_received || editData.amount || "",
          payment_method: editData.payment_method || editData.method || "NEFT/Bank Transfer",
          transaction_ref: editData.transaction_ref || "",
          notes: editData.notes || ""
        });
      } else {
        fetchNextReceiptNumber();
        setFormData({
          receipt_number: "",
          invoice_id: "",
          customer_name: "",
          received_date: new Date().toISOString().split('T')[0],
          amount_received: "",
          payment_method: "NEFT/Bank Transfer",
          transaction_ref: "",
          notes: ""
        });
      }
    }
  }, [isOpen, editData, initialViewMode]);

  const fetchInvoices = async () => {
    try {
      const response = await axios.get("/accounting/customer-invoices/selection");
      setInvoices(response.data.invoices || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    }
  };

  const fetchNextReceiptNumber = async () => {
    try {
      const response = await axios.get("/accounting/customer-payments/next-number");
      setFormData(prev => ({ ...prev, receipt_number: response.data.nextReceiptNumber }));
    } catch (error) {
      console.error("Error fetching next receipt number:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleInvoiceChange = (invoiceId) => {
    const invoice = invoices.find(inv => inv.id === parseInt(invoiceId));
    setFormData(prev => ({
      ...prev,
      invoice_id: invoiceId,
      customer_name: invoice ? invoice.customer_name : prev.customer_name,
      amount_received: invoice ? invoice.balance_amount : prev.amount_received
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post("/accounting/customer-payments", formData);
      toastUtils.success("Payment receipt recorded successfully");
      if (onPaymentRecorded) onPaymentRecorded();
      onClose();
    } catch (error) {
      console.error("Error submitting payment:", error);
      toastUtils.error(error.response?.data?.message || "Failed to record receipt");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded shadow-2xl w-full max-w-lg overflow-auto max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200 text-left">
        {/* Header */}
        <div className="p-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <DollarSign size={20} />
            </div>
            <div>
              <h2 className="text-lg  text-slate-900 dark:text-white">
                {viewMode ? 'View Receipt' : (editData ? 'Edit Receipt' : 'Record Customer Payment')}
              </h2>
              <p className="text-xs text-slate-500">Log incoming payment from a customer</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 text-left">
                <label className="text-[10px]   text-slate-400">Receipt #</label>
                <input
                  type="text"
                  name="receipt_number"
                  value={formData.receipt_number}
                  onChange={handleInputChange}
                  readOnly={viewMode}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  required
                />
              </div>
              <div className="space-y-1.5 text-left">
                <label className="text-[10px]   text-slate-400">Received Date</label>
                <input
                  type="date"
                  name="received_date"
                  value={formData.received_date}
                  onChange={handleInputChange}
                  readOnly={viewMode}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[10px]   text-slate-400">Select Invoice (Optional)</label>
              <SearchableSelect
                options={invoices.map(inv => ({
                  value: inv.id,
                  label: `${inv.invoice_number} - ${inv.customer_name} (Bal: ₹${parseFloat(inv.balance_amount).toLocaleString()})`
                }))}
                value={formData.invoice_id}
                onChange={handleInvoiceChange}
                placeholder="Search invoice..."
                disabled={viewMode}
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[10px]   text-slate-400">Customer Name</label>
              <input
                type="text"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleInputChange}
                readOnly={viewMode}
                placeholder="Enter customer name"
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 text-left">
                <label className="text-[10px]   text-slate-400">Amount Received (₹)</label>
                <input
                  type="number"
                  name="amount_received"
                  value={formData.amount_received}
                  onChange={handleInputChange}
                  readOnly={viewMode}
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs  text-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-1.5 text-left">
                <label className="text-[10px]   text-slate-400">Payment Method</label>
                <select
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleInputChange}
                  disabled={viewMode}
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none"
                >
                  <option value="NEFT/Bank Transfer">NEFT/Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[10px]   text-slate-400">Transaction Reference / UTR</label>
              <input
                type="text"
                name="transaction_ref"
                value={formData.transaction_ref}
                onChange={handleInputChange}
                readOnly={viewMode}
                placeholder="UTR No. or Cheque Details"
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[10px]   text-slate-400">Internal Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                readOnly={viewMode}
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs h-20 resize-none outline-none"
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
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded text-xs  hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
              >
                <Save size={16} />
                {submitting ? 'Saving...' : 'Record Receipt'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordCustomerPaymentModal;
