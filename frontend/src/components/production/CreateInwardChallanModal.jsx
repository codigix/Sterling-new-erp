import React, { useState, useEffect } from "react";
import axios from "../../utils/api";
import { toast } from "react-toastify";
import { 
  X, 
  Save,
  Loader2,
  FileText,
  Calendar,
  Truck,
  AlertCircle
} from "lucide-react";
import Card from "../ui/Card";

const CreateInwardChallanModal = ({ isOpen, onClose, outwardChallan, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [outwardItems, setOutwardItems] = useState([]);
  
  const [formData, setFormData] = useState({
    challan_no: "",
    challan_date: new Date().toISOString().split("T")[0],
    received_date: new Date().toISOString().split("T")[0],
    vehicle_no: "",
    remarks: "",
    items: []
  });

  useEffect(() => {
    if (isOpen && outwardChallan) {
      fetchOutwardDetails();
    }
  }, [isOpen, outwardChallan]);

  const fetchOutwardDetails = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/production/outward-challans/${outwardChallan.id}`);
      if (response.data.success) {
        const items = response.data.items || [];
        setOutwardItems(items);
        setFormData(prev => ({
          ...prev,
          items: items.map(item => ({
            item_code: item.item_code,
            item_name: item.item_name,
            batch_no: item.batch_no,
            sent_qty: item.dispatch_qty,
            received_qty: item.dispatch_qty,
            accepted_qty: item.dispatch_qty,
            rejected_qty: 0,
            uom: item.uom,
            remarks: ""
          }))
        }));
      }
    } catch (error) {
      console.error("Error fetching outward details:", error);
      toast.error("Failed to load outward challan items");
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index][field] = value;

    // Auto-calculate rejected if received and accepted are changed
    if (field === "received_qty" || field === "accepted_qty") {
      const received = parseFloat(updatedItems[index].received_qty) || 0;
      const accepted = parseFloat(updatedItems[index].accepted_qty) || 0;
      updatedItems[index].rejected_qty = Math.max(0, received - accepted);
    }

    setFormData({ ...formData, items: updatedItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.challan_no) {
      toast.error("Please enter Inward Challan Number");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        outward_challan_id: outwardChallan.id,
        vendor_id: outwardChallan.vendor_id,
        vendor_name: outwardChallan.vendor_name,
        vendor_address: outwardChallan.vendor_address,
        root_card_id: outwardChallan.root_card_id,
        status: "SUBMITTED"
      };

      const response = await axios.post("/production/inward-challans", payload);
      if (response.data.success) {
        toast.success("Inward Challan created successfully");
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error("Error creating inward challan:", error);
      toast.error(error.response?.data?.message || "Failed to create inward challan");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-950 w-full max-w-5xl rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Truck size={20} className="text-blue-600" />
              Create Inward Challan
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Against Outward Challan: <span className="font-bold text-indigo-600">{outwardChallan?.challan_no}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
              <p className="text-xs text-slate-400">Loading outward details...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Basic Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    Inward Challan No <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.challan_no}
                    onChange={(e) => setFormData({ ...formData, challan_no: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="e.g. VEND/IN/2024/001"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    Challan Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      required
                      value={formData.challan_date}
                      onChange={(e) => setFormData({ ...formData, challan_date: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    Received Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      required
                      value={formData.received_date}
                      onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Vehicle No</label>
                  <input
                    type="text"
                    value={formData.vehicle_no}
                    onChange={(e) => setFormData({ ...formData, vehicle_no: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="MH-12-AB-1234"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                      <th className="p-3 text-left text-[10px] uppercase font-bold text-slate-500 w-12">Sr.</th>
                      <th className="p-3 text-left text-[10px] uppercase font-bold text-slate-500">Item Description</th>
                      <th className="p-3 text-right text-[10px] uppercase font-bold text-slate-500 w-24">Sent</th>
                      <th className="p-3 text-right text-[10px] uppercase font-bold text-slate-500 w-28">Received</th>
                      <th className="p-3 text-right text-[10px] uppercase font-bold text-slate-500 w-28">Accepted</th>
                      <th className="p-3 text-right text-[10px] uppercase font-bold text-slate-500 w-24">Rejected</th>
                      <th className="p-3 text-left text-[10px] uppercase font-bold text-slate-500 w-40">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {formData.items.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="p-3 text-xs font-medium text-slate-400">{index + 1}</td>
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{item.item_name}</span>
                            <span className="text-[10px] text-slate-500">{item.item_code}</span>
                            {item.batch_no && <span className="text-[10px] text-indigo-600 font-medium">ST#: {item.batch_no}</span>}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <span className="text-xs font-bold text-slate-500">{parseFloat(item.sent_qty).toString()} <span className="text-[10px] font-normal uppercase">{item.uom}</span></span>
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            step="any"
                            value={parseFloat(item.received_qty).toString()}
                            onChange={(e) => handleItemChange(index, "received_qty", e.target.value)}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-right focus:border-blue-500 outline-none"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            step="any"
                            value={parseFloat(item.accepted_qty).toString()}
                            onChange={(e) => handleItemChange(index, "accepted_qty", e.target.value)}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-right focus:border-blue-500 outline-none"
                          />
                        </td>
                        <td className="p-3 text-right">
                          <span className={`text-xs font-bold ${parseFloat(item.rejected_qty) > 0 ? "text-red-500" : "text-slate-400"}`}>
                            {parseFloat(item.rejected_qty).toString()}
                          </span>
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={item.remarks}
                            onChange={(e) => handleItemChange(index, "remarks", e.target.value)}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs focus:border-blue-500 outline-none"
                            placeholder="Reason for rejection..."
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Overall Remarks */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">General Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all h-20 resize-none"
                  placeholder="Any general observations about the received material..."
                />
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || loading}
            className="px-8 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Submit Inward Challan
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateInwardChallanModal;
