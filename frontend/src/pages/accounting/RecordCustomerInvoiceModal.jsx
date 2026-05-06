import React, { useState, useEffect } from "react";
import { X, Save, Plus, Trash2, Calculator } from "lucide-react";
import toastUtils from "../../utils/toastUtils";
import axios from "../../utils/api";
import SearchableSelect from "../../components/ui/SearchableSelect";

const RecordCustomerInvoiceModal = ({ isOpen, onClose, onInvoiceRecorded, editData = null, initialViewMode = false }) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [projects, setProjects] = useState([]);

  const [formData, setFormData] = useState({
    invoice_number: "",
    customer_name: "",
    project_id: "",
    project_name: "",
    invoice_date: new Date().toISOString().split('T')[0],
    place_of_supply: "Maharashtra (27)",
    sub_total: 0,
    taxable_value: 0,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 0,
    grand_total: 0,
    round_off: 0,
    notes: "",
    items: [{ description: "", hsn_code: "", qty: 1, unit: "NOS", rate: 0, amount: 0 }]
  });

  useEffect(() => {
    if (isOpen) {
      setViewMode(initialViewMode);
      fetchProjects();
      if (editData) {
        fetchInvoiceDetails(editData.id);
      } else {
        fetchNextInvoiceNumber();
        // Reset form for new entry
        setFormData({
          invoice_number: "",
          customer_name: "",
          project_id: "",
          project_name: "",
          invoice_date: new Date().toISOString().split('T')[0],
          place_of_supply: "Maharashtra (27)",
          sub_total: 0,
          taxable_value: 0,
          cgst_amount: 0,
          sgst_amount: 0,
          igst_amount: 0,
          grand_total: 0,
          round_off: 0,
          notes: "",
          items: [{ description: "", hsn_code: "", qty: 1, unit: "NOS", rate: 0, amount: 0 }]
        });
      }
    }
  }, [isOpen, editData, initialViewMode]);

  const fetchProjects = async () => {
    try {
      const response = await axios.get("/accounting/projects");
      setProjects(response.data.projects || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const fetchNextInvoiceNumber = async () => {
    try {
      const response = await axios.get("/accounting/customer-invoices/next-number");
      setFormData(prev => ({ ...prev, invoice_number: response.data.nextInvoiceNumber }));
    } catch (error) {
      console.error("Error fetching next invoice number:", error);
    }
  };

  const fetchInvoiceDetails = async (id) => {
    setLoading(true);
    try {
      const response = await axios.get(`/accounting/customer-invoices/${id}`);
      const inv = response.data;
      setFormData({
        ...inv,
        invoice_date: inv.invoice_date.split('T')[0],
        sub_total: parseFloat(inv.sub_total),
        taxable_value: parseFloat(inv.taxable_value),
        cgst_amount: parseFloat(inv.cgst_amount),
        sgst_amount: parseFloat(inv.sgst_amount),
        grand_total: parseFloat(inv.grand_total),
        round_off: parseFloat(inv.round_off)
      });
    } catch (error) {
      console.error("Error fetching invoice details:", error);
      toastUtils.error("Failed to load invoice details");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProjectChange = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    setFormData(prev => ({
      ...prev,
      project_id: projectId,
      project_name: project ? project.project_name : ""
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;

    if (field === 'qty' || field === 'rate') {
      newItems[index].amount = (parseFloat(newItems[index].qty) || 0) * (parseFloat(newItems[index].rate) || 0);
    }

    setFormData(prev => ({ ...prev, items: newItems }));
    calculateTotals(newItems);
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: "", hsn_code: "", qty: 1, unit: "NOS", rate: 0, amount: 0 }]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length === 1) return;
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, items: newItems }));
    calculateTotals(newItems);
  };

  const calculateTotals = (items) => {
    const subTotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const cgst = subTotal * 0.09;
    const sgst = subTotal * 0.09;
    const total = subTotal + cgst + sgst;
    const roundedTotal = Math.round(total);
    const roundOff = roundedTotal - total;

    setFormData(prev => ({
      ...prev,
      sub_total: subTotal,
      taxable_value: subTotal,
      cgst_amount: cgst,
      sgst_amount: sgst,
      grand_total: roundedTotal,
      round_off: roundOff
    }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post("/accounting/customer-invoices", formData);
      toastUtils.success("Customer invoice recorded successfully");
      if (onInvoiceRecorded) onInvoiceRecorded();
      onClose();
    } catch (error) {
      console.error("Error submitting invoice:", error);
      toastUtils.error(error.response?.data?.message || "Failed to record invoice");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200 text-left">
        {/* Header */}
        <div className="p-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <Calculator size={20} />
            </div>
            <div>
              <h2 className="text-lg  text-slate-900 dark:text-white">
                {viewMode ? 'View Customer Invoice' : (editData ? 'Edit Customer Invoice' : 'Create Customer Invoice')}
              </h2>
              <p className="text-xs text-slate-500 text-left">Generate tax invoice for sales and services</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Top Section: Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px]   text-slate-400">Invoice Number</label>
                  <input
                    type="text"
                    name="invoice_number"
                    value={formData.invoice_number}
                    onChange={handleInputChange}
                    readOnly={viewMode}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono focus:ring-2 focus:ring-blue-500/20 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px]   text-slate-400">Invoice Date</label>
                  <input
                    type="date"
                    name="invoice_date"
                    value={formData.invoice_date}
                    onChange={handleInputChange}
                    readOnly={viewMode}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-2 focus:ring-blue-500/20 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px]   text-slate-400">Place of Supply</label>
                  <input
                    type="text"
                    name="place_of_supply"
                    value={formData.place_of_supply}
                    onChange={handleInputChange}
                    readOnly={viewMode}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px]   text-slate-400">Customer Name</label>
                  <input
                    type="text"
                    name="customer_name"
                    value={formData.customer_name}
                    onChange={handleInputChange}
                    readOnly={viewMode}
                    placeholder="Enter customer name"
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-2 focus:ring-blue-500/20 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px]   text-slate-400">Select Project</label>
                  <SearchableSelect
                    options={projects.map(p => ({
                      value: p.id,
                      label: `${p.project_name} (${p.project_code || 'N/A'})`
                    }))}
                    value={formData.project_id}
                    onChange={handleProjectChange}
                    placeholder="Search project..."
                    disabled={viewMode}
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px]   text-slate-400 tracking-wider">Invoice Items</label>
                  {!viewMode && (
                    <button
                      type="button"
                      onClick={addItem}
                      className="flex items-center gap-1.5 px-3 py-1 text-xs  text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Plus size={14} /> Add Item
                    </button>
                  )}
                </div>
                
                <div className="border border-slate-100 dark:border-slate-800 rounded overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                        <th className="px-4 py-2 text-[10px]  text-slate-400  w-12 text-center">Sr.</th>
                        <th className="px-4 py-2 text-[10px]  text-slate-400 ">Description</th>
                        <th className="px-4 py-2 text-[10px]  text-slate-400  w-24">HSN</th>
                        <th className="px-4 py-2 text-[10px]  text-slate-400  w-24 text-center">Qty</th>
                        <th className="px-4 py-2 text-[10px]  text-slate-400  w-20">Unit</th>
                        <th className="px-4 py-2 text-[10px]  text-slate-400  w-32 text-right">Rate (₹)</th>
                        <th className="px-4 py-2 text-[10px]  text-slate-400  w-32 text-right">Amount (₹)</th>
                        {!viewMode && <th className="px-4 py-2 text-[10px]  text-slate-400  w-12"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                      {formData.items.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-2 text-center text-xs font-medium text-slate-400">{index + 1}</td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                              readOnly={viewMode}
                              className="w-full bg-transparent border-none text-xs focus:ring-0 outline-none p-0 text-slate-700 dark:text-slate-200"
                              placeholder="Item description..."
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={item.hsn_code}
                              onChange={(e) => handleItemChange(index, 'hsn_code', e.target.value)}
                              readOnly={viewMode}
                              className="w-full bg-transparent border-none text-xs focus:ring-0 outline-none p-0 text-slate-700 dark:text-slate-200"
                              placeholder="HSN"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={item.qty}
                              onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                              readOnly={viewMode}
                              className="w-full bg-transparent border-none text-xs focus:ring-0 outline-none p-0 text-center text-slate-700 dark:text-slate-200"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                              readOnly={viewMode}
                              className="w-full bg-transparent border-none text-xs focus:ring-0 outline-none p-0 text-slate-700 dark:text-slate-200 "
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={item.rate}
                              onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                              readOnly={viewMode}
                              className="w-full bg-transparent border-none text-xs focus:ring-0 outline-none p-0 text-right text-slate-700 dark:text-slate-200"
                            />
                          </td>
                          <td className="px-4 py-2 text-right text-xs  text-slate-700 dark:text-slate-200">
                            ₹{(parseFloat(item.amount) || 0).toLocaleString()}
                          </td>
                          {!viewMode && (
                            <td className="px-4 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="text-slate-300 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Section: Totals & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                <div className="space-y-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px]   text-slate-400">Additional Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      readOnly={viewMode}
                      placeholder="Terms, bank details or internal remarks..."
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs h-32 resize-none outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded p-6 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Sub Total</span>
                    <span className=" text-slate-700 dark:text-slate-200">₹{formData.sub_total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Taxable Value</span>
                    <span className=" text-slate-700 dark:text-slate-200">₹{formData.taxable_value.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">CGST @ 9%</span>
                    <span className=" text-slate-700 dark:text-slate-200">₹{formData.cgst_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">SGST @ 9%</span>
                    <span className=" text-slate-700 dark:text-slate-200">₹{formData.sgst_amount.toLocaleString()}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-sm  text-slate-900 dark:text-white">Grand Total</span>
                    <span className="text-lg font-black text-blue-600">₹{formData.grand_total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 italic">
                    <span>Round off: {formData.round_off.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm  text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            {viewMode ? 'Close' : 'Cancel'}
          </button>
          {!viewMode && (
            <button
              onClick={handleSubmit}
              disabled={submitting || loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm  rounded-lg transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              <Save size={16} />
              {submitting ? 'Saving...' : (editData ? 'Update Invoice' : 'Create Invoice')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecordCustomerInvoiceModal;
