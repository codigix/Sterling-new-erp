import React, { useState, useEffect, useMemo } from "react";
import axios from "../../utils/api";
import { toast } from "react-toastify";
import { 
  X, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  ArrowUpRight,
  Building2,
  Calendar,
  Truck,
  FileText,
  Hash,
  Info
} from "lucide-react";
import SearchableSelect from "../ui/SearchableSelect";
import DataTable from "../ui/DataTable/DataTable";

const CreateOutwardChallanModal = ({ isOpen, onClose, assignment, vendors }) => {
  const [loading, setLoading] = useState(false);
  const [fetchingMaterials, setFetchingMaterials] = useState(false);
  const [itemOptions, setItemOptions] = useState([]);

  const [formData, setFormData] = useState({
    challan_no: `STS/${Date.now().toString().slice(-6)}`,
    challan_date: new Date().toISOString().split('T')[0],
    vendor_id: "",
    vendor_name: "",
    vendor_address: "",
    supply_order_no: "",
    supply_order_date: "",
    despatched_through: "",
    against_lr_rr_no: "",
    freight_type: "Paid", 
    operation_name: "",
    remarks: "",
    items: []
  });

  useEffect(() => {
    if (isOpen && assignment) {
      const vendor = vendors.find(v => v.label === assignment.vendor_name || v.value === assignment.vendor_name);
      setFormData(prev => ({
        ...prev,
        operation_name: assignment.operation_name || "",
        vendor_name: assignment.vendor_name || "",
        vendor_id: vendor?.id || "",
        vendor_address: vendor?.address || ""
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

      // Filter by project name accurately - check both project_name and project fields
      const projectMaterials = movements.filter(m => {
        const movementProject = m.project_name || m.project || "";
        return movementProject.toLowerCase().trim() === projectName.toLowerCase().trim();
      });

      const allItems = projectMaterials.flatMap(m => (m.items || []).map(item => ({
        ...item,
        entry_no: m.entry_no,
        entry_date: m.entry_date
      })));

      const options = allItems.map((item, idx) => ({
        value: `${item.item_code}-${idx}`,
        label: `${item.item_name || item.material_name} (${item.item_code})`,
        subLabel: `From: ${item.entry_no} | Available: ${item.quantity} ${item.uom} | ST#: ${item.serials?.[0]?.serial_number || 'N/A'}`,
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
          if (field === "item_code") {
            const selectedOption = itemOptions.find(opt => opt.value === value);
            if (selectedOption) {
              const original = selectedOption.originalItem;
              updatedItem.item_name = original.item_name;
              updatedItem.item_code = original.item_code;
              updatedItem.uom = original.uom;
              updatedItem.available_qty = original.quantity;
              updatedItem.batch_no = original.serials?.[0]?.serial_number || original.entry_no;
              updatedItem.dispatch_qty = original.quantity;
            } else {
              // Handle custom manual entry
              updatedItem.item_name = value;
              updatedItem.item_code = value;
              updatedItem.uom = "Nos";
              updatedItem.available_qty = 999999;
              updatedItem.dispatch_qty = 1;
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

  const handleSubmit = async (status = "SUBMITTED") => {
    if (!formData.vendor_name) {
      toast.error("Please select a vendor");
      return;
    }
    if (formData.items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        status,
        assignment_id: assignment?.id,
        plan_id: assignment?.plan_id,
        root_card_id: assignment?.root_card_id
      };

      const response = await axios.post("/production/outward-challans", payload);
      if (response.data.success) {
        toast.success(`Challan ${status === "DRAFT" ? "saved as draft" : "created"} successfully!`);
        onClose();
      }
    } catch (error) {
      console.error("Error creating challan:", error);
      toast.error(error.response?.data?.message || "Failed to create challan");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const itemColumns = [
    {
      key: "sr_no",
      label: "Sr. No",
      width: "80px",
      render: (val, row, data, index) => <span className="text-xs font-medium text-slate-500">{index + 1}</span>
    },
    {
      key: "item_code",
      label: "Item Description",
      render: (value, item) => (
        <div className="min-w-[300px]">
          <SearchableSelect
            options={itemOptions}
            value={itemOptions.find(opt => opt.originalItem.item_code === item.item_code)?.value || item.item_code}
            onChange={(val) => handleItemChange(item.id, "item_code", val)}
            placeholder="Select Item..."
            allowCustom={true}
          />
        </div>
      )
    },
    {
      key: "uom",
      label: "Unit",
      width: "100px",
      align: "center",
      render: (value) => <span className="text-xs text-slate-600 font-medium">{value || "-"}</span>
    },
    {
      key: "dispatch_qty",
      label: "Qty",
      width: "120px",
      render: (value, item) => (
        <input
          type="number"
          className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-right font-bold bg-white dark:bg-slate-900"
          value={value}
          onChange={(e) => handleItemChange(item.id, "dispatch_qty", e.target.value)}
        />
      )
    },
    {
      key: "actions",
      label: "",
      width: "50px",
      align: "right",
      render: (value, item) => (
        <button onClick={() => handleRemoveItem(item.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors bg-slate-50 dark:bg-slate-800 rounded-lg">
          <Trash2 size={14} />
        </button>
      )
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-950 w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg">
                <FileText size={20} />
              </div>
              Create Outward Process Challan
            </h2>
            <p className="text-xs text-slate-500 mt-1">Fill in the details to generate a process challan for outsourcing</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
          {/* Section 1: Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-6 md:col-span-2">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Hash size={12} /> Challan No.
                    </label>
                    <input 
                      type="text" 
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-indigo-600"
                      value={formData.challan_no}
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Calendar size={12} /> Challan Date
                    </label>
                    <input 
                      type="date" 
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                      value={formData.challan_date}
                      onChange={(e) => setFormData({...formData, challan_date: e.target.value})}
                    />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Building2 size={12} /> Vendor / Sub-contractor
                  </label>
                  <SearchableSelect 
                    options={vendors}
                    value={formData.vendor_name}
                    onChange={(val) => {
                      const vendor = vendors.find(v => v.value === val);
                      setFormData({...formData, vendor_name: val, vendor_id: vendor?.id || "", vendor_address: vendor?.address || ""});
                    }}
                    placeholder="Select Vendor..."
                  />
                  <textarea 
                    className="w-full p-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs h-20 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    placeholder="Vendor Address details..."
                    value={formData.vendor_address}
                    onChange={(e) => setFormData({...formData, vendor_address: e.target.value})}
                  />
               </div>
            </div>

            <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/20 space-y-6">
                <h3 className="text-xs font-bold text-indigo-600 uppercase flex items-center gap-2">
                  <Info size={14} /> Supply Order Info
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Supply Order No.</label>
                    <input 
                      type="text" 
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                      value={formData.supply_order_no}
                      onChange={(e) => setFormData({...formData, supply_order_no: e.target.value})}
                      placeholder="Enter order no..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Order Date</label>
                    <input 
                      type="date" 
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                      value={formData.supply_order_date}
                      onChange={(e) => setFormData({...formData, supply_order_date: e.target.value})}
                    />
                  </div>
                </div>
            </div>
          </div>

          {/* Section 2: Logistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Truck size={12} /> Despatched Through
                </label>
                <input 
                  type="text" 
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  value={formData.despatched_through}
                  onChange={(e) => setFormData({...formData, despatched_through: e.target.value})}
                  placeholder="Vehicle / Courier..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  Against L.R. / R.R. No.
                </label>
                <input 
                  type="text" 
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  value={formData.against_lr_rr_no}
                  onChange={(e) => setFormData({...formData, against_lr_rr_no: e.target.value})}
                  placeholder="Enter LR/RR no..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  Freight Type
                </label>
                <select 
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
                  value={formData.freight_type}
                  onChange={(e) => setFormData({...formData, freight_type: e.target.value})}
                >
                  <option value="Paid">Freight Paid</option>
                  <option value="To Pay">Freight To Pay</option>
                </select>
              </div>
          </div>

          {/* Section 3: Items */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                Items to Dispatch
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500">{formData.items.length} Lines</span>
              </h3>
              <button 
                onClick={handleAddItem}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
              >
                <Plus size={16} /> Add Item
              </button>
            </div>
            
            <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <DataTable 
                columns={itemColumns}
                data={formData.items}
                emptyMessage={fetchingMaterials ? "Fetching materials..." : "No items added yet. Click 'Add Item' to start."}
              />
            </div>

            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl flex justify-between items-center border border-slate-100 dark:border-slate-800">
              <span className="text-xs font-medium text-slate-500">Total Dispatch Quantity:</span>
              <span className="text-lg font-black text-slate-900 dark:text-white">{totalDispatchQty} <span className="text-xs font-normal text-slate-400 ml-1">Units</span></span>
            </div>
          </div>

          {/* Section 4: Remarks */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              Remarks / Instructions
            </label>
            <textarea 
              className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm h-24 outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={formData.remarks}
              onChange={(e) => setFormData({...formData, remarks: e.target.value})}
              placeholder="Any additional instructions for the vendor..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-4">
          <button
            onClick={() => handleSubmit("DRAFT")}
            disabled={loading}
            className="px-6 py-2.5 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-xl transition-colors"
          >
            Save as Draft
          </button>
          <button
            onClick={() => handleSubmit("SUBMITTED")}
            disabled={loading}
            className="p-2 bg-indigo-600 text-white font-bold text-sm rounded-xl shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 flex items-center gap-3 transition-all active:scale-95"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <Save size={18} />
                Create Challan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateOutwardChallanModal;
