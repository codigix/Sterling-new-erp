import React, { useState, useEffect } from "react";
import { X, Package, Calendar, Trash2, Plus, LayoutGrid, ClipboardList, Info, Zap, ShieldCheck, User } from "lucide-react";
import axios from "../../utils/api";
import Swal from "sweetalert2";
import toastUtils from "../../utils/toastUtils";
import DataTable from "../../components/ui/DataTable/DataTable";

const CreateStockEntryModal = ({ isOpen, onClose, onEntryCreated }) => {
  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [grns, setGrns] = useState([]);
  
  // Form State
  const [formData, setFormData] = useState({
    grn_id: "",
    entry_date: new Date().toISOString().split('T')[0],
    entry_type: "Material Receipt",
    project_name: "",
    vendor_name: "",
    remarks: "",
    items: []
  });

  // Current Item Input State
  const [currentItem, setCurrentItem] = useState({
    material_id: "",
    item_code: "",
    item_name: "",
    item_group: "",
    quantity: 1,
    uom: "Kg",
    batch_no: "",
    valuation_rate: 0,
    unit_weight: 0,
    total_weight: 0,
    density: 7850,
    length: "",
    width: "",
    thickness: "",
    diameter: "",
    outer_diameter: "",
    height: "",
    web_thickness: "",
    flange_thickness: "",
    side_s: "",
    side_s1: "",
    side_s2: ""
  });

  const calculateItemWeight = (item) => {
    const group = (item.item_group || "").toLowerCase();
    const l = parseFloat(item.length) / 1000 || 0;
    const w = parseFloat(item.width) / 1000 || 0;
    const t = parseFloat(item.thickness) / 1000 || 0;
    const d = parseFloat(item.diameter) / 1000 || 0;
    const od = parseFloat(item.outer_diameter) / 1000 || 0;
    const h = parseFloat(item.height) / 1000 || 0;
    const wt = parseFloat(item.web_thickness) / 1000 || 0;
    const ft = parseFloat(item.flange_thickness) / 1000 || 0;
    const s = parseFloat(item.side_s) / 1000 || 0;
    const s1 = parseFloat(item.side_s1) / 1000 || 0;
    const s2 = parseFloat(item.side_s2) / 1000 || 0;
    const density = parseFloat(item.density) || 7850;

    let area = 0;

    if (group.includes("plate")) {
      area = l * w * t;
    } else if (group.includes("round bar")) {
      area = (Math.PI * Math.pow(d / 2, 2)) * l;
    } else if (group.includes("pipe")) {
      const id = od - (2 * t);
      area = (Math.PI * (Math.pow(od / 2, 2) - Math.pow(id / 2, 2))) * l;
    } else if (group.includes("square bar")) {
      area = s * s * l;
    } else if (group.includes("rectangular bar")) {
      area = w * h * l;
    } else if (group.includes("square tube")) {
      const is = s - (2 * t);
      area = (Math.pow(s, 2) - Math.pow(is, 2)) * l;
    } else if (group.includes("rectangular tube")) {
      const iw = w - (2 * t);
      const ih = h - (2 * t);
      area = (w * h - iw * ih) * l;
    } else if (group.includes("angle")) {
      area = (s1 * t + (s2 - t) * t) * l;
    } else if (group.includes("channel") || group.includes("beam")) {
      area = (w * ft * 2 + (h - 2 * ft) * wt) * l;
    }

    return area * density;
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
    } else if (group.includes("square bar") || group === "sq bar" || group.includes("square tube") || group === "sq tube") {
      if (val(item.side1 || item.width || item.side_s || item.s)) parts.push(`S: ${val(item.side1 || item.width || item.side_s || item.s)}`);
      if (val(item.thickness)) parts.push(`T: ${val(item.thickness)}`);
      if (val(item.length)) parts.push(`L: ${val(item.length)}`);
    } else if (group.includes("rectangular bar") || group === "rec bar" || group.includes("rectangular tube") || group === "rec tube") {
      if (val(item.width || item.side1)) parts.push(`W: ${val(item.width || item.side1)}`);
      if (val(item.thickness || item.side2 || item.height || item.side_s1)) parts.push(`T: ${val(item.thickness || item.side2 || item.height || item.side_s1)}`);
      if (val(item.length)) parts.push(`L: ${val(item.length)}`);
    } else if (group.includes("angle")) {
      if (val(item.side1 || item.side_s)) parts.push(`S1: ${val(item.side1 || item.side_s)}`);
      if (val(item.side2 || item.side_s1 || item.height)) parts.push(`S2: ${val(item.side2 || item.side_s1 || item.height)}`);
      if (val(item.thickness)) parts.push(`T: ${val(item.thickness)}`);
      if (val(item.length)) parts.push(`L: ${val(item.length)}`);
    } else if (group.includes("channel") || group.includes("beam")) {
      if (val(item.side1 || item.height)) parts.push(`H: ${val(item.side1 || item.height)}`);
      if (val(item.side2 || item.width)) parts.push(`W: ${val(item.side2 || item.width)}`);
      if (val(item.web_thickness || item.thickness || item.tw)) parts.push(`Tw: ${val(item.web_thickness || item.thickness || item.tw)}`);
      if (val(item.flange_thickness || item.tf)) parts.push(`Tf: ${val(item.flange_thickness || item.tf)}`);
      if (val(item.length)) parts.push(`L: ${val(item.length)}`);
    }
    
    if (parts.length === 0) return null;
    return (
      <div className="text-[10px] text-blue-600 dark:text-blue-400  mt-0.5">
        Dim: {parts.join(" \u00d7 ")} mm
      </div>
    );
  };

  // Calculate total weight when quantity or dimensions change
  useEffect(() => {
    const weight = calculateItemWeight(currentItem);
    if (weight > 0) {
      setCurrentItem(prev => ({
        ...prev,
        unit_weight: weight,
        total_weight: weight * (prev.quantity || 0)
      }));
    } else {
      setCurrentItem(prev => ({
        ...prev,
        total_weight: (prev.quantity || 0) * (prev.unit_weight || 0)
      }));
    }
  }, [
    currentItem.quantity, currentItem.unit_weight, currentItem.item_group,
    currentItem.length, currentItem.width, currentItem.thickness,
    currentItem.diameter, currentItem.outer_diameter, currentItem.height,
    currentItem.web_thickness, currentItem.flange_thickness,
    currentItem.side_s, currentItem.side_s1, currentItem.side_s2,
    currentItem.density
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [matRes, grnRes] = await Promise.all([
          axios.get("/inventory/materials"),
          axios.get("/inventory/grns?status=awaiting_storage")
        ]);
        setMaterials(matRes.data.materials || matRes.data || []);
        setGrns(grnRes.data.grns || grnRes.data || []);
      } catch (error) {
        console.error("Error fetching data for Stock Entry modal:", error);
      }
    };
    if (isOpen) fetchData();
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === "grn_id" && value) {
      const selectedGrn = grns.find(g => g.id === parseInt(value));
      if (selectedGrn) {
        setFormData(prev => ({
          ...prev,
          project_name: selectedGrn.project_name || "",
          vendor_name: selectedGrn.vendor_name || "",
        }));
      }
    }
  };

  const handleCurrentItemChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "material_id") {
      const selectedMat = materials.find(m => m.id === parseInt(value));
      if (selectedMat) {
        setCurrentItem(prev => ({
          ...prev,
          material_id: value,
          item_code: selectedMat.itemCode || selectedMat.item_code || "",
          item_name: selectedMat.itemName || selectedMat.item_name || "",
          item_group: selectedMat.item_group || "",
          uom: selectedMat.unit || "Kg",
          valuation_rate: selectedMat.unit_cost || 0,
          unit_weight: selectedMat.unit_weight || 0,
          density: selectedMat.density || 7850,
          length: selectedMat.length || "",
          width: selectedMat.width || "",
          thickness: selectedMat.thickness || "",
          diameter: selectedMat.diameter || "",
          outer_diameter: selectedMat.outer_diameter || "",
          height: selectedMat.height || "",
          web_thickness: selectedMat.web_thickness || selectedMat.tw || "",
          flange_thickness: selectedMat.flange_thickness || selectedMat.tf || "",
          side_s: selectedMat.side_s || selectedMat.s || "",
          side_s1: selectedMat.side_s1 || selectedMat.s1 || "",
          side_s2: selectedMat.side_s2 || selectedMat.s2 || ""
        }));
      } else {
        setCurrentItem(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setCurrentItem(prev => ({ ...prev, [name]: value }));
    }
  };

  const addItem = () => {
    if (!currentItem.material_id || currentItem.quantity <= 0) {
      toastUtils.error("Please select an item and enter a valid quantity");
      return;
    }

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...currentItem, id: Date.now() }]
    }));

    // Reset current item
    setCurrentItem({
      material_id: "",
      item_code: "",
      item_name: "",
      item_group: "",
      quantity: 1,
      uom: "Kg",
      batch_no: "",
      valuation_rate: 0,
      unit_weight: 0,
      total_weight: 0,
      density: 7850,
      length: "",
      width: "",
      thickness: "",
      diameter: "",
      outer_diameter: "",
      height: "",
      web_thickness: "",
      flange_thickness: "",
      side_s: "",
      side_s1: "",
      side_s2: ""
    });
  };

  const removeItem = (id) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const handleSubmit = async (isDraft = false) => {
    if (formData.items.length === 0) {
      toastUtils.error("Please add at least one item");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        status: isDraft ? 'draft' : 'submitted'
      };
      
      await axios.post("/inventory/stock-entries", payload);
      
      toastUtils.success(`Stock Entry ${isDraft ? 'Saved' : 'Created'} Successfully`);
      if (onEntryCreated) onEntryCreated();
      onClose();
    } catch (error) {
      console.error("Error creating stock entry:", error);
      toastUtils.error("Failed to create stock entry");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex justify-center items-start sm:items-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded  w-full max-w-5xl my-auto border border-white/20 animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-indigo-600/5 to-transparent flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <Package size={15} />
            </div>
            <div>
              <h2 className="text-xl  text-slate-900 dark:text-white">
                Create Stock Entry
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                Record material receipts and issues with project context
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {/* Section 1: Transaction Metadata */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
            <div className="space-y-2 lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-2">
                  <label className="text-xs  text-slate-400   ml-1">Reference GRN (Optional)</label>
                  <div className="relative">
                    <ClipboardList className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <select 
                      name="grn_id"
                      value={formData.grn_id}
                      onChange={handleInputChange}
                      className="w-full pl-12 pr-4 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded focus:ring-2 focus:ring-indigo-500 outline-none transition-all  text-xs"
                    >
                      <option value="">Manual Entry</option>
                      {grns.map(grn => (
                        <option key={grn.id} value={grn.id}>{grn.grn_number} - {grn.vendor_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs  text-slate-400   ml-1">Entry Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input 
                      type="date"
                      name="entry_date"
                      value={formData.entry_date}
                      onChange={handleInputChange}
                      className="w-full pl-12 pr-4 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded focus:ring-2 focus:ring-indigo-500 outline-none transition-all  text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs  text-slate-400   ml-1">Project Allocation</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input 
                      type="text"
                      name="project_name"
                      placeholder="e.g. Project-2024-X"
                      value={formData.project_name}
                      onChange={handleInputChange}
                      className="w-full pl-12 pr-4 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded focus:ring-2 focus:ring-indigo-500 outline-none transition-all  text-xs "
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs  text-slate-400   ml-1">Supplier / Vendor</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input 
                      type="text"
                      name="vendor_name"
                      placeholder="Supplier Name"
                      value={formData.vendor_name}
                      onChange={handleInputChange}
                      className="w-full pl-12 pr-4 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded focus:ring-2 focus:ring-indigo-500 outline-none transition-all  text-xs "
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded border border-indigo-100 dark:border-indigo-800/50 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="text-indigo-600" size={15} />
                <h4 className="text-xs  text-indigo-900 dark:text-indigo-300  ">Entry Type</h4>
              </div>
              <div className="space-y-2">
                {["Material Receipt", "Material Issue", "Stock Adjustment"].map((type) => (
                  <label key={type} className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-all ${
                    formData.entry_type === type 
                      ? 'bg-white border-indigo-500  ring-1 ring-indigo-500' 
                      : 'bg-indigo-100/30 border-transparent hover:border-indigo-200'
                  }`}>
                    <span className="text-xs    text-indigo-900 dark:text-indigo-300">{type}</span>
                    <input 
                      type="radio" 
                      name="entry_type" 
                      value={type}
                      checked={formData.entry_type === type}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

         

          {/* Section 2: Material Selection */}
          <div className="">
            <h3 className="text-xs  text-slate-400  flex items-center gap-2">
              <LayoutGrid size={14} /> Line Items Selection
            </h3>

            <div className="bg-slate-50/50 dark:bg-slate-900/30 p-2 rounded border border-slate-100 dark:border-slate-700">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 space-y-2">
                  <label className="text-xs  text-slate-400   ml-1">Select Material</label>
                  <select 
                    name="material_id"
                    value={currentItem.material_id}
                    onChange={handleCurrentItemChange}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-xs  "
                  >
                    <option value="">SEARCH MATERIAL...</option>
                    {materials.map(mat => (
                      <option key={mat.id} value={mat.id}>{mat.item_code} - {mat.item_name}</option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-2 space-y-2">
                  <label className="text-xs  text-slate-400   ml-1">Quantity</label>
                  <input 
                    type="number"
                    name="quantity"
                    value={currentItem.quantity !== undefined && currentItem.quantity !== null ? parseFloat(currentItem.quantity) : ""}
                    onChange={handleCurrentItemChange}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-xs  "
                  />
                </div>

                <div className="lg:col-span-2 space-y-2">
                  <label className="text-xs  text-slate-400   ml-1">Unit (UOM)</label>
                  <input 
                    type="text"
                    name="uom"
                    value={currentItem.uom}
                    readOnly
                    className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-transparent rounded text-xs  text-slate-500   outline-none "
                  />
                </div>

                <div className="lg:col-span-3 space-y-2">
                  <label className="text-xs  text-slate-400   ml-1">Rate (₹)</label>
                  <input 
                    type="number"
                    name="valuation_rate"
                    value={currentItem.valuation_rate}
                    onChange={handleCurrentItemChange}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-xs  "
                  />
                </div>
              </div>

              {/* Specialized Dimension Fields */}
              {currentItem.item_group && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mt-4 p-2 bg-indigo-50/30 dark:bg-indigo-900/10 rounded border border-indigo-100/50 dark:border-indigo-800/30">
                  <div className="col-span-full">
                    <p className="text-[10px]  text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Technical Specifications ({currentItem.item_group})</p>
                  </div>
                  
                  {/* Plate */}
                  {(currentItem.item_group.toLowerCase().includes("plate")) && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 ml-1">L (mm)</label>
                        <input type="number" name="length" value={currentItem.length} onChange={handleCurrentItemChange} className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 ml-1">W (mm)</label>
                        <input type="number" name="width" value={currentItem.width} onChange={handleCurrentItemChange} className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 ml-1">T (mm)</label>
                        <input type="number" name="thickness" value={currentItem.thickness} onChange={handleCurrentItemChange} className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none" />
                      </div>
                    </>
                  )}

                  {/* Round Bar */}
                  {(currentItem.item_group.toLowerCase().includes("round bar")) && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 ml-1">Dia (mm)</label>
                        <input type="number" name="diameter" value={currentItem.diameter} onChange={handleCurrentItemChange} className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 ml-1">L (mm)</label>
                        <input type="number" name="length" value={currentItem.length} onChange={handleCurrentItemChange} className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none" />
                      </div>
                    </>
                  )}

                  {/* Pipe */}
                  {(currentItem.item_group.toLowerCase().includes("pipe")) && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 ml-1">OD (mm)</label>
                        <input type="number" name="outer_diameter" value={currentItem.outer_diameter} onChange={handleCurrentItemChange} className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 ml-1">T (mm)</label>
                        <input type="number" name="thickness" value={currentItem.thickness} onChange={handleCurrentItemChange} className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 ml-1">L (mm)</label>
                        <input type="number" name="length" value={currentItem.length} onChange={handleCurrentItemChange} className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none" />
                      </div>
                    </>
                  )}

                  {/* Square Bar / Tube */}
                  {(currentItem.item_group.toLowerCase().includes("square")) && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 ml-1">Side (mm)</label>
                        <input type="number" name="side_s" value={currentItem.side_s} onChange={handleCurrentItemChange} className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none" />
                      </div>
                      {currentItem.item_group.toLowerCase().includes("tube") && (
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 ml-1">T (mm)</label>
                          <input type="number" name="thickness" value={currentItem.thickness} onChange={handleCurrentItemChange} className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none" />
                        </div>
                      )}
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 ml-1">L (mm)</label>
                        <input type="number" name="length" value={currentItem.length} onChange={handleCurrentItemChange} className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none" />
                      </div>
                    </>
                  )}

                  {/* Rectangular Bar / Tube */}
                  {(currentItem.item_group.toLowerCase().includes("rectangular") || (currentItem.item_group.toLowerCase().includes("rec") && !currentItem.item_group.toLowerCase().includes("tube"))) && !currentItem.item_group.toLowerCase().includes("tube") && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 ml-1">W (mm)</label>
                        <input type="number" name="width" value={currentItem.width} onChange={handleCurrentItemChange} className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 ml-1">H (mm)</label>
                        <input type="number" name="height" value={currentItem.height} onChange={handleCurrentItemChange} className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 ml-1">L (mm)</label>
                        <input type="number" name="length" value={currentItem.length} onChange={handleCurrentItemChange} className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none" />
                      </div>
                    </>
                  )}

                  {/* Rectangular Tube */}
                  {(currentItem.item_group.toLowerCase().includes("rectangular tube") || currentItem.item_group.toLowerCase().includes("rec tube")) && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 ml-1">W (mm)</label>
                        <input type="number" name="width" value={currentItem.width} onChange={handleCurrentItemChange} className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 ml-1">H (mm)</label>
                        <input type="number" name="height" value={currentItem.height} onChange={handleCurrentItemChange} className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 ml-1">T (mm)</label>
                        <input type="number" name="thickness" value={currentItem.thickness} onChange={handleCurrentItemChange} className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 ml-1">L (mm)</label>
                        <input type="number" name="length" value={currentItem.length} onChange={handleCurrentItemChange} className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none" />
                      </div>
                    </>
                  )}

                  {/* Channel & Beam */}
                  {(currentItem.item_group.toLowerCase().includes("channel") || currentItem.item_group.toLowerCase().includes("beam")) && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 ml-1">H (mm)</label>
                        <input type="number" name="height" value={currentItem.height} onChange={handleCurrentItemChange} className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 ml-1">W (mm)</label>
                        <input type="number" name="width" value={currentItem.width} onChange={handleCurrentItemChange} className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 ml-1">Tw (mm)</label>
                        <input type="number" name="web_thickness" value={currentItem.web_thickness} onChange={handleCurrentItemChange} className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 ml-1">Tf (mm)</label>
                        <input type="number" name="flange_thickness" value={currentItem.flange_thickness} onChange={handleCurrentItemChange} className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 ml-1">L (mm)</label>
                        <input type="number" name="length" value={currentItem.length} onChange={handleCurrentItemChange} className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none" />
                      </div>
                    </>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 ml-1">Density</label>
                    <input type="number" name="density" value={currentItem.density} onChange={handleCurrentItemChange} className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none  text-indigo-600" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                <div className="space-y-2">
                  <label className="text-xs  text-slate-400   ml-1">Unit Weight (Kg)</label>
                  <input 
                    type="number"
                    name="unit_weight"
                    step="0.0001"
                    value={currentItem.unit_weight}
                    onChange={handleCurrentItemChange}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-xs  "
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs  text-slate-400   ml-1">Total Weight (Kg)</label>
                  <input 
                    type="number"
                    name="total_weight"
                    step="0.0001"
                    value={currentItem.total_weight}
                    readOnly
                    className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-transparent rounded text-xs  text-slate-500   outline-none "
                  />
                </div>
              </div>

              <div className="flex my-5 justify-end">
                <button 
                  onClick={addItem}
                  className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded  text-xs   transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-3 active:scale-95"
                >
                  <Plus size={15} /> Add to Transaction
                </button>
              </div>
            </div>

            {/* Added Items List */}
            {formData.items.length > 0 ? (
              <div className="overflow-hidden rounded border border-slate-100 dark:border-slate-700  bg-white dark:bg-slate-900">
                <DataTable
                  data={formData.items}
                  showSearch={false}
                  columns={[
                    {
                      key: "item_identity",
                      label: "Material Identity",
                      className: "w-1/3",
                      render: (_, item) => (
                        <div className="space-y-0.5">
                          <p className="text-xs  text-indigo-600 font-mono  ">{item.item_code}</p>
                          <p className="text-xs  text-slate-500 dark:text-slate-400   line-clamp-1">{item.item_name}</p>
                          {renderDimensionsText(item)}
                        </div>
                      )
                    },
                    {
                      key: "quantity",
                      label: "Quantity",
                      className: "text-center",
                      render: (val, item) => (
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-xs  text-slate-900 dark:text-white">{val ? parseFloat(val).toString() : "0"}</span>
                          <span className="text-xs  text-slate-400">{item.uom}</span>
                        </div>
                      )
                    },
                    {
                      key: "valuation_rate",
                      label: "Unit Rate",
                      className: "text-center",
                      render: (val) => <span className="text-slate-500 text-xs">₹{parseFloat(val).toLocaleString()}</span>
                    },
                    {
                      key: "aggregate",
                      label: "Aggregate",
                      className: "text-right",
                      render: (_, item) => <span className="text-slate-900 dark:text-white text-xs">₹{(item.quantity * item.valuation_rate).toLocaleString()}</span>
                    },
                    {
                      key: "actions",
                      label: "Actions",
                      className: "text-right",
                      render: (_, item) => (
                        <button onClick={() => removeItem(item.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all">
                          <Trash2 size={15} />
                        </button>
                      )
                    }
                  ]}
                />
                <div className="bg-indigo-50/30 dark:bg-indigo-900/10 p-3 border-t border-slate-100 dark:border-slate-800 flex justify-end items-center gap-4">
                  <span className="text-xs  text-indigo-900 dark:text-indigo-400">Transaction Grand Total:</span>
                  <span className="text-lg  text-indigo-600 font-semibold">
                    ₹{formData.items.reduce((sum, item) => sum + (item.quantity * item.valuation_rate), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-5 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded border-2 border-dashed border-slate-200 dark:border-slate-700">
                <div className="flex flex-col items-center gap-4 text-slate-300">
                  <Info size={15} className="" />
                  <p className="text-xs   ">No materials added to this entry</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs  text-slate-400   ml-1">Internal Remarks & Notes</label>
            <textarea 
              name="remarks"
              value={formData.remarks}
              onChange={handleInputChange}
              placeholder="Record any details about this movement..."
              rows="3"
              className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded focus:ring-2 focus:ring-indigo-500 outline-none transition-all  text-xs"
            ></textarea>
          </div>
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row justify-between items-center gap-4 flex-shrink-0">
          <button 
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200  text-xs transition-all"
          >
            Cancel Transaction
          </button>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button 
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 rounded  text-xs hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all "
            >
              Save as Draft
            </button>
            <button 
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded  text-xs transition-all  shadow-indigo-500/25 active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? "PROCESSING..." : "Commit Entry"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateStockEntryModal;
