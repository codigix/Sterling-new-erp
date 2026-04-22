import React, { useState, useEffect } from "react";
import { X, CheckCircle, Package, User, Calendar, Trash2, Plus, LayoutGrid, Truck } from "lucide-react";
import axios from "../../utils/api";
import Swal from "sweetalert2";
import toastUtils from "../../utils/toastUtils";
import DataTable from "../../components/ui/DataTable/DataTable";

const CreateGRNRequestModal = ({ isOpen, onClose, po, onGRNCreated }) => {
  const [loading, setLoading] = useState(false);
  const [allPOs, setAllPOs] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]);
  const [formData, setFormData] = useState({
    po_id: null,
    po_number: "",
    receipt_date: new Date().toISOString().split('T')[0],
    transporter_notes: "",
    items: [],
    vendor_id: null,
    vendor_name: "No Supplier Linked"
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [poRes, matRes] = await Promise.all([
          axios.get("/department/inventory/purchase-orders?status=approved"),
          axios.get("/department/inventory/materials")
        ]);
        setAllPOs(poRes.data.purchaseOrders || poRes.data || []);
        setAllMaterials(matRes.data.materials || matRes.data || []);
      } catch (error) {
        console.error("Error fetching data for GRN modal:", error);
      }
    };
    if (isOpen) fetchData();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (po) {
        // Initialize from provided PO
        const initialItems = (po.items || []).map(item => ({
          ...item,
          received_quantity: item.quantity,
          material_name: item.material_name || item.itemName || item.item_name || item.name || item.description,
          material_code: item.material_code || item.itemCode || item.item_code || item.code,
          rate: item.rate || item.unit_price || item.unitCost || 0,
          unit: item.unit || "Units",
          is_po_item: true
        }));
        
        setFormData({
          po_id: po.id,
          po_number: po.po_number,
          receipt_date: new Date().toISOString().split('T')[0],
          transporter_notes: "",
          items: initialItems,
          vendor_id: po.vendor_id,
          vendor_name: po.vendor_name || "Active Vendor",
          root_card_id: po.root_card_id,
          root_card_project_name: po.root_card_project_name
        });
      } else {
        // Reset for manual entry
        setFormData({
          po_id: null,
          po_number: "",
          receipt_date: new Date().toISOString().split('T')[0],
          transporter_notes: "",
          items: [],
          vendor_id: null,
          vendor_name: "No Supplier Linked"
        });
      }
    }
  }, [isOpen, po]);

  const handlePOChange = async (poId) => {
    if (!poId) {
      setFormData(prev => ({ ...prev, po_id: null, po_number: "", items: [], vendor_id: null, vendor_name: "No Supplier Linked" }));
      return;
    }

    try {
      const selectedPO = allPOs.find(p => p.id === parseInt(poId));
      if (selectedPO) {
        const response = await axios.get(`/department/inventory/purchase-orders/${selectedPO.id}`);
        const poDetails = response.data;
        
        const initialItems = (poDetails.items || []).map(item => ({
          ...item,
          received_quantity: item.quantity,
          material_name: item.material_name || item.itemName || item.item_name || item.name || item.description,
          material_code: item.material_code || item.itemCode || item.item_code || item.code,
          rate: item.rate || item.unit_price || item.unitCost || 0,
          unit: item.unit || "Units",
          is_po_item: true
        }));

        setFormData(prev => ({
          ...prev,
          po_id: selectedPO.id,
          po_number: selectedPO.po_number,
          items: initialItems,
          vendor_id: selectedPO.vendor_id,
          vendor_name: selectedPO.vendor_name || "Active Vendor",
          root_card_id: selectedPO.root_card_id,
          root_card_project_name: selectedPO.root_card_project_name
        }));
      }
    } catch (error) {
      console.error("Error loading PO details:", error);
    }
  };

  const handleAddLineItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          material_name: "",
          material_code: "",
          quantity: 0,
          received_quantity: 0,
          rate: 0,
          unit: "Units"
        }
      ]
    }));
  };

  const handleItemSelect = (index, materialId) => {
    const selectedMat = allMaterials.find(m => m.id === parseInt(materialId));
    if (!selectedMat) return;

    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      material_id: selectedMat.id,
      material_name: selectedMat.itemName || selectedMat.name || selectedMat.description,
      material_code: selectedMat.itemCode || selectedMat.item_code || selectedMat.code,
      rate: selectedMat.unitCost || selectedMat.valuationRate || selectedMat.unit_price || 0,
      unit: selectedMat.unit || "Units"
    };
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      toastUtils.warning("Please add at least one item");
      return;
    }

    setLoading(true);
    try {
      // Map frontend keys to backend expected keys
      const mappedItems = formData.items.map(item => ({
        po_item_id: item.id || item.po_item_id,
        material_name: item.material_name || item.itemName || item.item_name || item.name || item.description,
        received_qty: item.received_quantity,
        unit: item.unit,
        generate_st: true,
        // Include technical specs/dimensions
        length: item.length,
        width: item.width,
        thickness: item.thickness,
        diameter: item.diameter,
        outer_diameter: item.outer_diameter,
        height: item.height,
        side1: item.side1,
        side2: item.side2,
        side_s: item.side_s,
        side_s1: item.side_s1,
        side_s2: item.side_s2,
        web_thickness: item.web_thickness || item.tw,
        flange_thickness: item.flange_thickness || item.tf,
        density: item.density,
        unit_weight: item.unit_weight,
        total_weight: item.total_weight,
        material_type: item.material_type,
        item_group: item.item_group
      }));

      await axios.post("/department/inventory/purchase-orders/receipts", {
        purchase_order_id: formData.po_id,
        items: mappedItems,
        posting_date: formData.receipt_date,
        notes: formData.transporter_notes,
        vendor_id: formData.vendor_id
      });

      toastUtils.success("Purchase Receipt created successfully with ST Numbers");
      if (onGRNCreated) onGRNCreated(true);
      onClose();
    } catch (error) {
      console.error("Error creating GRN:", error);
      toastUtils.error(error.response?.data?.message || "Failed to create receipt");
    } finally {
      setLoading(false);
    }
  };

  const renderDimensionsText = (item) => {
    const group = (item.item_group || "").toLowerCase();
    const parts = [];
    
    const val = (v) => {
      const n = parseFloat(v);
      return (n && !isNaN(n) && n !== 0) ? n : null;
    };

    if (group === "plate" || group === "plates") {
      if (val(item.length)) parts.push(`L: ${val(item.length)}`);
      if (val(item.width)) parts.push(`W: ${val(item.width)}`);
      if (val(item.thickness)) parts.push(`T: ${val(item.thickness)}`);
    } else if (group === "round bar") {
      if (val(item.diameter)) parts.push(`Dia: ${val(item.diameter)}`);
      if (val(item.length)) parts.push(`L: ${val(item.length)}`);
    } else if (group === "pipe") {
      if (val(item.outer_diameter)) parts.push(`OD: ${val(item.outer_diameter)}`);
      if (val(item.thickness)) parts.push(`T: ${val(item.thickness)}`);
      if (val(item.length)) parts.push(`L: ${val(item.length)}`);
    } else if (group === "block") {
      if (val(item.length)) parts.push(`L: ${val(item.length)}`);
      if (val(item.width)) parts.push(`W: ${val(item.width)}`);
      if (val(item.height)) parts.push(`H: ${val(item.height)}`);
    } else if (group.includes("square bar") || group === "sq bar") {
      if (val(item.side1 || item.width || item.side_s || item.s))
        parts.push(`S: ${val(item.side1 || item.width || item.side_s || item.s)}`);
      if (val(item.length)) parts.push(`L: ${val(item.length)}`);
    } else if (group.includes("rectangular bar") || group === "rec bar") {
      if (val(item.side1 || item.width))
        parts.push(`W: ${val(item.side1 || item.width)}`);
      if (val(item.side2 || item.height || item.side_s1))
        parts.push(`H: ${val(item.side2 || item.height || item.side_s1)}`);
      if (val(item.length)) parts.push(`L: ${val(item.length)}`);
    } else if (group.includes("square tube") || group === "sq tube") {
      if (val(item.side1 || item.width || item.side_s || item.s))
        parts.push(`S: ${val(item.side1 || item.width || item.side_s || item.s)}`);
      if (val(item.thickness)) parts.push(`T: ${val(item.thickness)}`);
      if (val(item.length)) parts.push(`L: ${val(item.length)}`);
    } else if (group.includes("rectangular tube") || group === "rec tube") {
      if (val(item.side1 || item.width))
        parts.push(`W: ${val(item.side1 || item.width)}`);
      if (val(item.side2 || item.height || item.side_s1))
        parts.push(`H: ${val(item.side2 || item.height || item.side_s1)}`);
      if (val(item.thickness)) parts.push(`T: ${val(item.thickness)}`);
      if (val(item.length)) parts.push(`L: ${val(item.length)}`);
    } else if (group.includes("c channel") || group.includes("channel")) {
      if (val(item.side1 || item.width))
        parts.push(`W: ${val(item.side1 || item.width)}`);
      if (val(item.side2 || item.height || item.side_s1))
        parts.push(`H: ${val(item.side2 || item.height || item.side_s1)}`);
      if (val(item.web_thickness || item.thickness || item.tw || item.side_s2))
        parts.push(`Tw: ${val(item.web_thickness || item.thickness || item.tw || item.side_s2)}`);
      if (val(item.flange_thickness || item.tf))
        parts.push(`Tf: ${val(item.flange_thickness || item.tf)}`);
      if (val(item.length)) parts.push(`L: ${val(item.length)}`);
    } else if (group.includes("angle")) {
      if (val(item.side1 || item.width || item.side_s))
        parts.push(`S1: ${val(item.side1 || item.width || item.side_s)}`);
      if (val(item.side2 || item.height || item.side_s1))
        parts.push(`S2: ${val(item.side2 || item.height || item.side_s1)}`);
      if (val(item.thickness)) parts.push(`T: ${val(item.thickness)}`);
      if (val(item.length)) parts.push(`L: ${val(item.length)}`);
    } else if (group.includes("beam")) {
      if (val(item.side1 || item.width))
        parts.push(`W: ${val(item.side1 || item.width)}`);
      if (val(item.side2 || item.height || item.side_s1))
        parts.push(`H: ${val(item.side2 || item.height || item.side_s1)}`);
      if (val(item.web_thickness || item.thickness || item.tw || item.side_s2))
        parts.push(`Tw: ${val(item.web_thickness || item.thickness || item.tw || item.side_s2)}`);
      if (val(item.flange_thickness || item.tf))
        parts.push(`Tf: ${val(item.flange_thickness || item.tf)}`);
      if (val(item.length)) parts.push(`L: ${val(item.length)}`);
    }
    
    if (parts.length === 0) return null;
    return (
      <div className="text-[10px] text-blue-600 dark:text-blue-400  mt-0.5">
        Dim: {parts.join(" \u00d7 ")} mm
      </div>
    );
  };

  if (!isOpen) return null;

  const totalQuantity = formData.items.reduce((sum, item) => sum + (Number(item.received_quantity) || 0), 0);
  const totalValuation = formData.items.reduce((sum, item) => sum + (Number(item.received_quantity) || 0) * (Number(item.rate) || 0), 0);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded  shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
          <h2 className="text-xl  text-slate-900 dark:text-white flex items-center gap-2">
            Create GRN Request
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="flex flex-col md:flex-row h-full">
            {/* Left Sidebar Info */}
            <div className="w-full md:w-80 bg-slate-50/50 dark:bg-slate-800/30 p-6 border-r border-slate-100 dark:border-slate-800 space-y-2">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center">
                    <Package size={15} />
                  </div>
                  <span className="text-xs   tracking-wider">Receipt Context</span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs  text-slate-400   block mb-1"># GRN Number</label>
                    <input 
                      disabled 
                      className="w-full px-3 py-2 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-xs  text-slate-500"
                      value={`GRN-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs  text-slate-400   block mb-1">Purchase Order</label>
                    <select
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs  text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.po_id || ""}
                      onChange={(e) => handlePOChange(e.target.value)}
                    >
                      <option value="">Select PO (Optional)</option>
                      {Array.isArray(allPOs) && allPOs.map(po => (
                        <option key={po.id} value={po.id}>{po.po_number} - {po.vendor_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs  text-slate-400   block mb-1">Receipt Date</label>
                    <div className="relative">
                      <input 
                        type="date"
                        className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs  text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.receipt_date}
                        onChange={(e) => setFormData({ ...formData, receipt_date: e.target.value })}
                      />
                      <Calendar className="absolute left-3 top-2.5 text-slate-400" size={14} />
                    </div>
                  </div>
                </div>
              </div>

              {formData.root_card_project_name && (
                <div className="pt-6 border-t border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <div className="w-8 h-8 rounded bg-indigo-100 flex items-center justify-center">
                      <LayoutGrid size={15} />
                    </div>
                    <span className="text-xs   tracking-wider">Project Context</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-4 rounded border border-slate-100 dark:border-slate-800 ">
                      <p className="text-xs  text-slate-400   mb-1">Project Name</p>
                      <h4 className="text-xs  text-slate-900 dark:text-white   leading-relaxed break-words">
                        {formData.root_card_project_name}
                      </h4>
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <User size={15} />
                  </div>
                  <span className="text-xs   tracking-wider">Supplier Info</span>
                </div>
                <div className="border-slate-100 dark:border-slate-700 ">
                    <p className="text-xs  text-slate-400   mb-1">Selected Supplier</p>
                    <h4 className="text-xs  text-slate-900 dark:text-white">{formData.vendor_name}</h4>
                    <p className="text-xs text-slate-500 mt-1  tracking-wider">ID: {formData.vendor_id ? `SUP-${formData.vendor_id}` : 'N/A'}</p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-4">
                   <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Truck size={15} />
                  </div>
                  <span className="text-xs   tracking-wider">Transporter Notes</span>
                </div>
                <textarea 
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs  text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                  placeholder="Vehicle number, driver details etc..."
                  value={formData.transporter_notes}
                  onChange={(e) => setFormData({ ...formData, transporter_notes: e.target.value })}
                ></textarea>
              </div>
            </div>

            {/* Main Content - Items Table */}
            <div className="flex-1 p-6 flex flex-col min-h-0 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                    <LayoutGrid size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs  text-slate-900 dark:text-white  tracking-wider">Receipt Items</h3>
                    <p className="text-xs text-slate-500 ">Verify received quantities against PO</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={handleAddLineItem}
                  className="flex items-center gap-1.5 p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded text-xs   tracking-wider hover:bg-blue-100 transition-all active:scale-95 border border-blue-100 dark:border-blue-800"
                >
                  <Plus size={15} /> Add Line Item
                </button>
              </div>

              <div className="flex-1 border border-slate-100 dark:border-slate-800 rounded  overflow-hidden">
                <DataTable
                  data={formData.items}
                  showSearch={false}
                  columns={[
                    {
                      key: "item_details",
                      label: "Item Details",
                      className: "min-w-[250px]",
                      render: (_, item, idx) => {
                        const itemName = item.material_name || item.itemName || item.item_name || item.name || item.description;
                        const itemCode = item.material_code || item.itemCode || item.item_code || item.code || "GENERIC";
                        const isPredefined = item.is_po_item || item.material_id || item.id || itemName;

                        return isPredefined ? (
                          <div className="space-y-1">
                            <h4 className="text-xs  text-slate-900 dark:text-white   leading-tight">
                              {itemName}
                            </h4>
                            {renderDimensionsText(item)}
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10px]  text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-800  tracking-wider">
                                {itemCode}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <select 
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 text-xs  text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                            value={item.material_id || ""}
                            onChange={(e) => handleItemSelect(idx, e.target.value)}
                          >
                            <option value="">Select Item</option>
                            {Array.isArray(allMaterials) && allMaterials.map(m => (
                              <option key={m.id} value={m.id}>{m.itemCode || m.item_code} - {m.itemName || m.name}</option>
                            ))}
                          </select>
                        );
                      }
                    },
                    {
                      key: "quantity",
                      label: "PO Qty",
                      className: "text-center w-24",
                      render: (val) => <span className="text-xs  text-slate-500">{val ? parseFloat(val).toString() : "0"}</span>
                    },
                    {
                      key: "received_quantity",
                      label: "Received",
                      className: "text-center w-24",
                      render: (val, _, __, idx) => (
                        <input 
                          type="number"
                          step="any"
                          className="w-20 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs  text-blue-600 text-center outline-none focus:ring-2 focus:ring-blue-500"
                          value={val !== undefined && val !== null ? parseFloat(val) : ""}
                          onChange={(e) => handleItemChange(idx, "received_quantity", e.target.value)}
                        />
                      )
                    },
                    {
                      key: "rate",
                      label: "Rate",
                      className: "text-center w-24",
                      render: (val, _, __, idx) => (
                        <input 
                          type="number"
                          step="any"
                          className="w-20 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs  text-slate-500 text-center outline-none focus:ring-2 focus:ring-blue-500"
                          value={val}
                          onChange={(e) => handleItemChange(idx, "rate", e.target.value)}
                        />
                      )
                    },
                    {
                      key: "total",
                      label: "Total",
                      className: "text-center w-32",
                      render: (_, item) => (
                        <span className="text-xs  text-slate-900 dark:text-white">
                          ₹{((Number(item.received_quantity) || 0) * (Number(item.rate) || 0)).toLocaleString()}
                        </span>
                      )
                    },
                    {
                      key: "action",
                      label: "Action",
                      className: "text-center",
                      render: (_, __, idx) => (
                        <button 
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                        >
                          <Trash2 size={15} />
                        </button>
                      )
                    }
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-center justify-between gap-4 sticky bottom-0 z-20">
            <div className="flex items-center gap-12">
              <div className="flex flex-col">
                <span className="text-xs  text-slate-400   mb-1">Total Quantity</span>
                <span className="text-sm  text-slate-900 dark:text-white">{totalQuantity.toLocaleString()} Units</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs  text-slate-400   mb-1">Total Valuation</span>
                <span className="text-lg  text-blue-600">₹{totalValuation.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 md:flex-none px-8 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 rounded  text-xs  tracking-wider transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={loading || formData.items.length === 0}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded  text-xs  tracking-wider shadow-lg shadow-blue-200 dark:shadow-none transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded  animate-spin" /> : <Plus size={15} />}
                Create GRN Request
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGRNRequestModal;
