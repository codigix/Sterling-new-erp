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
  return parts.length > 0 ? parts.join(" \u00d7 ") : "";
};

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
    freight_type: "", 
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

      const options = allItems.map((item, idx) => {
        const dims = getDimensionsText(item);
        return {
          value: `${item.item_code}-${idx}`,
          label: `${item.item_name || item.material_name} (${item.item_code})${dims ? ` [${dims}]` : ''}`,
          subLabel: `From: ${item.entry_no} | Available: ${parseFloat(item.quantity)} ${item.uom}`,
          originalItem: item
        };
      });
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
          rate: 0,
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
    let resolvedValue = value;
    if (field === "dispatch_qty") {
      const item = formData.items.find(i => i.id === id);
      if (item) {
        const qtyVal = parseFloat(value) || 0;
        if (qtyVal > item.available_qty) {
          toast.warning(`Quantity cannot exceed available quantity (${item.available_qty})`);
          resolvedValue = item.available_qty;
        }
      }
    }

    setFormData(prev => {
      const newItems = prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: resolvedValue };
          if (field === "item_code") {
            const selectedOption = itemOptions.find(opt => opt.value === resolvedValue);
            if (selectedOption) {
              const original = selectedOption.originalItem;
              const dims = getDimensionsText(original);
              updatedItem.item_name = dims ? `${original.item_name || original.material_name} (${dims})` : (original.item_name || original.material_name);
              updatedItem.item_code = original.item_code;
              updatedItem.uom = original.uom;
              updatedItem.available_qty = parseFloat(original.quantity);
              updatedItem.batch_no = original.serials?.[0]?.serial_number || original.entry_no;
              updatedItem.dispatch_qty = parseFloat(original.quantity);
            } else {
              // Handle custom manual entry
              updatedItem.item_name = resolvedValue;
              updatedItem.item_code = resolvedValue;
              updatedItem.uom = item.uom || "Nos";
              updatedItem.available_qty = item.available_qty || 999999;
              updatedItem.dispatch_qty = item.dispatch_qty || 1;
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
    if (!formData.challan_date) {
      toast.error("Challan date is required");
      return;
    }
    if (!formData.vendor_name) {
      toast.error("Please select a vendor");
      return;
    }
    if (!formData.vendor_address || !formData.vendor_address.trim()) {
      toast.error("Vendor address details are required");
      return;
    }
    if (formData.items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    // Validate quantities do not exceed available quantity
    for (const item of formData.items) {
      const dispatchQty = parseFloat(item.dispatch_qty) || 0;
      if (dispatchQty <= 0) {
        toast.error(`Please enter a valid quantity for ${item.item_name || item.item_code}`);
        return;
      }
      if (dispatchQty > item.available_qty) {
        toast.error(`Quantity for ${item.item_name || item.item_code} exceeds available quantity of ${item.available_qty}`);
        return;
      }
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

  const isCutting = formData.operation_name?.toLowerCase().trim() === "cutting";

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
      render: (value, item) => {
        return (
          <div className="min-w-[300px]">
            {isCutting ? (
              <div className="space-y-1">
                <SearchableSelect
                  options={itemOptions}
                  value={itemOptions.find(opt => opt.originalItem.item_code === item.item_code)?.value || item.item_code}
                  onChange={(val) => handleItemChange(item.id, "item_code", val)}
                  placeholder="Select Item..."
                  allowCustom={true}
                />
                {item.item_name && (
                  <div className="text-[10px] text-slate-500 font-semibold px-1">
                    Selected: {item.item_name}
                  </div>
                )}
              </div>
            ) : (
              <input
                type="text"
                className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900"
                value={item.item_name || item.item_code || ""}
                onChange={(e) => handleItemChange(item.id, "item_code", e.target.value)}
                placeholder="Enter Item Description..."
              />
            )}
          </div>
        );
      }
    },
    {
      key: "uom",
      label: "Unit",
      width: "100px",
      align: "center",
      render: (value, item) => {
        if (isCutting) {
          return <span className="text-xs text-slate-600 font-medium">{value || "-"}</span>;
        }
        return (
          <input
            type="text"
            className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-center bg-white dark:bg-slate-900"
            value={value || ""}
            onChange={(e) => handleItemChange(item.id, "uom", e.target.value)}
            placeholder="Nos"
          />
        );
      }
    },
    {
      key: "dispatch_qty",
      label: "Qty",
      width: "120px",
      render: (value, item) => (
        <input
          type="number"
          max={item.available_qty}
          className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-right  bg-white dark:bg-slate-900"
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
            <h2 className="text-xl  text-slate-900 dark:text-white flex items-center gap-3">
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
          
          {/* Main Challan & Order Details */}
          <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              {/* Row 1 */}
              <div className="space-y-2">
                <label className="text-[11px] text-slate-400 tracking-wider flex items-center gap-2">
                  <Hash size={12} /> Challan No.
                </label>
                <input 
                  type="text" 
                  className="w-full p-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm text-indigo-600 font-medium"
                  value={formData.challan_no}
                  readOnly
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[11px] text-slate-400 tracking-wider flex items-center gap-2">
                  <Calendar size={12} /> Challan Date <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="date" 
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm"
                  value={formData.challan_date}
                  onChange={(e) => setFormData({...formData, challan_date: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] text-slate-400 tracking-wider flex items-center gap-2">
                  <Info size={12} /> Supply Order No.
                </label>
                <input 
                  type="text" 
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={formData.supply_order_no}
                  onChange={(e) => setFormData({...formData, supply_order_no: e.target.value})}
                  placeholder="Enter order no..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] text-slate-400 tracking-wider flex items-center gap-2">
                  <Calendar size={12} /> Order Date
                </label>
                <input 
                  type="date" 
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={formData.supply_order_date}
                  onChange={(e) => setFormData({...formData, supply_order_date: e.target.value})}
                />
              </div>

              {/* Row 2 */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-[11px] text-slate-400 tracking-wider flex items-center gap-2">
                  <Building2 size={12} /> Vendor / Sub-contractor <span className="text-rose-500">*</span>
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
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[11px] text-slate-400 tracking-wider flex items-center gap-2 font-medium">
                  <Truck size={12} /> Despatched Through
                </label>
                <input 
                  type="text" 
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={formData.despatched_through}
                  onChange={(e) => setFormData({...formData, despatched_through: e.target.value})}
                  placeholder="Vehicle / Courier..."
                />
              </div>

              {/* Row 3 */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-[11px] text-slate-400 tracking-wider flex items-center gap-2">
                  <Building2 size={12} /> Vendor Address Details <span className="text-rose-500">*</span>
                </label>
                <textarea 
                  className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs h-20 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                  placeholder="Vendor Address details..."
                  value={formData.vendor_address}
                  onChange={(e) => setFormData({...formData, vendor_address: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] text-slate-400 tracking-wider">
                  Against L.R. / R.R. No. <span className="text-[10px] text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input 
                  type="text" 
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={formData.against_lr_rr_no}
                  onChange={(e) => setFormData({...formData, against_lr_rr_no: e.target.value})}
                  placeholder="Enter LR/RR no..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] text-slate-400 tracking-wider">
                  Freight Type <span className="text-[10px] text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <select 
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={formData.freight_type}
                  onChange={(e) => setFormData({...formData, freight_type: e.target.value})}
                >
                  <option value="">-</option>
                  <option value="Paid">Freight Paid</option>
                  <option value="To Pay">Freight To Pay</option>
                </select>
              </div>

            </div>
          </div>

          {/* Section 3: Items */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm  text-slate-800 dark:text-white flex items-center gap-2">
                Items to Dispatch
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500">{formData.items.length} Lines</span>
              </h3>
              <button 
                onClick={handleAddItem}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded text-xs  hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
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
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-4">
          <button
            onClick={() => handleSubmit("DRAFT")}
            disabled={loading}
            className="px-6 py-2.5 text-slate-600  text-sm hover:bg-slate-100 rounded transition-colors"
          >
            Save as Draft
          </button>
          <button
            onClick={() => handleSubmit("SUBMITTED")}
            disabled={loading}
            className="p-2 bg-indigo-600 text-white  text-sm rounded shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 flex items-center gap-3 transition-all active:scale-95"
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
