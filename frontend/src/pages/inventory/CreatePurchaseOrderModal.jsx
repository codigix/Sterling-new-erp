import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { X, Plus, Trash2, CheckCircle, Calendar, DollarSign, User, Package, FileText, Save, Edit, RefreshCw, Eye, FileUp, Loader2 } from "lucide-react";
import axios from "../../utils/api";
import Swal from "sweetalert2";
import toastUtils from "../../utils/toastUtils";
import { useRootCardInventoryTask } from "../../hooks/useRootCardInventoryTask";
import SearchableSelect from "../../components/ui/SearchableSelect";

const UOMOptions = ["Nos", "Kg", "pcs", "m", "l", "set", "Box", "Packet"];
const ItemGroupOptions = ["Plates", "round bar", "paint", "Pipe", "Block", "Bought Out"];
const MaterialTypeOptions = [
  { label: "Mild Steel / Carbon Steel", value: "7.85" },
  { label: "Stainless Steel (304/316)", value: "8.00" },
  { label: "Aluminum", value: "2.70" },
  { label: "Copper", value: "8.96" },
  { label: "Chemical", value: "1.10" }
];

const CreatePurchaseOrderModal = ({ isOpen, onClose, source, type, onPOCreated, editData, preFilledFromQuotation, initialViewMode = false, isInventoryView = false }) => {
  const navigate = useNavigate();
  const { completeCurrentTask, isFromDepartmentTasks } = useRootCardInventoryTask();
  const [vendors, setVendors] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [showManualForm, setShowManualForm] = useState(false);
  
  const [newManualItem, setNewManualItem] = useState({
    material_name: "",
    item_group: "",
    material_grade: "",
    part_detail: "",
    make: "",
    quantity: 1,
    uom: "Nos",
    rate: 0,
    total_weight: 0,
    amount: 0,
    length: "",
    width: "",
    thickness: "",
    diameter: "",
    outer_diameter: "",
    height: "",
    material_type: "",
    density: 0,
    unit_weight: 0,
    remark: "",
    calculatedWeight: 0
  });

  const calculateItemWeight = useCallback((item) => {
    const group = item.item_group?.toLowerCase() || "";
    const density = parseFloat(item.density) || 0;
    let unitWeight = 0;

    if (density <= 0) return 0;

    const L = parseFloat(item.length) || 0;
    const W = parseFloat(item.width) || 0;
    const T = parseFloat(item.thickness) || 0;
    const D = parseFloat(item.diameter) || 0;
    const OD = parseFloat(item.outer_diameter) || 0;
    const H = parseFloat(item.height) || 0;

    if (group.includes("plate") || group.includes("block")) {
      const thick = group.includes("plate") ? T : H;
      unitWeight = (L * W * thick * density) / 1000000;
    } 
    else if (group.includes("round bar")) {
      const radius = D / 2;
      unitWeight = (Math.PI * Math.pow(radius, 2) * L * density) / 1000000;
    } 
    else if (group.includes("pipe")) {
      const outerRadius = OD / 2;
      const innerRadius = outerRadius - T;
      if (innerRadius >= 0) {
        unitWeight = (Math.PI * (Math.pow(outerRadius, 2) - Math.pow(innerRadius, 2)) * L * density) / 1000000;
      }
    }

    return unitWeight;
  }, []);

  useEffect(() => {
    const unitWeight = calculateItemWeight(newManualItem);
    const totalWeight = unitWeight * (parseFloat(newManualItem.quantity) || 0);
    
    if (unitWeight !== newManualItem.calculatedWeight) {
      setNewManualItem(prev => ({ 
        ...prev, 
        calculatedWeight: unitWeight,
        unit_weight: unitWeight,
        total_weight: totalWeight,
        // If UOM is Kg, automatically update quantity to match total weight if it's currently 1 or 0
        quantity: prev.uom === "Kg" && (prev.quantity === 1 || prev.quantity === 0) ? totalWeight.toFixed(3) : prev.quantity
      }));
    }
  }, [
    newManualItem.length, 
    newManualItem.width, 
    newManualItem.thickness, 
    newManualItem.height, 
    newManualItem.diameter, 
    newManualItem.outer_diameter, 
    newManualItem.density, 
    newManualItem.item_group,
    newManualItem.quantity,
    newManualItem.uom,
    calculateItemWeight
  ]);

  const itemGroupSelectOptions = useMemo(() => ItemGroupOptions.map((group) => ({
    label: group,
    value: group,
  })), []);

  const [formData, setFormData] = useState({
    po_number: `PO-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
    quotation_id: "",
    vendor_id: "",
    project_id: "",
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: "",
    delivery_location: "",
    location_link: "",
    currency: "INR",
    tax_template: "No Tax Template",
    notes: "",
    terms: "",
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
      fetchProjects();
      
      // Reset form data for new entry or load data for edit
      if (!editData) {
        if (preFilledFromQuotation) {
          handleQuotationSelect(preFilledFromQuotation.id, preFilledFromQuotation);
        } else if (source && type === 'quotation') {
          handleQuotationSelect(source.id, source);
        } else if (source && type === 'shortage') {
          handleShortageSelect(source);
        } else {
          // Auto-generate PO number based on current count
          axios.get("/department/procurement/purchase-orders").then(res => {
            const pos = res.data.purchaseOrders || res.data || [];
            const nextNum = (pos.length + 1).toString().padStart(4, '0');
            setFormData(prev => ({
              ...prev,
              po_number: `PO-${new Date().getFullYear()}-${nextNum}`,
              quotation_id: "",
              vendor_id: "",
              project_id: "",
              items: [],
              subtotal: 0,
              tax_amount: 0,
              total_amount: 0,
              notes: "",
              terms: ""
            }));
          }).catch(() => {
            setFormData(prev => ({
              ...prev,
              po_number: `PO-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`
            }));
          });
        }
      } else {
        // Load edit data
        const loadFullPO = async () => {
          try {
            const response = await axios.get(`/department/procurement/purchase-orders/${editData.id}`);
            const fullPO = response.data;
            
            setFormData({
              id: fullPO.id,
              po_number: fullPO.po_number,
              quotation_id: fullPO.quotation_id || "",
              vendor_id: fullPO.vendor_id,
              project_id: fullPO.project_id || fullPO.root_card_project_id || "",
              order_date: fullPO.order_date ? fullPO.order_date.split('T')[0] : new Date().toISOString().split('T')[0],
              expected_delivery_date: fullPO.expected_delivery_date ? fullPO.expected_delivery_date.split('T')[0] : "",
              delivery_location: fullPO.delivery_location || "",
              location_link: fullPO.location_link || "",
              currency: fullPO.currency || "INR",
              tax_template: fullPO.tax_template || "No Tax Template",
              notes: fullPO.notes || "",
              terms: fullPO.terms || "",
              items: fullPO.items || [],
              subtotal: fullPO.subtotal || 0,
              tax_amount: fullPO.tax_amount || 0,
              total_amount: fullPO.total_amount || 0,
            });
          } catch (error) {
            console.error("Error loading full PO:", error);
            setFormData({
              id: editData.id,
              po_number: editData.po_number,
              quotation_id: editData.quotation_id || "",
              vendor_id: editData.vendor_id,
              project_id: editData.project_id || editData.root_card_project_id || "",
              order_date: editData.order_date ? editData.order_date.split('T')[0] : new Date().toISOString().split('T')[0],
              expected_delivery_date: editData.expected_delivery_date ? editData.expected_delivery_date.split('T')[0] : "",
              delivery_location: editData.delivery_location || "",
              location_link: editData.location_link || "",
              currency: editData.currency || "INR",
              tax_template: editData.tax_template || "No Tax Template",
              notes: editData.notes || "",
              terms: editData.terms || "",
              items: editData.items || [],
              subtotal: editData.subtotal || 0,
              tax_amount: editData.tax_amount || 0,
              total_amount: editData.total_amount || 0,
            });
          }
        };
        loadFullPO();
      }
    }
  }, [isOpen]); // Only run when modal opens/closes

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

  const fetchProjects = async () => {
    try {
      const response = await axios.get("/root-cards");
      setProjects(response.data.rootCards || response.data.projects || response.data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const handleQuotationSelect = async (quotationId, passedQuote = null) => {
    if (!quotationId && !passedQuote) {
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
      let fullQuote = passedQuote;
      
      // If we only have an ID or if the passed quote doesn't have items, fetch the full details
      if (!fullQuote || !fullQuote.items) {
        const response = await axios.get(`/department/procurement/quotations/${quotationId || passedQuote.id}`);
        fullQuote = response.data;
      }
      
      if (fullQuote) {
        const initialItems = (fullQuote.items || []).map(item => {
          const rate = item.rate_per_kg > 0 ? item.rate_per_kg : (item.rate || item.unit_price || 0);
          const total_weight = item.total_weight || 0;
          const quantity = item.quantity || 0;
          
          return {
            material_name: item.vendor_item_name || item.item_name || item.description,
            item_group: item.item_group || "",
            part_detail: item.part_detail || "",
            material_grade: item.material_grade || "",
            remark: item.remark || "",
            make: item.make || "",
            quantity: quantity,
            uom: item.unit || item.uom || "Nos",
            total_weight: total_weight,
            rate: rate,
            amount: item.amount || (total_weight > 0 ? (total_weight * rate) : (quantity * rate)),
            length: item.length || null,
            width: item.width || null,
            thickness: item.thickness || null,
            diameter: item.diameter || null,
            outer_diameter: item.outer_diameter || null,
            height: item.height || null,
            unit_weight: item.unit_weight || 0,
            material_type: item.material_type || null,
            density: item.density || 0
          };
        });

        calculateTotals(initialItems, formData.tax_template);
        
        setFormData(prev => ({
          ...prev,
          quotation_id: fullQuote.id,
          vendor_id: fullQuote.vendor_id,
          project_id: fullQuote.project_id || fullQuote.root_card_id || fullQuote.root_card_project_id || prev.project_id || "",
          notes: prev.notes || `Created from Quotation: ${fullQuote.quotation_number || fullQuote.id}`
        }));
      }
    } catch (error) {
      console.error("Error fetching full quotation details:", error);
      toastUtils.error("Failed to fetch quotation details");
    }
  };

  const handleShortageSelect = async (shortage) => {
    if (!shortage) return;
    
    try {
      // If shortage doesn't have items, fetch them
      let fullShortage = shortage;
      if (!shortage.items) {
        const response = await axios.get(`/department/procurement/material-requests/${shortage.id}`);
        fullShortage = response.data.data || response.data.materialRequest;
      }

      if (fullShortage && fullShortage.items) {
        const initialItems = (fullShortage.items || []).map(item => ({
          material_name: item.item_name,
          item_group: item.item_group || "",
          part_detail: item.part_detail || "",
          material_grade: item.material_grade || "",
          remark: item.remark || "",
          make: item.make || "",
          quantity: item.required_quantity,
          uom: item.uom || "Nos",
          rate_per_kg: 0,
          rate: 0,
          amount: 0,
          length: item.length || null,
          width: item.width || null,
          thickness: item.thickness || null,
          diameter: item.diameter || null,
          outer_diameter: item.outer_diameter || null,
          height: item.height || null,
          total_weight: item.total_weight || 0,
          unit_weight: item.unit_weight || 0,
          material_type: item.material_type || null,
          density: item.density || 0
        }));

        calculateTotals(initialItems, formData.tax_template);
        
        setFormData(prev => ({
          ...prev,
          quotation_id: "", // No quotation for shortage yet
          project_id: fullShortage.project_id || fullShortage.root_card_id || prev.project_id || "",
          notes: prev.notes || `Created from Shortage Request: ${fullShortage.request_number}`
        }));
      }
    } catch (error) {
      console.error("Error loading shortage items:", error);
      toastUtils.error("Failed to load shortage request items");
    }
  };

  const handleAddItem = () => {
    if (!newManualItem.material_name) {
      toastUtils.warning("Please enter item name");
      return;
    }

    const newItem = {
      ...newManualItem,
      id: Date.now(),
      // Ensure numeric values
      quantity: parseFloat(newManualItem.quantity) || 0,
      rate: parseFloat(newManualItem.rate) || 0,
      total_weight: parseFloat(newManualItem.total_weight) || 0,
      unit_weight: parseFloat(newManualItem.unit_weight) || 0,
      length: parseFloat(newManualItem.length) || null,
      width: parseFloat(newManualItem.width) || null,
      thickness: parseFloat(newManualItem.thickness) || null,
      diameter: parseFloat(newManualItem.diameter) || null,
      outer_diameter: parseFloat(newManualItem.outer_diameter) || null,
      height: parseFloat(newManualItem.height) || null,
      density: parseFloat(newManualItem.density) || 0,
    };

    // Calculate initial amount based on weight if available
    if (newItem.total_weight > 0) {
      newItem.amount = newItem.rate * newItem.total_weight;
    } else {
      newItem.amount = newItem.quantity * newItem.rate;
    }

    const updatedItems = [...formData.items, newItem];
    calculateTotals(updatedItems);
    
    // Hide the form after adding an item
    setShowManualForm(false);
    
    // Reset the manual entry form
    setNewManualItem({
      material_name: "",
      item_group: "",
      material_grade: "",
      part_detail: "",
      make: "",
      quantity: 1,
      uom: "Nos",
      rate: 0,
      total_weight: 0,
      amount: 0,
      length: "",
      width: "",
      thickness: "",
      diameter: "",
      outer_diameter: "",
      height: "",
      material_type: "",
      density: 0,
      unit_weight: 0,
      remark: "",
      calculatedWeight: 0
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    calculateTotals(newItems);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    if (field === 'quantity' || field === 'rate' || field === 'total_weight') {
      const quantity = parseFloat(newItems[index].quantity) || 0;
      const rate = parseFloat(newItems[index].rate) || 0;
      const total_weight = parseFloat(newItems[index].total_weight) || 0;

      if (total_weight > 0) {
        newItems[index].amount = rate * total_weight;
      } else {
        newItems[index].amount = quantity * rate;
      }
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
        toastUtils.success("Purchase Order updated successfully!");
      } else {
        // Create new PO
        response = await axios.post("/department/procurement/purchase-orders", formData);
        toastUtils.success("Purchase Order created successfully!");

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

  const renderDimensionsText = (item) => {
    const group = (item.item_group || "").toLowerCase();
    const parts = [];
    if (group === "plate" || group === "plates") {
      if (item.length) parts.push(`L: ${Number(item.length)}`);
      if (item.width) parts.push(`W: ${Number(item.width)}`);
      if (item.thickness) parts.push(`T: ${Number(item.thickness)}`);
    } else if (group === "round bar") {
      if (item.diameter) parts.push(`Dia: ${Number(item.diameter)}`);
      if (item.length) parts.push(`L: ${Number(item.length)}`);
    } else if (group === "pipe") {
      if (item.outer_diameter) parts.push(`OD: ${Number(item.outer_diameter)}`);
      if (item.thickness) parts.push(`T: ${Number(item.thickness)}`);
      if (item.length) parts.push(`L: ${Number(item.length)}`);
    } else if (group === "block") {
      if (item.length) parts.push(`L: ${Number(item.length)}`);
      if (item.width) parts.push(`W: ${Number(item.width)}`);
      if (item.height) parts.push(`H: ${Number(item.height)}`);
    }
    
    if (parts.length === 0) return null;
    return (
      <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5">
        Dim: {parts.join(" \u00d7 ")} mm
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className={`p-2 flex items-center justify-between border-b transition-colors duration-300 sticky top-0 z-10 ${viewMode ? 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900' : 'border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/10'}`}>
          <h2 className="text-md  text-slate-900 dark:text-white flex items-center gap-2  ">
            {viewMode ? <Eye className="text-blue-600" size={15} /> : (editData ? <Edit className="text-emerald-600" size={15} /> : <Plus className="text-blue-600" size={15} />)}
            <span className={!viewMode && editData ? "text-emerald-700 dark:text-emerald-400" : ""}>
              {viewMode ? `View Purchase Order: ${formData.po_number}` : (editData ? `Edit Purchase Order: ${formData.po_number}` : "Create New Purchase Order")}
            </span>
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-2">
            {/* PO Header Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <FileText size={15} className="text-slate-400" />
                <h3 className="text-sm  text-slate-700 dark:text-slate-300  ">PO Header</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs  text-slate-500   ">PO Number</label>
                  <input 
                    type="text"
                    className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded   text-slate-500 outline-none"
                    value={formData.po_number}
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-xs  text-slate-500   ">Project</label>
                  <select 
                    className={`w-full p-2 text-xs ${viewMode ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-500' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white'} border border-slate-200 dark:border-slate-700 rounded   focus:ring-2 focus:ring-blue-500 transition-all outline-none`}
                    value={formData.project_id}
                    onChange={(e) => setFormData({...formData, project_id: e.target.value})}
                    disabled={viewMode}
                  >
                    <option value="">Select Project...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.project_name || p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs  text-slate-500   ">Quotation Reference</label>
                  <select 
                    className={`w-full p-2 text-xs ${viewMode || !!editData ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-500' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white'} border border-slate-200 dark:border-slate-700 rounded   focus:ring-2 focus:ring-blue-500 transition-all outline-none`}
                    value={formData.quotation_id}
                    onChange={(e) => handleQuotationSelect(e.target.value)}
                    disabled={viewMode || !!editData}
                  >
                    <option value="">No Quotation (Manual PO)</option>
                    {quotations.map(q => (
                      <option key={q.id} value={q.id}>{q.quotation_number}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs  text-slate-500   ">Supplier *</label>
                  <select 
                    className={`w-full p-2 text-xs ${viewMode || (!!formData.quotation_id && !!editData) ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-500 pointer-events-none' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white'} border border-slate-200 dark:border-slate-700 rounded   focus:ring-2 focus:ring-blue-500 transition-all outline-none`}
                    value={formData.vendor_id}
                    onChange={(e) => setFormData({...formData, vendor_id: e.target.value})}
                    disabled={viewMode || (!!formData.quotation_id && !!editData)}
                    required
                  >
                    <option value="">Select Supplier...</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs  text-slate-500   ">Order Date *</label>
                  <input 
                    type="date"
                    className={`w-full p-2 text-xs ${viewMode ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-500' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white'} border border-slate-200 dark:border-slate-700 rounded text-sm  focus:ring-2 focus:ring-blue-500 transition-all outline-none`}
                    value={formData.order_date}
                    onChange={(e) => setFormData({...formData, order_date: e.target.value})}
                    disabled={viewMode}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs  text-slate-500   ">Expected Delivery *</label>
                  <input 
                    type="date"
                    className={`w-full p-2 text-xs ${viewMode ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-500' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white'} border border-slate-200 dark:border-slate-700 rounded text-sm  focus:ring-2 focus:ring-blue-500 transition-all outline-none`}
                    value={formData.expected_delivery_date}
                    onChange={(e) => setFormData({...formData, expected_delivery_date: e.target.value})}
                    disabled={viewMode}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs  text-slate-500   ">Delivery Address</label>
                  <input 
                    type="text"
                    placeholder="e.g. Full Delivery Address"
                    className={`w-full p-2 text-xs ${viewMode ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-500' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white'} border border-slate-200 dark:border-slate-700 rounded text-sm  focus:ring-2 focus:ring-blue-500 transition-all outline-none`}
                    value={formData.delivery_location}
                    onChange={(e) => setFormData({...formData, delivery_location: e.target.value})}
                    disabled={viewMode}
                  />
                </div>

                <div>
                  <label className="block text-xs  text-slate-500   ">Location Link (Maps)</label>
                  {viewMode && formData.location_link ? (
                    <a 
                      href={formData.location_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-block w-full p-2 text-xs bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded text-sm  text-blue-600 dark:text-blue-400 hover:underline transition-all"
                    >
                      View on Google Maps
                    </a>
                  ) : (
                    <input 
                      type="text"
                      placeholder="e.g. https://maps.app.goo.gl/..."
                      className={`w-full p-2 text-xs ${viewMode ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-500' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white'} border border-slate-200 dark:border-slate-700 rounded text-sm  focus:ring-2 focus:ring-blue-500 transition-all outline-none`}
                      value={formData.location_link}
                      onChange={(e) => setFormData({...formData, location_link: e.target.value})}
                      disabled={viewMode}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Manual Form Toggle Button */}
            {!viewMode && !showManualForm && (
              <div className="flex justify-start my-4">
                <button 
                  type="button"
                  onClick={() => setShowManualForm(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-all "
                >
                  <Plus size={15} />
                  Add Items Manually
                </button>
              </div>
            )}

            {/* Quick Add Form (BOM Style) */}
            {!viewMode && showManualForm && (
              <div className="p-3 bg-emerald-50/30 dark:bg-emerald-900/10 rounded border border-emerald-100/50 dark:border-emerald-900/20 my-4 relative">
                <button 
                  type="button"
                  onClick={() => setShowManualForm(false)}
                  className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X size={15} />
                </button>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                      <Plus size={12} />
                    </div>
                    Add Raw Material Manually
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-3">
                    <label className="block text-[10px] text-slate-500 mb-1 ml-1">Item Name *</label>
                    <input
                      type="text"
                      value={newManualItem.material_name}
                      onChange={(e) => setNewManualItem(prev => ({ ...prev, material_name: e.target.value }))}
                      placeholder="Enter item name"
                      className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <SearchableSelect
                      label="Item Group"
                      options={itemGroupSelectOptions}
                      value={newManualItem.item_group}
                      onChange={(val) => setNewManualItem(prev => ({ 
                        ...prev, 
                        item_group: val,
                        uom: val?.toLowerCase() === "bought out" ? "Packet" : prev.uom
                      }))}
                      placeholder="Select group"
                      allowCustom={true}
                    />
                  </div>
                  {newManualItem.item_group?.toLowerCase() !== "bought out" && (
                    <>
                      <div className="md:col-span-3">
                        <SearchableSelect
                          label="Material (Density)"
                          options={MaterialTypeOptions}
                          value={newManualItem.density}
                          onChange={(val) => {
                            const selected = MaterialTypeOptions.find(opt => opt.value === val);
                            setNewManualItem(prev => ({ 
                              ...prev, 
                              density: val,
                              material_type: selected ? selected.label : ""
                            }));
                          }}
                          placeholder="Select material"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-[10px] text-slate-500 mb-1 ml-1">Grade</label>
                        <input
                          type="text"
                          value={newManualItem.material_grade}
                          onChange={(e) => setNewManualItem(prev => ({ ...prev, material_grade: e.target.value }))}
                          placeholder="Grade"
                          className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                        />
                      </div>
                    </>
                  )}

                  {/* Dimension Logic (Plates) */}
                  {newManualItem.item_group?.toLowerCase().includes("plate") && (
                    <>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-slate-500 mb-1 ml-1">L (mm)</label>
                        <input
                          type="number"
                          value={newManualItem.length}
                          onChange={(e) => setNewManualItem(prev => ({ ...prev, length: e.target.value }))}
                          className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-slate-500 mb-1 ml-1">W (mm)</label>
                        <input
                          type="number"
                          value={newManualItem.width}
                          onChange={(e) => setNewManualItem(prev => ({ ...prev, width: e.target.value }))}
                          className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-slate-500 mb-1 ml-1">T (mm)</label>
                        <input
                          type="number"
                          value={newManualItem.thickness}
                          onChange={(e) => setNewManualItem(prev => ({ ...prev, thickness: e.target.value }))}
                          className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none"
                        />
                      </div>
                    </>
                  )}

                  {/* Round Bar */}
                  {newManualItem.item_group?.toLowerCase().includes("round bar") && (
                    <>
                      <div className="md:col-span-3">
                        <label className="block text-[10px] text-slate-500 mb-1 ml-1">Dia (mm)</label>
                        <input
                          type="number"
                          value={newManualItem.diameter}
                          onChange={(e) => setNewManualItem(prev => ({ ...prev, diameter: e.target.value }))}
                          className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-[10px] text-slate-500 mb-1 ml-1">Length (mm)</label>
                        <input
                          type="number"
                          value={newManualItem.length}
                          onChange={(e) => setNewManualItem(prev => ({ ...prev, length: e.target.value }))}
                          className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none"
                        />
                      </div>
                    </>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-[10px] text-slate-500 mb-1 ml-1">Qty *</label>
                    <input
                      type="number"
                      value={newManualItem.quantity}
                      onChange={(e) => setNewManualItem(prev => ({ ...prev, quantity: e.target.value }))}
                      className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <SearchableSelect
                      label="UOM"
                      options={UOMOptions.map(u => ({ label: u, value: u }))}
                      value={newManualItem.uom}
                      onChange={(val) => setNewManualItem(prev => ({ ...prev, uom: val }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] text-slate-500 mb-1 ml-1">Rate (₹)</label>
                    <input
                      type="number"
                      value={newManualItem.rate}
                      onChange={(e) => setNewManualItem(prev => ({ ...prev, rate: e.target.value }))}
                      className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none border-blue-200 dark:border-blue-900/30"
                      placeholder="Rate"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] text-slate-500 mb-1 ml-1">Make</label>
                    <input
                      type="text"
                      value={newManualItem.make}
                      onChange={(e) => setNewManualItem(prev => ({ ...prev, make: e.target.value }))}
                      placeholder="Make"
                      className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full py-2 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1 shadow-md shadow-emerald-500/20"
                    >
                      <Plus size={14} /> Add Item
                    </button>
                  </div>
                </div>

                {newManualItem.calculatedWeight > 0 && (
                  <div className="mt-3 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    Calculated Unit Weight: {newManualItem.calculatedWeight.toFixed(3)} Kg | 
                    Total Weight: {(newManualItem.calculatedWeight * newManualItem.quantity).toFixed(3)} Kg
                  </div>
                )}
              </div>
            )}

            {/* Items Table */}
            <div className="space-y-2">
              <div className="flex items-center  justify-between my-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Package size={15} className="text-slate-400" />
                  <h3 className="text-sm  text-slate-700 dark:text-slate-300  ">Purchase Order Items</h3>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl overflow-x-auto ">
                <table className="w-full text-sm min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 text-xs   text-slate-500 ">
                      <th className="p-2 text-left">Item Details</th>
                      <th className="p-2 text-left">Technical Specs</th>
                      <th className="p-2 text-center w-20">Qty</th>
                      <th className="p-2 text-center w-20">UOM</th>
                      <th className="p-2 text-center w-32">Rate/Price</th>
                      <th className="p-2 text-center w-32">Weight (Kg)</th>
                      <th className="p-2 text-right w-40">Total</th>
                      {!viewMode && <th className="p-2 text-center "></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                    {formData.items.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="p-4 text-center text-slate-400 italic">
                          No items added. Use the form above to add raw materials.
                        </td>
                      </tr>
                    ) : (
                      formData.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="p-2">
                            <div className="flex flex-col">
                              {viewMode ? (
                                <span className="text-xs font-medium text-slate-900 dark:text-white">{item.material_name}</span>
                              ) : (
                                <input 
                                  type="text"
                                  className="w-full bg-transparent border-none p-0 text-xs text-slate-900 dark:text-white focus:ring-0"
                                  value={item.material_name}
                                  onChange={(e) => handleItemChange(idx, 'material_name', e.target.value)}
                                />
                              )}
                              <span className="text-[10px] text-slate-500">{item.item_group || "No Group"}</span>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex flex-col">
                              {renderDimensionsText(item)}
                              <span className="text-[10px] text-slate-400 italic">
                                {item.material_grade} {item.make ? `| Make: ${item.make}` : ""}
                              </span>
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            {viewMode ? (
                              <span className="text-xs">{item.quantity}</span>
                            ) : (
                              <input 
                                type="number"
                                className="w-16 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded p-1 text-center text-xs"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                              />
                            )}
                          </td>
                          <td className="p-2 text-center text-xs text-slate-500">
                            {item.uom || item.unit || "Nos"}
                          </td>
                          <td className="p-2 text-center">
                            {viewMode ? (
                              <span className="text-xs">₹{item.rate}/{item.total_weight > 0 ? 'kg' : 'unit'}</span>
                            ) : (
                              <input 
                                type="number"
                                className="w-20 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded p-1 text-center text-xs"
                                placeholder="Rate"
                                value={item.rate || ""}
                                onChange={(e) => handleItemChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                              />
                            )}
                          </td>
                          <td className="p-2 text-center text-xs text-slate-500">
                            {item.total_weight ? `${parseFloat(item.total_weight).toFixed(3)} Kg` : "-"}
                          </td>
                          <td className="p-2 text-right font-medium text-xs">
                            ₹{(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          {!viewMode && (
                            <td className="p-2 text-center">
                              <button 
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 my-5">
              <div className="md:col-span-2 space-y-2">
                <div>
                  <label className="block text-xs  text-slate-500   ">Notes</label>
                  {viewMode ? (
                    <div className="w-full p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded text-xs  text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {formData.notes || <span className="text-slate-400 italic">No notes added</span>}
                    </div>
                  ) : (
                    <textarea 
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs  focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                      rows={3}
                      placeholder="Enter any internal notes or details..."
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs  text-slate-500    text-blue-600 dark:text-blue-400">Terms & Conditions</label>
                  {viewMode ? (
                    <div className="w-full  p-2 bg-blue-50/30 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-900/30 rounded text-xs  text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {formData.terms || <span className="text-slate-400 italic">No terms & conditions specified</span>}
                    </div>
                  ) : (
                    <textarea 
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm  focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none border-blue-100 dark:border-blue-900/30"
                      rows={2}
                      placeholder="Enter payment terms, delivery terms, and other conditions..."
                      value={formData.terms}
                      onChange={(e) => setFormData({...formData, terms: e.target.value})}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="p-2 bg-blue-600 rounded  shadow-blue-500/20 space-y-2">
                  <div className="flex justify-between items-center text-blue-100">
                    <span className="text-xs   ">Subtotal</span>
                    <span className=" text-xs">₹{formData.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-blue-100">
                    <div className="flex flex-col">
                      <span className="text-xs   ">Tax</span>
                      <select 
                        className="mt-1 bg-blue-500 text-white text-xs  border border-blue-400 rounded px-1 py-0.5 outline-none disabled:opacity-50"
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
                    <span className=" text-xs">₹{formData.tax_amount.toLocaleString()}</span>
                  </div>
                  <div className="pt-4 border-t border-blue-500 flex justify-between items-center text-white">
                    <span className="text-sm">Grand Total</span>
                    <span className="text-sm  ">₹{formData.total_amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 sticky bottom-0 z-10">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-slate-500 hover:text-slate-700  text-xs   transition-colors"
            >
              Cancel
            </button>
            {viewMode ? (
              !isInventoryView && (
                <button 
                  type="button"
                  onClick={() => setViewMode(false)}
                  className="px-8 py-2.5 bg-blue-600 text-white rounded  text-xs   hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2"
                >
                  <Edit size={15} />
                  Edit PO
                </button>
              )
            ) : (
              <button 
                type="submit"
                disabled={submitting}
                className={`px-8 py-2.5 ${editData ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25'} text-white rounded  text-xs   shadow-lg transition-all flex items-center gap-2`}
              >
                {submitting ? <RefreshCw size={15} className="animate-spin" /> : (editData ? <Save size={15} /> : <CheckCircle size={15} />)}
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
