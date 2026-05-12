import React, { useState, useEffect } from "react";
import { X, Save, RefreshCw, Package, FileText, Calendar, Truck, CreditCard, ShoppingCart } from "lucide-react";
import axios from "../../utils/api";
import Swal from "sweetalert2";
import toastUtils from "../../utils/toastUtils";
import SearchableSelect from "../../components/ui/SearchableSelect";

const RecordVendorInvoiceModal = ({ isOpen, onClose, onInvoiceRecorded, editData = null, initialViewMode = false }) => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [challans, setChallans] = useState([]);
  const [sourceType, setSourceType] = useState('PO'); // 'PO' or 'CHALLAN'
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState(initialViewMode);

  const [formData, setFormData] = useState({
    invoice_no: "",
    invoice_date: new Date().toISOString().split('T')[0],
    po_id: "",
    po_no: "",
    po_date: "",
    outward_challan_id: "",
    outward_challan_no: "",
    challan_no: "",
    challan_date: "",
    vendor_id: "",
    vendor_name: "",
    project_id: "",
    project_name: "",
    state: "Maharashtra",
    state_code: "27",
    transporter: "",
    lr_no: "",
    items: [],
    sub_total: 0,
    taxable_value: 0,
    cgst_rate: 9,
    sgst_rate: 9,
    cgst_amount: 0,
    sgst_amount: 0,
    grand_total: 0,
    round_off: 0,
    notes: ""
  });

  useEffect(() => {
    if (isOpen) {
      setViewMode(initialViewMode);
      if (editData) {
        fetchInvoiceDetails(editData.id);
      } else {
        fetchPurchaseOrders();
        fetchChallans();
        fetchNextInvoiceNumber();
        // Reset form for new record
        setFormData({
          invoice_no: "",
          invoice_date: new Date().toISOString().split('T')[0],
          po_id: "",
          po_no: "",
          po_date: "",
          outward_challan_id: "",
          outward_challan_no: "",
          challan_no: "",
          challan_date: "",
          vendor_id: "",
          vendor_name: "",
          project_id: "",
          project_name: "",
          state: "Maharashtra",
          state_code: "27",
          transporter: "",
          lr_no: "",
          items: [],
          sub_total: 0,
          taxable_value: 0,
          cgst_rate: 9,
          sgst_rate: 9,
          cgst_amount: 0,
          sgst_amount: 0,
          grand_total: 0,
          round_off: 0,
          notes: ""
        });
        setSourceType('PO');
      }
    }
  }, [isOpen, editData, initialViewMode]);

  const fetchInvoiceDetails = async (id) => {
    setLoading(true);
    try {
      const response = await axios.get(`/accounting/vendor-invoices/${id}`);
      const inv = response.data;
      setSourceType(inv.outward_challan_id ? 'CHALLAN' : 'PO');
      setFormData({
        invoice_no: inv.invoice_number,
        invoice_date: inv.invoice_date.split('T')[0],
        po_id: inv.purchase_order_id || "",
        po_no: inv.po_number || "",
        po_date: inv.po_date || "",
        outward_challan_id: inv.outward_challan_id || "",
        outward_challan_no: inv.outward_challan_no || "",
        challan_no: inv.challan_number || "",
        challan_date: inv.challan_date ? inv.challan_date.split('T')[0] : "",
        vendor_id: inv.vendor_id,
        vendor_name: inv.vendor_name,
        project_id: inv.project_id,
        project_name: inv.project_name,
        state: inv.place_of_supply || "Maharashtra",
        state_code: "27",
        transporter: inv.transporter || "",
        lr_no: inv.lr_number || "",
        items: inv.items || [],
        sub_total: parseFloat(inv.sub_total),
        taxable_value: parseFloat(inv.taxable_value),
        cgst_rate: 9,
        sgst_rate: 9,
        cgst_amount: parseFloat(inv.cgst_amount),
        sgst_amount: parseFloat(inv.sgst_amount),
        grand_total: parseFloat(inv.grand_total),
        round_off: parseFloat(inv.round_off),
        notes: inv.notes || ""
      });
    } catch (error) {
      console.error("Error fetching invoice details:", error);
      toastUtils.error("Failed to load invoice details");
    } finally {
      setLoading(false);
    }
  };

  const fetchNextInvoiceNumber = async () => {
    try {
      const response = await axios.get("/accounting/vendor-invoices/next-number");
      setFormData(prev => ({
        ...prev,
        invoice_no: response.data.nextInvoiceNumber
      }));
    } catch (error) {
      console.error("Error fetching next invoice number:", error);
    }
  };

  const fetchPurchaseOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/department/procurement/purchase-orders");
      // Only POs that are approved or sent to inventory/fulfilled
      const orders = (response.data.purchaseOrders || response.data).filter(
        po => ["approved", "sent to inventory", "fulfilled", "material received"].includes(po.status)
      );
      setPurchaseOrders(orders);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      toastUtils.error("Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchChallans = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/accounting/vendor-invoices/eligible-challans");
      setChallans(response.data.challans || response.data || []);
    } catch (error) {
      console.error("Error fetching eligible challans:", error);
      toastUtils.error("Failed to load eligible challans");
    } finally {
      setLoading(false);
    }
  };

  const handlePOChange = async (poId) => {
    if (!poId) {
      setFormData(prev => ({
        ...prev,
        po_id: "",
        po_no: "",
        po_date: "",
        outward_challan_id: "",
        outward_challan_no: "",
        vendor_id: "",
        vendor_name: "",
        project_id: "",
        project_name: "",
        items: [],
        sub_total: 0,
        taxable_value: 0,
        cgst_amount: 0,
        sgst_amount: 0,
        grand_total: 0,
        round_off: 0
      }));
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`/department/procurement/purchase-orders/${poId}`);
      const po = response.data;

      const items = (po.items || []).map(item => {
        const qty = parseFloat(item.quantity) || 0;
        const amount = parseFloat(item.amount) || 0;
        let rate = parseFloat(item.rate_per_kg) || parseFloat(item.rate) || 0;
        
        // If rate is 0 but we have amount and qty, calculate it
        if (rate === 0 && qty > 0) {
          rate = amount / qty;
        }
        
        return {
          id: item.id,
          po_item_id: item.id,
          challan_item_id: null,
          description: item.material_name || item.item_group,
          hsn_code: "",
          qty: qty,
          unit: item.unit || item.uom,
          rate: rate,
          amount: amount
        };
      });

      const subTotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      
      setFormData(prev => ({
        ...prev,
        po_id: poId,
        po_no: po.po_number,
        po_date: po.order_date || po.created_at,
        outward_challan_id: "",
        outward_challan_no: "",
        vendor_id: po.vendor_id,
        vendor_name: po.vendor_name,
        project_id: po.root_card_id,
        project_name: po.root_card_project_name,
        items: items,
        sub_total: subTotal,
        taxable_value: subTotal
      }));

      calculateTotals(subTotal, prev => ({ ...prev, sub_total: subTotal, taxable_value: subTotal }));
    } catch (error) {
      console.error("Error fetching PO details:", error);
      toastUtils.error("Failed to load PO details");
    } finally {
      setLoading(false);
    }
  };

  const handleChallanChange = async (challanId) => {
    if (!challanId) {
      setFormData(prev => ({
        ...prev,
        po_id: "",
        po_no: "",
        po_date: "",
        outward_challan_id: "",
        outward_challan_no: "",
        vendor_id: "",
        vendor_name: "",
        project_id: "",
        project_name: "",
        items: [],
        sub_total: 0,
        taxable_value: 0,
        cgst_amount: 0,
        sgst_amount: 0,
        grand_total: 0,
        round_off: 0
      }));
      return;
    }

    setLoading(true);
    try {
      // Assuming we have an endpoint to get challan details, or we might need to find it from the challans list
      // The spec doesn't explicitly mention a getChallanById endpoint for accounting, 
      // but let's check if we can get it from inventory/outward-challans/:id
      const response = await axios.get(`/accounting/vendor-invoices/challans/${challanId}`);
      const challan = response.data;

      const items = (challan.items || []).map(item => {
        const qty = parseFloat(item.dispatch_qty) || 0;
        const rate = parseFloat(item.rate) || 0;
        const amount = qty * rate;
        
        return {
          id: item.id,
          po_item_id: null,
          challan_item_id: item.id,
          description: item.item_name,
          hsn_code: "",
          qty: qty,
          unit: item.uom,
          rate: rate,
          amount: amount
        };
      });

      const subTotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      
      setFormData(prev => ({
        ...prev,
        po_id: "",
        po_no: "",
        po_date: "",
        outward_challan_id: challanId,
        outward_challan_no: challan.challan_no,
        vendor_id: challan.vendor_id,
        vendor_name: challan.vendor_name,
        project_id: challan.project_id,
        project_name: challan.project_name,
        items: items,
        sub_total: subTotal,
        taxable_value: subTotal
      }));

      calculateTotals(subTotal, prev => ({ ...prev, sub_total: subTotal, taxable_value: subTotal }));
    } catch (error) {
      console.error("Error fetching challan details:", error);
      toastUtils.error("Failed to load challan details");
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = (taxableValue, currentData) => {
    const cgst = (taxableValue * (currentData.cgst_rate || 9)) / 100;
    const sgst = (taxableValue * (currentData.sgst_rate || 9)) / 100;
    const rawTotal = taxableValue + cgst + sgst;
    const grandTotal = Math.round(rawTotal);
    const roundOff = (grandTotal - rawTotal).toFixed(2);

    setFormData(prev => ({
      ...prev,
      cgst_amount: cgst,
      sgst_amount: sgst,
      grand_total: grandTotal,
      round_off: parseFloat(roundOff)
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      if (name === "taxable_value" || name === "cgst_rate" || name === "sgst_rate") {
        calculateTotals(parseFloat(newData.taxable_value) || 0, newData);
      }
      return newData;
    });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;

    if (field === 'qty' || field === 'rate') {
      const qty = parseFloat(newItems[index].qty) || 0;
      const rate = parseFloat(newItems[index].rate) || 0;
      newItems[index].amount = qty * rate;
    }

    const subTotal = newItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    setFormData(prev => ({
      ...prev,
      items: newItems,
      sub_total: subTotal,
      taxable_value: subTotal
    }));

    calculateTotals(subTotal, { ...formData, sub_total: subTotal, taxable_value: subTotal });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sourceType === 'PO' && !formData.po_id) {
      toastUtils.error("Please select a Purchase Order");
      return;
    }
    if (sourceType === 'CHALLAN' && !formData.outward_challan_id) {
      toastUtils.error("Please select an Outsourcing Challan");
      return;
    }
    if (!formData.invoice_no) {
      toastUtils.error("Please enter Invoice Number");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        invoice_number: formData.invoice_no,
        purchase_order_id: sourceType === 'PO' ? formData.po_id : null,
        outward_challan_id: sourceType === 'CHALLAN' ? formData.outward_challan_id : null,
        vendor_id: formData.vendor_id,
        project_id: formData.project_id,
        invoice_date: formData.invoice_date,
        place_of_supply: formData.state,
        transporter: formData.transporter,
        lr_number: formData.lr_no,
        challan_number: formData.challan_no,
        challan_date: formData.challan_date || null,
        sub_total: formData.sub_total,
        taxable_value: formData.taxable_value,
        cgst_amount: formData.cgst_amount,
        sgst_amount: formData.sgst_amount,
        igst_amount: 0, // Assuming CGST/SGST for now
        grand_total: formData.grand_total,
        round_off: formData.round_off,
        notes: formData.notes,
        items: formData.items.map(item => ({
          po_item_id: item.po_item_id,
          challan_item_id: item.challan_item_id,
          description: item.description,
          hsn_code: item.hsn_code,
          qty: item.qty,
          unit: item.unit,
          rate: item.rate,
          amount: item.amount
        }))
      };

      await axios.post("/accounting/vendor-invoices", payload);
      
      Swal.fire({
        title: "Success!",
        text: "Vendor invoice recorded successfully",
        icon: "success",
        confirmButtonColor: "#3B82F6"
      });
      
      if (onInvoiceRecorded) onInvoiceRecorded();
      onClose();
    } catch (error) {
      console.error("Error recording invoice:", error);
      toastUtils.error("Failed to record invoice");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg  text-slate-900 dark:text-white">Record Vendor Invoice</h2>
              <p className="text-xs text-slate-500">Create a new tax invoice from {sourceType === 'PO' ? 'purchase order' : 'outsourcing challan'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!viewMode && !editData && (
              <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setSourceType('PO');
                    handlePOChange("");
                  }}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${sourceType === 'PO' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}
                >
                  Purchase Order
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSourceType('CHALLAN');
                    handleChallanChange("");
                  }}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${sourceType === 'CHALLAN' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}
                >
                  Outsourcing Challan
                </button>
              </div>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
              <X size={20} className="text-slate-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Section: PO/Challan Selection & Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs   text-slate-400 flex items-center gap-1.5">
                {sourceType === 'PO' ? (
                  <><ShoppingCart size={12} /> Select Purchase Order</>
                ) : (
                  <><Package size={12} /> Select Outsourcing Challan</>
                )}
              </label>
              {viewMode ? (
                <div className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono">
                  {sourceType === 'PO' ? formData.po_no : formData.outward_challan_no}
                </div>
              ) : (
                sourceType === 'PO' ? (
                  <SearchableSelect
                    options={purchaseOrders.map(po => ({
                      value: po.id,
                      label: po.po_number,
                      subLabel: `${po.vendor_name} | Project: ${po.root_card_project_name || 'Direct PO'}`
                    }))}
                    value={formData.po_id}
                    onChange={handlePOChange}
                    placeholder="Search PO Number..."
                    loading={loading}
                  />
                ) : (
                  <SearchableSelect
                    options={challans.map(ch => ({
                      value: ch.id,
                      label: ch.challan_no,
                      subLabel: `${ch.vendor_name} | Project: ${ch.project_name || 'N/A'}`
                    }))}
                    value={formData.outward_challan_id}
                    onChange={handleChallanChange}
                    placeholder="Search Challan Number..."
                    loading={loading}
                  />
                )
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs   text-slate-400 flex items-center gap-1.5">
                <FileText size={12} /> Bill / Invoice No.
              </label>
              <input
                type="text"
                name="invoice_no"
                value={formData.invoice_no}
                onChange={handleInputChange}
                readOnly={viewMode}
                className={`w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${viewMode ? 'cursor-default' : ''}`}
                placeholder="e.g. INV/2026/001"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs   text-slate-400 flex items-center gap-1.5">
                <Calendar size={12} /> Invoice Date
              </label>
              <input
                type="date"
                name="invoice_date"
                value={formData.invoice_date}
                onChange={handleInputChange}
                readOnly={viewMode}
                className={`w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${viewMode ? 'cursor-default' : ''}`}
                required
              />
            </div>
          </div>

          {/* Details Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded border border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-xs  text-slate-400  mb-1">Vendor</p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formData.vendor_name || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs  text-slate-400  mb-1">Project</p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formData.project_name || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs  text-slate-400  mb-1">{sourceType === 'PO' ? 'PO Date' : 'Challan Date'}</p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {sourceType === 'PO' 
                  ? (formData.po_date ? new Date(formData.po_date).toLocaleDateString() : "N/A")
                  : (formData.challan_date ? new Date(formData.challan_date).toLocaleDateString() : "N/A")}
              </p>
            </div>
            <div>
              <p className="text-xs  text-slate-400  mb-1">Place of Supply</p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formData.state} ({formData.state_code})</p>
            </div>
          </div>

          {/* Challan Info */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs   text-slate-400 flex items-center gap-1.5">
                Challan No.
              </label>
              <input
                type="text"
                name="challan_no"
                value={formData.challan_no}
                onChange={handleInputChange}
                readOnly={viewMode}
                className={`w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none ${viewMode ? 'bg-slate-50 dark:bg-slate-800' : ''}`}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs   text-slate-400 flex items-center gap-1.5">
                Challan Date
              </label>
              <input
                type="date"
                name="challan_date"
                value={formData.challan_date}
                onChange={handleInputChange}
                readOnly={viewMode}
                className={`w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none ${viewMode ? 'bg-slate-50 dark:bg-slate-800' : ''}`}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs   text-slate-400 flex items-center gap-1.5">
                <Truck size={12} /> Transporter
              </label>
              <input
                type="text"
                name="transporter"
                value={formData.transporter}
                onChange={handleInputChange}
                readOnly={viewMode}
                className={`w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none ${viewMode ? 'bg-slate-50 dark:bg-slate-800' : ''}`}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs   text-slate-400 flex items-center gap-1.5">
                LR No.
              </label>
              <input
                type="text"
                name="lr_no"
                value={formData.lr_no}
                onChange={handleInputChange}
                readOnly={viewMode}
                className={`w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none ${viewMode ? 'bg-slate-50 dark:bg-slate-800' : ''}`}
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-3 text-xs   text-slate-500 w-12 text-center">Sr.</th>
                  <th className="px-4 py-3 text-xs   text-slate-500">Description</th>
                  <th className="px-4 py-3 text-xs   text-slate-500 w-24">HSN</th>
                  <th className="px-4 py-3 text-xs   text-slate-500 w-24 text-right">Qty</th>
                  <th className="px-4 py-3 text-xs   text-slate-500 w-20">Unit</th>
                  <th className="px-4 py-3 text-xs   text-slate-500 w-32 text-right">Rate</th>
                  <th className="px-4 py-3 text-xs   text-slate-500 w-32 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {formData.items.length > 0 ? (
                  formData.items.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-500 text-center">{index + 1}</td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{item.description}</p>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={item.hsn_code}
                          readOnly={viewMode}
                          onChange={(e) => handleItemChange(index, 'hsn_code', e.target.value)}
                          className={`w-full px-2 py-1 bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white rounded text-xs outline-none ${viewMode ? 'hover:border-transparent cursor-default' : ''}`}
                          placeholder={viewMode ? "" : "8511"}
                        />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 text-right">
                        <input
                          type="number"
                          value={item.qty}
                          readOnly={viewMode}
                          onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                          className={`w-full px-2 py-1 bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white rounded text-xs text-right outline-none ${viewMode ? 'hover:border-transparent cursor-default' : ''}`}
                        />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 ">{item.unit}</td>
                      <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span>₹</span>
                          <input
                            type="number"
                            value={item.rate}
                            readOnly={viewMode}
                            onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                            className={`w-20 px-2 py-1 bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white rounded text-xs text-right outline-none ${viewMode ? 'hover:border-transparent cursor-default' : ''}`}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs  text-slate-900 dark:text-white text-right">₹{parseFloat(item.amount).toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-xs text-slate-400 italic">
                      Select a {sourceType === 'PO' ? 'Purchase Order' : 'Outsourcing Challan'} to load items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary & Taxes */}
          <div className="flex flex-col md:flex-row gap-6 justify-between">
            <div className="flex-1 space-y-3">
              <label className="text-xs   text-slate-400">Additional Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                readOnly={viewMode}
                className={`w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs min-h-[100px] outline-none ${viewMode ? 'cursor-default' : ''}`}
                placeholder={viewMode ? "" : "Any payment terms or internal remarks..."}
              />
            </div>

            <div className="w-full md:w-80 space-y-2 bg-slate-50 dark:bg-slate-800/30 p-4 rounded border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Sub Total</span>
                <span className="font-semibold text-slate-900 dark:text-white">₹{formData.sub_total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-slate-500">Taxable Value</span>
                <span className="font-semibold text-slate-900 dark:text-white">₹{formData.taxable_value.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">CGST @</span>
                  <input
                    type="number"
                    name="cgst_rate"
                    value={formData.cgst_rate}
                    onChange={handleInputChange}
                    readOnly={viewMode}
                    className={`w-12 px-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-center text-xs ${viewMode ? 'bg-transparent border-transparent' : ''}`}
                  />
                  <span className="text-slate-500">%</span>
                </div>
                <span className="font-semibold text-slate-900 dark:text-white">₹{formData.cgst_amount.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">SGST @</span>
                  <input
                    type="number"
                    name="sgst_rate"
                    value={formData.sgst_rate}
                    onChange={handleInputChange}
                    readOnly={viewMode}
                    className={`w-12 px-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-center text-xs ${viewMode ? 'bg-transparent border-transparent' : ''}`}
                  />
                  <span className="text-slate-500">%</span>
                </div>
                <span className="font-semibold text-slate-900 dark:text-white">₹{formData.sgst_amount.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Round Off</span>
                <span>{formData.round_off}</span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t-2 border-slate-200 dark:border-slate-700">
                <span className="text-sm  text-slate-900 dark:text-white ">Grand Total</span>
                <span className="text-lg font-black text-blue-600 dark:text-blue-400">₹{formData.grand_total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-2 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
          {viewMode ? (
            <button
              onClick={onClose}
              className="px-8 py-2 bg-slate-900 text-white rounded text-xs hover:bg-slate-800 transition-all  shadow-lg"
            >
              Close
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-6 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all "
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || loading}
                className="px-6 py-2 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-all  flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {submitting ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                Record Invoice
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecordVendorInvoiceModal;
