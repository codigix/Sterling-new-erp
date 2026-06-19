import React, { useState, useEffect } from "react";
import { X, Save, RefreshCw, Package, FileText, Calendar, Truck, CreditCard, ShoppingCart } from "lucide-react";
import axios from "../../utils/api";
import Swal from "sweetalert2";
import toastUtils from "../../utils/toastUtils";
import SearchableSelect from "../../components/ui/SearchableSelect";

const getDimensionsText = (item) => {
  const parts = [];
  const val = (v) => {
    const n = parseFloat(v);
    return (n && !isNaN(n) && n !== 0) ? n : null;
  };
  if (val(item.length)) parts.push(`L: ${val(item.length)}`);
  if (val(item.width)) parts.push(`W: ${val(item.width)}`);
  if (val(item.thickness)) parts.push(`T: ${val(item.thickness)}`);
  if (val(item.diameter)) parts.push(`Dia: ${val(item.diameter)}`);
  if (val(item.outer_diameter)) parts.push(`OD: ${val(item.outer_diameter)}`);
  if (val(item.height)) parts.push(`H: ${val(item.height)}`);
  return parts.length > 0 ? parts.join(" × ") : "";
};

const RecordVendorInvoiceModal = ({ isOpen, onClose, onInvoiceRecorded, editData = null, initialViewMode = false }) => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [challans, setChallans] = useState([]);
  const [grns, setGrns] = useState([]);
  const [selectedGrnId, setSelectedGrnId] = useState("");
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
    vendor_gstin: "",
    vendor_address: "",
    vendor_city: "",
    vendor_pincode: "",
    vendor_state: "",        // vendor's registered state
    is_inter_state: false,   // true = IGST, false = CGST+SGST
    project_id: "",
    project_name: "",
    operation_name: "",
    state: "Maharashtra",
    state_code: "27",
    oc_challan_date: "",
    transporter: "",
    lr_no: "",
    items: [],
    sub_total: 0,
    taxable_value: 0,
    cgst_rate: 9,
    sgst_rate: 9,
    igst_rate: 18,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 0,
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
          vendor_gstin: "",
          vendor_address: "",
          vendor_city: "",
          vendor_pincode: "",
          vendor_state: "",
          is_inter_state: false,
          project_id: "",
          project_name: "",
          operation_name: "",
          state: "Maharashtra",
          state_code: "27",
          oc_challan_date: "",
          transporter: "",
          lr_no: "",
          items: [],
          sub_total: 0,
          taxable_value: 0,
          cgst_rate: 9,
          sgst_rate: 9,
          igst_rate: 18,
          cgst_amount: 0,
          sgst_amount: 0,
          igst_amount: 0,
          grand_total: 0,
          round_off: 0,
          notes: ""
        });
        setSourceType('PO');
        setGrns([]);
        setSelectedGrnId("");
      }
    }
  }, [isOpen, editData, initialViewMode]);

  const fetchInvoiceDetails = async (id) => {
    setLoading(true);
    try {
      const response = await axios.get(`/accounting/vendor-invoices/${id}`);
      const inv = response.data;
      const isInterState = parseFloat(inv.igst_amount || 0) > 0;
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
        vendor_gstin: inv.vendor_gst || "",
        vendor_state: inv.vendor_state || "",
        vendor_city: inv.vendor_city || "",
        vendor_pincode: inv.vendor_pincode || "",
        vendor_address: inv.vendor_address || "",
        is_inter_state: isInterState,
        oc_challan_date: inv.oc_date || "",
        operation_name: inv.operation_name || "",
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
        igst_rate: 18,
        cgst_amount: parseFloat(inv.cgst_amount || 0),
        sgst_amount: parseFloat(inv.sgst_amount || 0),
        igst_amount: parseFloat(inv.igst_amount || 0),
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
      setGrns([]);
      setSelectedGrnId("");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`/department/procurement/purchase-orders/${poId}`);
      const po = response.data;

      const vendorGstin = po.vendor_gstin || "";
      const vendorState = po.vendor_state || "";
      // Inter-state: vendor state is different from Sterling's state (Maharashtra)
      const isInterState = vendorState.trim().toLowerCase() !== "maharashtra";

      setFormData(prev => ({
        ...prev,
        po_id: poId,
        po_no: po.po_number,
        po_date: po.order_date || po.created_at,
        outward_challan_id: "",
        outward_challan_no: "",
        vendor_id: po.vendor_id,
        vendor_name: po.vendor_name,
        vendor_gstin: vendorGstin,
        vendor_state: vendorState,
        vendor_address: po.vendor_address || "",
        vendor_city: po.vendor_city || "",
        vendor_pincode: po.vendor_pincode || "",
        is_inter_state: isInterState,
        project_id: po.root_card_id,
        project_name: po.root_card_project_name,
        // Place of Supply = Sterling's state (where goods are received)
        state: "Maharashtra",
        state_code: "27",
        items: [],
        sub_total: 0,
        taxable_value: 0,
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: 0,
        grand_total: 0,
        round_off: 0
      }));

      // Fetch GRNs associated with the selected PO
      const grnsResponse = await axios.get(`/grn?purchase_order_id=${poId}`);
      setGrns(grnsResponse.data || []);
      setSelectedGrnId("");
    } catch (error) {
      console.error("Error fetching PO details:", error);
      toastUtils.error("Failed to load PO details");
    } finally {
      setLoading(false);
    }
  };

  const handleGRNChange = async (grnId) => {
    setSelectedGrnId(grnId);
    if (!grnId) {
      setFormData(prev => ({
        ...prev,
        challan_no: "",
        challan_date: "",
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
      const response = await axios.get(`/grn/${grnId}`);
      const grnData = response.data;
      const grn = grnData.grn;
      const grnItems = grnData.items || [];

      const items = grnItems.map(item => {
        const qty = parseFloat(item.received_qty) || 0;
        let rate = parseFloat(item.rate_per_kg) || parseFloat(item.po_rate) || parseFloat(item.po_rate_per_kg) || 0;
        const amount = qty * rate;

        return {
          id: item.id,
          po_item_id: item.po_item_id,
          challan_item_id: null,
          description: item.material_name || item.item_group,
          material_grade: item.material_grade || "",
          make: item.make || "",
          remark: item.remark || "",
          unit: item.unit,
          qty: qty,
          rate: rate,
          amount: amount
        };
      });

      const subTotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      const formattedDate = grn.receivedDate ? grn.receivedDate.split('T')[0] : "";

      setFormData(prev => {
        const isInterState = prev.is_inter_state;
        let cgst = 0, sgst = 0, igst = 0;
        if (isInterState) {
          igst = (subTotal * (prev.igst_rate || 18)) / 100;
        } else {
          cgst = (subTotal * (prev.cgst_rate || 9)) / 100;
          sgst = (subTotal * (prev.sgst_rate || 9)) / 100;
        }
        const rawTotal = subTotal + cgst + sgst + igst;
        const grandTotal = Math.round(rawTotal);
        const roundOff = (grandTotal - rawTotal).toFixed(2);

        return {
          ...prev,
          challan_no: grn.grn_number || "",
          challan_date: formattedDate,
          items: items,
          sub_total: subTotal,
          taxable_value: subTotal,
          cgst_amount: cgst,
          sgst_amount: sgst,
          igst_amount: igst,
          grand_total: grandTotal,
          round_off: parseFloat(roundOff)
        };
      });
    } catch (error) {
      console.error("Error fetching GRN details:", error);
      toastUtils.error("Failed to load GRN details");
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
        
        let description = item.item_name || "";
        const dims = getDimensionsText(item);
        if (dims && !description.includes(dims)) {
          description = `${description} (${dims})`;
        }
        
        return {
          id: item.id,
          po_item_id: null,
          challan_item_id: item.id,
          description: description,
          material_grade: item.material_grade || "",
          make: item.make || "",
          remark: item.remark || "",
          hsn_code: "",
          qty: qty,
          unit: item.uom,
          rate: rate,
          amount: amount
        };
      });

      const subTotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      const vendorGstin = challan.vendor_gstin || "";
      const vendorState = challan.vendor_state || "";
      const isInterState = vendorState.trim().toLowerCase() !== "maharashtra";
      const formattedChallanDate = challan.challan_date ? challan.challan_date.split('T')[0] : "";
      
      setFormData(prev => ({
        ...prev,
        po_id: "",
        po_no: "",
        po_date: "",
        outward_challan_id: challanId,
        outward_challan_no: challan.challan_no,
        challan_no: challan.challan_no || "",
        challan_date: formattedChallanDate,
        vendor_id: challan.vendor_id,
        vendor_name: challan.vendor_name,
        vendor_gstin: vendorGstin,
        vendor_state: vendorState,
        vendor_city: challan.vendor_city || "",
        vendor_pincode: challan.vendor_pincode || "",
        vendor_address: challan.vendor_address || "",
        is_inter_state: isInterState,
        project_id: challan.project_id,
        project_name: challan.project_name,
        operation_name: challan.operation_name || "",
        // Also keep tracking of original challan date for details display
        oc_challan_date: formattedChallanDate,
        items: items,
        sub_total: subTotal,
        taxable_value: subTotal
      }));

      calculateTotals(subTotal, { 
        is_inter_state: isInterState,
        cgst_rate: 9,
        sgst_rate: 9,
        igst_rate: 18
      });
    } catch (error) {
      console.error("Error fetching challan details:", error);
      toastUtils.error("Failed to load challan details");
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = (taxableValue, currentData) => {
    const isInterState = currentData.is_inter_state;
    let cgst = 0, sgst = 0, igst = 0;
    if (isInterState) {
      igst = (taxableValue * (currentData.igst_rate || 18)) / 100;
    } else {
      cgst = (taxableValue * (currentData.cgst_rate || 9)) / 100;
      sgst = (taxableValue * (currentData.sgst_rate || 9)) / 100;
    }
    const rawTotal = taxableValue + cgst + sgst + igst;
    const grandTotal = Math.round(rawTotal);
    const roundOff = (grandTotal - rawTotal).toFixed(2);

    setFormData(prev => ({
      ...prev,
      cgst_amount: cgst,
      sgst_amount: sgst,
      igst_amount: igst,
      grand_total: grandTotal,
      round_off: parseFloat(roundOff)
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      if (name === "taxable_value" || name === "cgst_rate" || name === "sgst_rate" || name === "igst_rate") {
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
        cgst_amount: formData.is_inter_state ? 0 : formData.cgst_amount,
        sgst_amount: formData.is_inter_state ? 0 : formData.sgst_amount,
        igst_amount: formData.is_inter_state ? formData.igst_amount : 0,
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
          <div className={`grid grid-cols-1 md:${sourceType === 'PO' ? 'grid-cols-4' : 'grid-cols-3'} gap-6`}>
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

            {sourceType === 'PO' && (
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 flex items-center gap-1.5">
                  <FileText size={12} /> Select GRN
                </label>
                {viewMode ? (
                  <div className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono">
                    {formData.challan_no || "N/A"}
                  </div>
                ) : (
                  <SearchableSelect
                    options={grns.map(grn => ({
                      value: grn.id,
                      label: grn.grn_number,
                      subLabel: `Date: ${grn.posting_date ? new Date(grn.posting_date).toLocaleDateString('en-GB') : 'N/A'}`
                    }))}
                    value={selectedGrnId}
                    onChange={handleGRNChange}
                    placeholder="Select GRN..."
                    loading={loading}
                    disabled={!formData.po_id}
                  />
                )}
              </div>
            )}

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
              {formData.vendor_gstin && (
                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{formData.vendor_gstin}</p>
              )}
              {(formData.vendor_city || formData.vendor_pincode) && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {[formData.vendor_city, formData.vendor_pincode].filter(Boolean).join(" – ")}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs  text-slate-400  mb-1">
                {sourceType === 'PO' ? 'Project' : 'Project / Outward Challan'}
              </p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {formData.project_name || "N/A"}
              </p>
              {sourceType === 'CHALLAN' && formData.outward_challan_no && (
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5 font-mono">
                  Challan: {formData.outward_challan_no}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs  text-slate-400  mb-1">
                {sourceType === 'PO' ? 'PO Date' : 'Challan Date / Operation'}
              </p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {sourceType === 'PO' 
                  ? (formData.po_date ? new Date(formData.po_date).toLocaleDateString('en-GB') : "N/A")
                  : (formData.oc_challan_date ? new Date(formData.oc_challan_date).toLocaleDateString('en-GB') : "N/A")}
              </p>
              {sourceType === 'CHALLAN' && formData.operation_name && (
                <span className="inline-block text-[10px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded font-semibold mt-1">
                  {formData.operation_name}
                </span>
              )}
            </div>
            <div>
              <p className="text-xs  text-slate-400  mb-1">Vendor State</p>
              {formData.vendor_state ? (
                <>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {formData.vendor_state}
                    {formData.vendor_gstin && (
                      <span className="ml-1 text-slate-400 font-normal">
                        ({formData.vendor_gstin.substring(0, 2)})
                      </span>
                    )}
                  </p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded mt-0.5 inline-block ${
                    formData.is_inter_state
                      ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20'
                      : 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  }`}>
                    {formData.is_inter_state ? 'Inter-state → IGST' : 'Intra-state → CGST+SGST'}
                  </span>
                </>
              ) : (
                <p className="text-sm font-semibold text-slate-400">N/A</p>
              )}
            </div>
          </div>

          {/* Challan Info */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs   text-slate-400 flex items-center gap-1.5">
                {sourceType === 'PO' ? 'GRN No.' : 'Challan No.'}
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
                {sourceType === 'PO' ? 'GRN Date' : 'Challan Date'}
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
                        {(item.material_grade || item.make || item.remark) && (
                          <div className="flex flex-wrap gap-x-3 mt-0.5">
                            {item.material_grade && <span className="text-[10px] text-slate-400">Grade: {item.material_grade}</span>}
                            {item.make && <span className="text-[10px] text-slate-400">Make: {item.make}</span>}
                            {item.remark && <span className="text-[10px] text-slate-400 italic">{item.remark}</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 text-right">
                        <input
                          type="number"
                          value={item.qty}
                          readOnly={viewMode}
                          onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                          className={`w-full px-2 py-1 rounded text-xs text-right outline-none transition-all ${
                            viewMode 
                              ? 'bg-transparent border border-transparent cursor-default' 
                              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
                          }`}
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
                            className={`w-20 px-2 py-1 rounded text-xs text-right outline-none transition-all ${
                              viewMode 
                                ? 'bg-transparent border border-transparent cursor-default' 
                                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
                            }`}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs  text-slate-900 dark:text-white text-right">₹{parseFloat(item.amount).toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-xs text-slate-400 italic">
                      {sourceType === 'PO' 
                        ? (formData.po_id ? "Select a GRN to load items" : "Select a Purchase Order to load items")
                        : "Select an Outsourcing Challan to load items"
                      }
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
              
              {/* Tax rows: IGST for inter-state, CGST+SGST for intra-state */}
              {formData.is_inter_state ? (
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600 dark:text-amber-400 font-medium">IGST @</span>
                    <input
                      type="number"
                      name="igst_rate"
                      value={formData.igst_rate}
                      onChange={handleInputChange}
                      readOnly={viewMode}
                      className={`w-12 px-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-center text-xs ${viewMode ? 'bg-transparent border-transparent' : ''}`}
                    />
                    <span className="text-slate-500">%</span>
                    <span className="text-[10px] text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">Inter-state</span>
                  </div>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">₹{(formData.igst_amount || 0).toLocaleString()}</span>
                </div>
              ) : (
                <>
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
                      <span className="text-[10px] text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">Intra-state</span>
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
                </>
              )}

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
