import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "../../utils/api";
import { toast } from "react-toastify";
import { 
  X, 
  Plus, 
  Trash2, 
  Truck, 
  Calendar, 
  Package, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Calculator,
  ArrowUpRight,
  Clipboard,
  Building2,
  Clock,
  User,
  Phone,
  Hash
} from "lucide-react";
import SearchableSelect from "../ui/SearchableSelect";
import DataTable from "../ui/DataTable/DataTable";

const CreateOutwardChallanModal = ({ isOpen, onClose, assignment, vendors }) => {
  const [loading, setLoading] = useState(false);
  const [fetchingMaterials, setFetchingMaterials] = useState(false);
  const [releasedMaterials, setReleasedMaterials] = useState([]);
  const [itemOptions, setItemOptions] = useState([]);

  const [formData, setFormData] = useState({
    challan_no: `OC-${Date.now().toString().slice(-6)}`,
    challan_date: new Date().toISOString().split('T')[0],
    vendor_id: "",
    vendor_name: "",
    operation_name: "",
    remarks: "",
    items: []
  });

  // Pre-fill data when modal opens or assignment changes
  useEffect(() => {
    if (isOpen && assignment) {
      setFormData(prev => ({
        ...prev,
        operation_name: assignment.operation_name || "",
        vendor_name: assignment.vendor_name || "",
        // Try to find vendor ID if vendor_name exists
        vendor_id: vendors.find(v => v.label === assignment.vendor_name || v.value === assignment.vendor_name)?.id || ""
      }));
      fetchReleasedMaterials(assignment.projectName);
    }
  }, [isOpen, assignment, vendors]);

  const fetchReleasedMaterials = async (projectName) => {
    if (!projectName) return;
    try {
      setFetchingMaterials(true);
      const response = await axios.get(`/inventory/stock-entries?type=Material Issue`);
      const movements = response.data.movements || [];

      // Filter by project name accurately
      const projectMaterials = movements.filter(m =>
        m.project_name && m.project_name.toLowerCase().trim() === projectName.toLowerCase().trim()
      );

      // Flatten items from all movements
      const allItems = projectMaterials.flatMap(m => (m.items || []).map(item => ({
        ...item,
        entry_no: m.entry_no,
        entry_date: m.entry_date
      })));

      setReleasedMaterials(allItems);

      // Format options for item selection
      const options = allItems.map((item, idx) => ({
        value: `${item.item_code}-${idx}`,
        label: `${item.item_name} (${item.item_code})`,
        subLabel: `From: ${item.entry_no} | Available: ${item.quantity} ${item.uom}`,
        originalItem: item
      }));
      setItemOptions(options);

    } catch (error) {
      console.error("Error fetching released materials:", error);
      toast.error("Failed to fetch project materials");
    } finally {
      setFetchingMaterials(false);
    }
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: Date.now(),
          item_code: "",
          item_name: "",
          batch_no: "",
          available_qty: 0,
          dispatch_qty: 0,
          uom: ""
        }
      ]
    }));
  };

  const handleRemoveItem = (id) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const handleItemChange = (id, field, value) => {
    setFormData(prev => {
      const newItems = prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          
          // If item_code (selection) changed, pre-fill other fields
          if (field === "item_code") {
            const selectedOption = itemOptions.find(opt => opt.value === value);
            if (selectedOption) {
              const original = selectedOption.originalItem;
              updatedItem.item_name = original.item_name;
              updatedItem.item_code = original.item_code;
              updatedItem.uom = original.uom;
              updatedItem.available_qty = original.quantity;
              updatedItem.batch_no = original.serials?.[0]?.serial_number || original.entry_no;
              updatedItem.dispatch_qty = original.quantity; // Default to full
            }
          }
          return updatedItem;
        }
        return item;
      });
      return { ...prev, items: newItems };
    });
  };

  const totalDispatchQty = useMemo(() => {
    return formData.items.reduce((sum, item) => sum + (parseFloat(item.dispatch_qty) || 0), 0);
  }, [formData.items]);

  const handleSubmit = async (isDraft = false) => {
    if (!formData.vendor_id && !formData.vendor_name) {
      toast.error("Please select a vendor");
      return;
    }
    if (formData.items.length === 0) {
      toast.error("Please add at least one item to dispatch");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        status: isDraft ? "DRAFT" : "SUBMITTED",
        assignment_id: assignment?.id,
        plan_id: assignment?.plan_id,
        root_card_id: assignment?.root_card_id
      };

      const response = await axios.post("/production/outward-challans", payload);
      if (response.data.success) {
        toast.success(`Outward Challan ${isDraft ? "saved as draft" : "submitted"} successfully!`);
        onClose();
      }
    } catch (error) {
      console.error("Error creating outward challan:", error);
      toast.error(error.response?.data?.message || "Failed to create outward challan");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const itemColumns = [
    {
      key: "item_code",
      label: "Item Details",
      render: (value, item) => (
        <div className="w-64">
          <SearchableSelect
            options={itemOptions}
            value={itemOptions.find(opt => opt.originalItem.item_code === item.item_code)?.value}
            onChange={(val) => handleItemChange(item.id, "item_code", val)}
            placeholder="Select Item..."
          />
        </div>
      )
    },
    {
      key: "batch_no",
      label: "Batch / ST#",
      render: (value, item) => (
        <input
          type="text"
          className="w-24 p-1.5 border border-slate-200 dark:border-slate-700 rounded text-xs bg-transparent"
          value={value}
          onChange={(e) => handleItemChange(item.id, "batch_no", e.target.value)}
        />
      )
    },
    {
      key: "available_qty",
      label: "Avail. Qty",
      align: "center",
      render: (value, item) => (
        <span className="text-xs font-medium text-slate-500">{value} {item.uom}</span>
      )
    },
    {
      key: "dispatch_qty",
      label: "Dispatch Qty",
      render: (value, item) => (
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="w-20 p-1.5 border border-slate-200 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-900"
            value={value}
            onChange={(e) => handleItemChange(item.id, "dispatch_qty", e.target.value)}
          />
          <span className="text-[10px] text-slate-400">{item.uom}</span>
        </div>
      )
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (value, item) => (
        <button 
          onClick={() => handleRemoveItem(item.id)}
          className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      )
    }
  ];

  const validations = [
    { label: "Vendor is selected", passed: !!formData.vendor_name },
    { label: "Operation is selected", passed: !!formData.operation_name },
    { label: "At least one item added", passed: formData.items.length > 0 },
    { label: "Dispatch quantity is valid", passed: formData.items.length > 0 && formData.items.every(i => i.dispatch_qty > 0 && i.dispatch_qty <= i.available_qty) }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
      <div className="bg-slate-50 dark:bg-slate-950 w-full max-w-[1200px] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>Manufacturing</span>
              <ArrowUpRight size={12} />
              <span>Outward Challan</span>
              <ArrowUpRight size={12} />
              <span className="text-indigo-600 font-medium">Create</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              Create Outward Challan
              <span className="text-xs font-normal bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 px-2 py-1 rounded">
                DRAFT
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">Dispatch materials to vendor for subcontracting / outsourcing operation</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Main Form Sections */}
            <div className="lg:col-span-9 space-y-6">
              
              {/* 1. Challan Details */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold">1</div>
                  <h3 className="font-semibold text-slate-800 dark:text-white">Challan Details</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Challan No. *</label>
                    <input 
                      type="text" 
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                      value={formData.challan_no}
                      readOnly
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Challan Date *</label>
                    <input 
                      type="date" 
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                      value={formData.challan_date}
                      onChange={(e) => setFormData({...formData, challan_date: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Vendor *</label>
                    <SearchableSelect 
                      options={vendors}
                      value={formData.vendor_name}
                      onChange={(val) => {
                        const vendor = vendors.find(v => v.value === val);
                        setFormData({...formData, vendor_name: val, vendor_id: vendor?.id || ""});
                      }}
                      placeholder="Select Vendor..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Operation *</label>
                    <input 
                      type="text" 
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-indigo-600"
                      value={formData.operation_name}
                      readOnly
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Remarks / Instructions</label>
                    <textarea 
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm h-20 outline-none focus:border-indigo-500 transition-colors"
                      value={formData.remarks}
                      onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                      placeholder="Special instructions for the vendor..."
                    />
                  </div>
                </div>
              </div>

              {/* 2. Items to Dispatch */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold">2</div>
                    <h3 className="font-semibold text-slate-800 dark:text-white">Items to Dispatch</h3>
                  </div>
                  <button 
                    onClick={handleAddItem}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition-colors"
                  >
                    <Plus size={14} />
                    Add Item
                  </button>
                </div>

                <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                  <DataTable 
                    columns={itemColumns}
                    data={formData.items}
                    emptyMessage={fetchingMaterials ? "Fetching materials..." : "No items added to dispatch yet. Click 'Add Item' to start."}
                  />
                </div>

                <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-lg flex justify-between items-center">
                  <span className="text-xs font-medium text-emerald-700">Total Dispatch Quantity:</span>
                  <span className="text-sm font-bold text-emerald-600">{totalDispatchQty} Nos</span>
                </div>
              </div>

            </div>

            {/* Sidebar - Validations & Summary */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Validations */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                  <CheckCircle2 size={14} /> Validations
                </h4>
                <div className="space-y-3">
                  {validations.map((v, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`p-0.5 rounded-full ${v.passed ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-300"}`}>
                        <CheckCircle2 size={12} />
                      </div>
                      <span className={`text-[11px] ${v.passed ? "text-emerald-700 font-medium" : "text-slate-400"}`}>{v.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                  <Clipboard size={14} /> Summary
                </h4>
                <div className="space-y-3 border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Total Items</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formData.items.length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Total Dispatch Qty</span>
                    <span className="font-bold text-blue-600">{totalDispatchQty} Nos</span>
                  </div>
                </div>
                <div className="space-y-3 text-[11px]">
                  <div className="flex flex-col">
                    <span className="text-slate-400 uppercase text-[9px] font-bold">Vendor</span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{formData.vendor_name || "-"}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 uppercase text-[9px] font-bold">Operation</span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{formData.operation_name || "-"}</span>
                  </div>
                </div>
              </div>

              {/* Business Rules */}
              <div className="bg-amber-50 dark:bg-amber-900/10 p-5 rounded-xl border border-amber-100 dark:border-amber-900/20">
                <h4 className="text-xs font-bold text-amber-700 uppercase mb-3 flex items-center gap-2">
                  <Info size={14} /> Business Rules
                </h4>
                <ul className="text-[10px] text-amber-800/80 space-y-2 list-disc pl-4">
                  <li>Dispatch quantity must be less than or equal to available quantity.</li>
                  <li>At least one item is required for a valid challan.</li>
                  <li>Ensure the vendor details are correct before submitting.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
          <span className="text-[10px] text-rose-500 font-medium">* Mandatory Fields</span>
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="px-6 py-2 border border-indigo-600 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors"
            >
              {loading ? "Saving..." : "Save as Draft"}
            </button>
            <button 
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="px-8 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all flex items-center gap-2"
            >
              <Save size={16} />
              {loading ? "Submitting..." : "Submit Challan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateOutwardChallanModal;
