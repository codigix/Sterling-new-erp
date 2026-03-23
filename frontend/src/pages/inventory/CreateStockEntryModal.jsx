import React, { useState, useEffect } from "react";
import { X, Package, Calendar, Trash2, Plus, LayoutGrid, ClipboardList, Info, Zap, ShieldCheck, User } from "lucide-react";
import axios from "../../utils/api";
import Swal from "sweetalert2";
import toastUtils from "../../utils/toastUtils";

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
    quantity: 1,
    uom: "Kg",
    batch_no: "",
    valuation_rate: 0
  });

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
          uom: selectedMat.unit || "Kg",
          valuation_rate: selectedMat.unit_cost || 0
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
      quantity: 1,
      uom: "Kg",
      batch_no: "",
      valuation_rate: 0
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-5xl shadow-2xl overflow-hidden my-8 border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
              <Package size={30} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Create Stock Entry
              </h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
                Record material receipts and issues with project context
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all group">
            <X size={24} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
          </button>
        </div>

        <div className="p-10 space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Section 1: Transaction Metadata */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-2 lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reference GRN (Optional)</label>
                  <div className="relative">
                    <ClipboardList className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select 
                      name="grn_id"
                      value={formData.grn_id}
                      onChange={handleInputChange}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm"
                    >
                      <option value="">MANUAL ENTRY</option>
                      {grns.map(grn => (
                        <option key={grn.id} value={grn.id}>{grn.grn_number} - {grn.vendor_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Entry Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="date"
                      name="entry_date"
                      value={formData.entry_date}
                      onChange={handleInputChange}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Allocation</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text"
                      name="project_name"
                      placeholder="e.g. Project-2024-X"
                      value={formData.project_name}
                      onChange={handleInputChange}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Supplier / Vendor</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text"
                      name="vendor_name"
                      placeholder="Supplier Name"
                      value={formData.vendor_name}
                      onChange={handleInputChange}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-8 rounded-3xl border border-indigo-100 dark:border-indigo-800/50 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="text-indigo-600" size={20} />
                <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-widest">Entry Type</h4>
              </div>
              <div className="space-y-3">
                {["Material Receipt", "Material Issue", "Stock Adjustment"].map((type) => (
                  <label key={type} className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                    formData.entry_type === type 
                      ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500' 
                      : 'bg-indigo-100/30 border-transparent hover:border-indigo-200'
                  }`}>
                    <span className="text-xs font-black uppercase tracking-tight text-indigo-900 dark:text-indigo-300">{type}</span>
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

          <div className="h-px bg-slate-100 dark:bg-slate-700" />

          {/* Section 2: Material Selection */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <LayoutGrid size={14} /> Line Items Selection
            </h3>

            <div className="bg-slate-50/50 dark:bg-slate-900/30 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700 space-y-2 shadow-inner">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Material</label>
                  <select 
                    name="material_id"
                    value={currentItem.material_id}
                    onChange={handleCurrentItemChange}
                    className="w-full px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold shadow-sm"
                  >
                    <option value="">SEARCH MATERIAL...</option>
                    {materials.map(mat => (
                      <option key={mat.id} value={mat.id}>{mat.item_code} - {mat.item_name}</option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-2 space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity</label>
                  <input 
                    type="number"
                    name="quantity"
                    value={currentItem.quantity}
                    onChange={handleCurrentItemChange}
                    className="w-full px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-black shadow-sm"
                  />
                </div>

                <div className="lg:col-span-2 space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit (UOM)</label>
                  <input 
                    type="text"
                    name="uom"
                    value={currentItem.uom}
                    readOnly
                    className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-700 border border-transparent rounded-2xl text-xs font-black text-slate-500 uppercase tracking-widest outline-none shadow-sm"
                  />
                </div>

                <div className="lg:col-span-3 space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Rate (₹)</label>
                  <input 
                    type="number"
                    name="valuation_rate"
                    value={currentItem.valuation_rate}
                    onChange={handleCurrentItemChange}
                    className="w-full px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-black shadow-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button 
                  onClick={addItem}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-3 active:scale-95"
                >
                  <Plus size={16} /> Add to Transaction
                </button>
              </div>
            </div>

            {/* Added Items List */}
            {formData.items.length > 0 ? (
              <div className="overflow-hidden rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-900">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
                    <tr>
                      <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Material Identity</th>
                      <th className="p-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Quantity</th>
                      <th className="p-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Unit Rate</th>
                      <th className="p-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Aggregate</th>
                      <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {formData.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-8 py-5">
                          <div className="space-y-0.5">
                            <p className="text-xs font-black text-indigo-600 font-mono tracking-tight uppercase">{item.item_code}</p>
                            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight line-clamp-1">{item.item_name}</p>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="text-sm font-black text-slate-900 dark:text-white">{item.quantity}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase ml-1.5">{item.uom}</span>
                        </td>
                        <td className="px-6 py-5 text-center font-bold text-slate-500 text-xs">₹{parseFloat(item.valuation_rate).toLocaleString()}</td>
                        <td className="px-6 py-5 text-right font-black text-slate-900 dark:text-white text-xs">₹{(item.quantity * item.valuation_rate).toLocaleString()}</td>
                        <td className="px-8 py-5 text-right">
                          <button onClick={() => removeItem(item.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-indigo-50/30 dark:bg-indigo-900/10 border-t border-slate-100 dark:border-slate-800">
                    <tr>
                      <td colSpan="3" className="px-8 py-4 text-[10px] font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest text-right">Transaction Grand Total:</td>
                      <td className="p-2 text-sm font-black text-indigo-600 text-right">
                        ₹{formData.items.reduce((sum, item) => sum + (item.quantity * item.valuation_rate), 0).toLocaleString()}
                      </td>
                      <td className="px-8 py-4"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
                <div className="flex flex-col items-center gap-4 text-slate-300">
                  <Info size={48} className="opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">No materials added to this entry</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Internal Remarks & Notes</label>
            <textarea 
              name="remarks"
              value={formData.remarks}
              onChange={handleInputChange}
              placeholder="Record any details about this movement..."
              rows="3"
              className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm"
            ></textarea>
          </div>
        </div>

        {/* Footer */}
        <div className="px-10 py-8 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
          <button 
            onClick={onClose}
            className="px-8 py-4 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-black text-[10px] uppercase tracking-widest transition-all"
          >
            Cancel Transaction
          </button>
          <div className="flex gap-4">
            <button 
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all shadow-sm"
            >
              Save as Draft
            </button>
            <button 
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
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
