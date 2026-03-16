import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Plus, Trash2, CheckCircle, Calendar, DollarSign, User, Package, FileText, Save, Edit, RefreshCw, Eye } from "lucide-react";
import axios from "../../utils/api";
import Swal from "sweetalert2";
import toastUtils from "../../utils/toastUtils";
import { useRootCardInventoryTask } from "../../hooks/useRootCardInventoryTask";

const CreatePurchaseOrderModal = ({ isOpen, onClose, source, type, onPOCreated, editData, preFilledFromQuotation, initialViewMode = false }) => {
  const navigate = useNavigate();
  const { completeCurrentTask, isFromDepartmentTasks } = useRootCardInventoryTask();
  const [vendors, setVendors] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState(initialViewMode);
  
  const [formData, setFormData] = useState({
    po_number: `PO-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
    quotation_id: "",
    vendor_id: "",
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: "",
    delivery_location: "",
    currency: "INR",
    tax_template: "No Tax Template",
    notes: "",
    items: [],
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0
  });

  useEffect(() => {
    if (isOpen) {
      setViewMode(initialViewMode);
      fetchVendors();
      fetchQuotations();
      
      // Auto-generate PO number based on current count
      if (!editData) {
        axios.get("/department/procurement/purchase-orders").then(res => {
          const pos = res.data.purchaseOrders || res.data || [];
          const nextNum = (pos.length + 1).toString().padStart(4, '0');
          setFormData(prev => ({
            ...prev,
            po_number: `PO-${new Date().getFullYear()}-${nextNum}`
          }));
        }).catch(() => {
          // Fallback if API fails
          setFormData(prev => ({
            ...prev,
            po_number: `PO-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`
          }));
        });
      }

      if (editData) {
        // If we only have basic data, fetch full details with items
        const loadFullPO = async () => {
          try {
            const response = await axios.get(`/department/procurement/purchase-orders/${editData.id}`);
            const fullPO = response.data;
            
            setFormData({
              id: fullPO.id,
              po_number: fullPO.po_number,
              quotation_id: fullPO.quotation_id || "",
              vendor_id: fullPO.vendor_id,
              order_date: fullPO.order_date ? fullPO.order_date.split('T')[0] : new Date().toISOString().split('T')[0],
              expected_delivery_date: fullPO.expected_delivery_date ? fullPO.expected_delivery_date.split('T')[0] : "",
              delivery_location: fullPO.delivery_location || "",
              currency: fullPO.currency || "INR",
              tax_template: fullPO.tax_template || "No Tax Template",
              notes: fullPO.notes || "",
              items: fullPO.items || [],
              subtotal: fullPO.subtotal || 0,
              tax_amount: fullPO.tax_amount || 0,
              total_amount: fullPO.total_amount || 0,
            });
          } catch (error) {
            console.error("Error loading full PO:", error);
            // Fallback to what we have
            setFormData({
              id: editData.id,
              po_number: editData.po_number,
              quotation_id: editData.quotation_id || "",
              vendor_id: editData.vendor_id,
              order_date: editData.order_date ? editData.order_date.split('T')[0] : new Date().toISOString().split('T')[0],
              expected_delivery_date: editData.expected_delivery_date ? editData.expected_delivery_date.split('T')[0] : "",
              delivery_location: editData.delivery_location || "",
              currency: editData.currency || "INR",
              tax_template: editData.tax_template || "No Tax Template",
              notes: editData.notes || "",
              items: editData.items || [],
              subtotal: editData.subtotal || 0,
              tax_amount: editData.tax_amount || 0,
              total_amount: editData.total_amount || 0,
            });
          }
        };
        loadFullPO();
      } else if (preFilledFromQuotation) {
        handleQuotationSelect(preFilledFromQuotation.id, preFilledFromQuotation);
      } else if (source && type === 'quotation') {
        handleQuotationSelect(source.id, source);
      }
    }
  }, [isOpen, source, type, editData, preFilledFromQuotation, initialViewMode]);

  const fetchVendors = async () => {
    try {
      const response = await axios.get("/department/procurement/vendors");
      setVendors(response.data.vendors || response.data || []);
    } catch (error) {
      console.error("Error fetching vendors:", error);
    }
  };

  const fetchQuotations = async () => {
    try {
      const response = await axios.get("/department/procurement/quotations");
      const qts = response.data.quotations || response.data || [];
      // Include approved and accepted (already used in PO) quotations
      setQuotations(qts.filter(q => q.status === 'approved' || q.status === 'accepted'));
    } catch (error) {
      console.error("Error fetching quotations:", error);
    }
  };

  const handleQuotationSelect = async (quotationId, passedQuote = null) => {
    if (!quotationId) {
      setFormData(prev => ({
        ...prev,
        quotation_id: "",
        vendor_id: "",
        items: [],
        subtotal: 0,
        total_amount: 0
      }));
      return;
    }

    try {
      // Always fetch full quotation details to get items
      const response = await axios.get(`/department/procurement/quotations/${quotationId}`);
      const fullQuote = response.data;
      
      if (fullQuote) {
        const initialItems = (fullQuote.items || []).map(item => ({
          material_name: item.item_name || item.description,
          material_code: item.item_code || "",
          item_group: item.item_group || "",
          part_detail: item.part_detail || "",
          material_grade: item.material_grade || "",
          remark: item.remark || "",
          make: item.make || "",
          quantity: item.quantity,
          uom: item.unit || item.uom || "Nos",
          rate: item.rate || item.unit_price,
          amount: item.amount || (item.quantity * (item.rate || item.unit_price))
        }));

        calculateTotals(initialItems, formData.tax_template);
        
        setFormData(prev => ({
          ...prev,
          quotation_id: fullQuote.id,
          vendor_id: fullQuote.vendor_id,
          notes: prev.notes || `Created from Quotation: ${fullQuote.quotation_number || fullQuote.id}`
        }));
      }
    } catch (error) {
      console.error("Error fetching full quotation details:", error);
      toastUtils.error("Failed to fetch quotation details");
    }
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { material_name: "", quantity: 1, unit: "Nos", rate: 0, amount: 0 }]
    }));
  };

  const handleRemoveItem = (index) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    calculateTotals(newItems);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    if (field === 'quantity' || field === 'rate') {
      newItems[index].amount = (newItems[index].quantity || 0) * (newItems[index].rate || 0);
    }
    
    calculateTotals(newItems);
  };

  const calculateTotals = (items, taxTemplate) => {
    const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    
    // Extract tax percentage from template string (e.g., "GST 18%" -> 18)
    let taxPercent = 0;
    const template = taxTemplate || formData.tax_template;
    const match = template.match(/(\d+)%/);
    if (match) {
      taxPercent = parseInt(match[1]);
    }
    
    const tax_amount = (subtotal * taxPercent) / 100;
    const total_amount = subtotal + tax_amount;
    
    setFormData(prev => ({
      ...prev,
      items,
      subtotal,
      tax_amount,
      total_amount,
      tax_template: template
    }));
  };

  const handleTaxTemplateChange = (template) => {
    calculateTotals(formData.items, template);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vendor_id) {
      toastUtils.warning("Please select a supplier");
      return;
    }
    if (formData.items.length === 0) {
      toastUtils.warning("Please add at least one item");
      return;
    }

    setSubmitting(true);
    try {
      let response;
      if (editData) {
        // Update existing PO
        response = await axios.put(`/department/procurement/purchase-orders/${editData.id}`, formData);
        toastUtils.success("Purchase Order updated successfully");
      } else {
        // Create new PO
        response = await axios.post("/department/procurement/purchase-orders", formData);
        toastUtils.success("Purchase Order created successfully");

        // If we are coming from workflow tasks, complete the "Create Purchase Order" task
        if (isFromDepartmentTasks()) {
          try {
            await completeCurrentTask("Purchase Order created");
          } catch (taskError) {
            console.error("Error completing workflow task:", taskError);
          }
        }
      }
      
      if (onPOCreated) onPOCreated();
      onClose();
      
      if (!editData) {
        navigate(`/department/procurement/purchase-orders/${response.data.id || response.data.po_number}`);
      }
    } catch (error) {
      console.error("Error saving PO:", error);
      toastUtils.error(error.response?.data?.message || "Failed to save purchase order");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-7xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between border-b transition-colors duration-300 sticky top-0 z-10 ${viewMode ? 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900' : 'border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/10'}`}>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
            {viewMode ? <Eye className="text-blue-600" size={24} /> : (editData ? <Edit className="text-emerald-600" size={24} /> : <Plus className="text-blue-600" size={24} />)}
            <span className={!viewMode && editData ? "text-emerald-700 dark:text-emerald-400" : ""}>
              {viewMode ? `View Purchase Order: ${formData.po_number}` : (editData ? `Edit Purchase Order: ${formData.po_number}` : "Create New Purchase Order")}
            </span>
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-8">
            {/* PO Header Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <FileText size={18} className="text-slate-400" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">PO Header</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">PO Number</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-500 outline-none"
                    value={formData.po_number}
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Quotation Reference *</label>
                  <select 
                    className={`w-full px-4 py-2.5 ${viewMode || !!editData ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-500' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white'} border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all outline-none`}
                    value={formData.quotation_id}
                    onChange={(e) => handleQuotationSelect(e.target.value)}
                    disabled={viewMode || !!editData}
                    required
                  >
                    <option value="">Select Approved Quotation...</option>
                    {quotations.map(q => (
                      <option key={q.id} value={q.id}>{q.quotation_number}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Supplier (Auto-filled)</label>
                  <select 
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-500 outline-none pointer-events-none"
                    value={formData.vendor_id}
                    readOnly
                    tabIndex="-1"
                  >
                    <option value="">Select Supplier...</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Order Date *</label>
                  <input 
                    type="date"
                    className={`w-full px-4 py-2.5 ${viewMode ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-500' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white'} border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all outline-none`}
                    value={formData.order_date}
                    onChange={(e) => setFormData({...formData, order_date: e.target.value})}
                    disabled={viewMode}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Expected Delivery *</label>
                  <input 
                    type="date"
                    className={`w-full px-4 py-2.5 ${viewMode ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-500' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white'} border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all outline-none`}
                    value={formData.expected_delivery_date}
                    onChange={(e) => setFormData({...formData, expected_delivery_date: e.target.value})}
                    disabled={viewMode}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Delivery Location</label>
                  <input 
                    type="text"
                    placeholder="e.g. Main Warehouse"
                    className={`w-full px-4 py-2.5 ${viewMode ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-500' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white'} border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all outline-none`}
                    value={formData.delivery_location}
                    onChange={(e) => setFormData({...formData, delivery_location: e.target.value})}
                    disabled={viewMode}
                  />
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Package size={18} className="text-slate-400" />
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Purchase Order Items</h3>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl overflow-x-auto shadow-sm">
                <table className="w-full text-sm min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      <th className="px-6 py-4 text-left">Item Name / Group</th>
                      <th className="px-6 py-4 text-left">Part Detail / Grade</th>
                      <th className="px-6 py-4 text-left">Remark / Make</th>
                      <th className="px-4 py-4 text-center w-32">Quantity</th>
                      <th className="px-4 py-4 text-center w-24">UOM</th>
                      <th className="px-4 py-4 text-center w-40">Rate</th>
                      <th className="px-6 py-4 text-right w-40">Amount</th>
                      {!viewMode && <th className="px-4 py-4 text-center w-16"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                    {formData.items.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-8 text-center text-slate-400 italic">
                          Select a quotation to populate items
                        </td>
                      </tr>
                    ) : (
                      formData.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="px-6 py-4">
                            {viewMode ? (
                              <>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                  {item.material_name}
                                </p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-tight">
                                  {item.item_group || "N/A"}
                                </p>
                              </>
                            ) : (
                              <input 
                                type="text"
                                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-lg py-1.5 px-2 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Item name..."
                                value={item.material_name}
                                onChange={(e) => handleItemChange(idx, 'material_name', e.target.value)}
                              />
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {viewMode ? (
                              <>
                                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                  {item.part_detail || "-"}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                  {item.material_grade || "-"}
                                </p>
                              </>
                            ) : (
                              <div className="space-y-1">
                                <input 
                                  type="text"
                                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded py-1 px-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                                  placeholder="Detail"
                                  value={item.part_detail}
                                  onChange={(e) => handleItemChange(idx, 'part_detail', e.target.value)}
                                />
                                <input 
                                  type="text"
                                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded py-1 px-2 text-[10px] outline-none focus:ring-1 focus:ring-blue-500"
                                  placeholder="Grade"
                                  value={item.material_grade}
                                  onChange={(e) => handleItemChange(idx, 'material_grade', e.target.value)}
                                />
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {viewMode ? (
                              <>
                                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                  {item.remark || "-"}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                  {item.make || "-"}
                                </p>
                              </>
                            ) : (
                              <div className="space-y-1">
                                <input 
                                  type="text"
                                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded py-1 px-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                                  placeholder="Remark"
                                  value={item.remark}
                                  onChange={(e) => handleItemChange(idx, 'remark', e.target.value)}
                                />
                                <input 
                                  type="text"
                                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded py-1 px-2 text-[10px] outline-none focus:ring-1 focus:ring-blue-500"
                                  placeholder="Make"
                                  value={item.make}
                                  onChange={(e) => handleItemChange(idx, 'make', e.target.value)}
                                />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <input 
                              type="number"
                              className={`w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-lg py-1.5 px-2 text-center text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500 transition-all ${viewMode ? 'opacity-80' : ''}`}
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                              disabled={viewMode}
                            />
                          </td>
                          <td className="px-4 py-4 text-center">
                            {viewMode ? (
                              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{item.uom || item.unit || "Nos"}</span>
                            ) : (
                              <input 
                                type="text"
                                className="w-16 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-lg py-1.5 px-2 text-center text-xs font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
                                value={item.uom || item.unit || "Nos"}
                                onChange={(e) => handleItemChange(idx, 'uom', e.target.value)}
                              />
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                              <input 
                                type="number"
                                className={`w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-lg py-1.5 pl-6 pr-3 text-right text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500 transition-all ${viewMode ? 'opacity-80' : ''}`}
                                value={item.rate}
                                onChange={(e) => handleItemChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                                disabled={viewMode}
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-bold text-slate-900 dark:text-white">₹{(item.amount || 0).toLocaleString()}</span>
                          </td>
                          {!viewMode && (
                            <td className="px-4 py-4 text-center">
                              <button 
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {!viewMode && (
                <div className="flex justify-start">
                  <button 
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl border border-dashed border-blue-200 transition-all"
                  >
                    <Plus size={14} />
                    Add Manual Item
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notes & Terms</label>
                <textarea 
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none disabled:opacity-50"
                  rows={6}
                  placeholder="Enter any specific notes or terms for this order..."
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  disabled={viewMode}
                />
              </div>

              <div className="space-y-4">
                <div className="p-6 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20 space-y-4">
                  <div className="flex justify-between items-center text-blue-100">
                    <span className="text-xs font-bold uppercase tracking-widest">Subtotal</span>
                    <span className="font-bold text-sm">₹{formData.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-blue-100">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold uppercase tracking-widest">Tax</span>
                      <select 
                        className="mt-1 bg-blue-500 text-white text-[10px] font-bold border border-blue-400 rounded px-1 py-0.5 outline-none disabled:opacity-50"
                        value={formData.tax_template}
                        onChange={(e) => handleTaxTemplateChange(e.target.value)}
                        disabled={viewMode}
                      >
                        <option value="No Tax Template">No Tax Template</option>
                        <option value="GST 18%">GST 18%</option>
                        <option value="GST 12%">GST 12%</option>
                        <option value="GST 5%">GST 5%</option>
                      </select>
                    </div>
                    <span className="font-bold text-sm">₹{formData.tax_amount.toLocaleString()}</span>
                  </div>
                  <div className="pt-4 border-t border-blue-500 flex justify-between items-center text-white">
                    <span className="text-sm font-black uppercase tracking-[0.2em]">Grand Total</span>
                    <span className="text-2xl font-black tracking-tight">₹{formData.total_amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 sticky bottom-0 z-10">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-slate-500 hover:text-slate-700 font-bold text-xs uppercase tracking-widest transition-colors"
            >
              Cancel
            </button>
            {viewMode ? (
              <button 
                type="button"
                onClick={() => setViewMode(false)}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2"
              >
                <Edit size={16} />
                Edit PO
              </button>
            ) : (
              <button 
                type="submit"
                disabled={submitting}
                className={`px-8 py-2.5 ${editData ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25'} text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg transition-all flex items-center gap-2`}
              >
                {submitting ? <RefreshCw size={16} className="animate-spin" /> : (editData ? <Save size={16} /> : <CheckCircle size={16} />)}
                {submitting ? "Saving..." : (editData ? "Update PO" : "Create Purchase Order")}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePurchaseOrderModal;
