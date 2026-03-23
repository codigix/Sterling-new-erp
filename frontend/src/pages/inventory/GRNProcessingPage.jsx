import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "../../utils/api";
import Swal from "sweetalert2";
import { showSuccess, showError } from "../../utils/toastUtils";
import {
  Package,
  Search,
  Filter,
  CheckCircle,
  X,
  Eye,
  Clock,
  ShieldCheck,
  RefreshCw,
  Calendar,
  Warehouse,
  ClipboardCheck,
  FileText,
  Save,
  List,
  Printer,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import taskService from "../../utils/taskService";

const GRNProcessingPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const poId = searchParams.get("poId");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [grnData, setGrnData] = useState([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [taskId, setTaskId] = useState(null);

  // New GRN Creation State
  const [poData, setPoData] = useState(null);
  const [loadingPO, setLoadingPO] = useState(false);
  const [grnForm, setGrnForm] = useState({
    posting_date: new Date().toISOString().split("T")[0],
    notes: "",
    items: [],
  });
  const [expandedItem, setExpandedItem] = useState(null);

  useEffect(() => {
    if (poId) {
      fetchPODetails(poId);
    }
  }, [poId]);

  const generateItemCode = (materialName) => {
    let typeCode = "GEN";
    const upperName = (materialName || "").toUpperCase();
    if (upperName.includes("PLATE")) typeCode = "PLT";
    else if (upperName.includes("ROUND BAR") || upperName.includes("RB")) typeCode = "RB";
    else if (upperName.includes("PIPE")) typeCode = "PIPE";

    const sizeMatch = (materialName || "").match(/(\d+)x(\d+)x(\d+)/);
    let shortSize = "SIZE";
    if (sizeMatch) {
      const dims = [sizeMatch[1], sizeMatch[2], sizeMatch[3]].map(d => {
        const val = parseInt(d);
        return (val >= 100 && val % 100 === 0) ? (val / 100).toString() : val.toString();
      });
      shortSize = dims.join("x");
    }
    return `${typeCode}-${shortSize}`;
  };

  const fetchPODetails = async (id) => {
    setLoadingPO(true);
    try {
      const response = await axios.get(`/department/inventory/purchase-orders/${id}`);
      setPoData(response.data);
      
      const initialItems = (response.data.items || []).map(item => {
        const matName = item.material_name || item.itemName || item.item_name || item.name || item.description;
        return {
          po_item_id: item.id,
          material_name: matName,
          item_code: generateItemCode(matName),
          item_group: item.item_group || "",
          ordered_qty: parseFloat(item.quantity) || 0,
          received_qty: parseFloat(item.quantity) || 0, // Default to full receipt
          unit: item.unit || item.uom || "Units",
          rate_per_kg: parseFloat(item.rate_per_kg) || 0,
          total_weight: parseFloat(item.total_weight) || 0,
          received_weight: parseFloat(item.total_weight) || 0,
          rate: parseFloat(item.rate) || 0,
          amount: parseFloat(item.amount) || 0,
          generate_st: true
        };
      });

      setGrnForm(prev => ({ ...prev, items: initialItems }));
    } catch (error) {
      console.error("Error fetching PO:", error);
      showError("Failed to load Purchase Order details");
    } finally {
      setLoadingPO(false);
    }
  };

  const handleItemChange = (idx, field, value) => {
    const newItems = [...grnForm.items];
    newItems[idx][field] = value;
    
    // Auto-calculate received weight if rate_per_kg or total_weight is involved
    if (field === 'received_qty' && newItems[idx].rate_per_kg > 0) {
      const perUnitWeight = newItems[idx].total_weight / newItems[idx].ordered_qty;
      newItems[idx].received_weight = parseFloat((value * perUnitWeight).toFixed(4));
    }

    setGrnForm({ ...grnForm, items: newItems });
  };

  const handleSubmitGRN = async () => {
    try {
      const hasQuantities = grnForm.items.some(item => Number(item.received_qty) > 0);
      if (!hasQuantities) {
        return showError("Please enter received quantities for at least one item.");
      }

      const payload = {
        purchase_order_id: poData.id,
        vendor_id: poData.vendor_id,
        posting_date: grnForm.posting_date,
        notes: grnForm.notes,
        items: grnForm.items.filter(item => Number(item.received_qty) > 0).map(item => ({
          ...item,
          received_qty: parseFloat(item.received_qty),
          received_weight: parseFloat(item.received_weight),
          generate_st: true
        }))
      };

      await axios.post("/department/inventory/purchase-orders/receipts", payload);
      showSuccess("Purchase Receipt created successfully with ST Numbers");
      navigate("/department/inventory/grn");
    } catch (error) {
      console.error("Error submitting GRN:", error);
      showError(error.response?.data?.message || "Failed to submit Goods Receipt Note");
    }
  };

  const handleViewGRN = async (grn) => {
    try {
      const response = await axios.get(`/department/procurement/purchase-orders/receipts/${grn.id}`);
      setSelectedGRN(response.data);
      setShowViewModal(true);
    } catch (error) {
      console.error("Error fetching GRN details:", error);
      showError("Failed to load GRN details");
    }
  };

  const fetchGRNs = useCallback(async () => {
    try {
      const response = await axios.get("/department/procurement/purchase-orders/receipts/all");
      const formattedData = response.data.map((grn) => ({
        id: grn.id,
        grnNo: grn.grn_number || `GRN-${String(grn.id).padStart(3, "0")}-${new Date(grn.created_at).getFullYear()}`,
        poNo: grn.po_number,
        vendor: grn.vendor_name,
        inspectionStatus: grn.inspection_status || "pending",
        status: grn.status || "pending",
        receivedDate: grn.created_at ? new Date(grn.created_at).toISOString().split("T")[0] : null,
        items: grn.items || [],
      }));
      setGrnData(formattedData);
    } catch (error) {
      console.error("Error fetching GRNs:", error);
    }
  }, []);

  const getSTPreview = (materialName) => {
    return `ST-${generateItemCode(materialName)}`;
  };

  useEffect(() => {
    const extractedTaskId = taskService.getTaskIdFromParams();
    if (extractedTaskId) setTaskId(extractedTaskId);
    fetchGRNs();
  }, [fetchGRNs]);

  const handleViewDetails = async (grn) => {
    try {
      const response = await axios.get(`/qc/portal/grn-details/${grn.id}`);
      setSelectedGRN(response.data);
      setShowViewModal(true);
    } catch (error) {
      console.error("Error fetching detailed GRN:", error);
      toastUtils.error("Failed to load details");
    }
  };

  const [processingStock, setProcessingStock] = useState(null);
  const [approvingGRN, setApprovingGRN] = useState(null);
  const [sendingToQC, setSendingToQC] = useState(null);

  const handleSendToQuality = async (grn) => {
    try {
      const result = await Swal.fire({
        title: "Send to Quality?",
        text: `Do you want to send ${grn.grnNo} for quality inspection?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes, Send",
        cancelButtonText: "No, Cancel",
        confirmButtonColor: "#8b5cf6",
      });

      if (result.isConfirmed) {
        setSendingToQC(grn.id);
        await axios.post(`/qc/grn/${grn.id}/send-to-qc`);
        showSuccess("GRN sent to Quality department successfully!");
        fetchGRNs();
      }
    } catch (error) {
      console.error("Error sending to QC:", error);
      showError(error.response?.data?.message || "Failed to send GRN to Quality");
    } finally {
      setSendingToQC(null);
    }
  };

  const handleApproveGRN = async (grn) => {
    try {
      const result = await Swal.fire({
        title: "Approve GRN?",
        text: `Do you want to approve ${grn.grnNo}?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes, Approve",
        cancelButtonText: "No, Cancel",
        confirmButtonColor: "#10b981",
      });

      if (result.isConfirmed) {
        setApprovingGRN(grn.id);
        await axios.post(`/department/inventory/grns/${grn.id}/approve`);
        showSuccess("GRN approved successfully!");
        fetchGRNs();
      }
    } catch (error) {
      console.error("Error approving GRN:", error);
      showError(error.response?.data?.message || "Failed to approve GRN");
    } finally {
      setApprovingGRN(null);
    }
  };

  const handleAddToStock = async (grn) => {
    try {
      if (processingStock === grn.id) return;

      const result = await Swal.fire({
        title: "Commit to Stock?",
        text: "This will add items to inventory and generate unique ST numbers for tracking.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes, add to stock",
        cancelButtonText: "Cancel",
        reverseButtons: true,
        confirmButtonColor: '#059669'
      });

      if (result.isConfirmed) {
        setProcessingStock(grn.id);

        await axios.post(`/department/inventory/grns/${grn.id}/add-to-stock`, { status: grn.status });
        if (taskId) await taskService.autoCompleteTaskByAction(taskId, "add");
        
        showSuccess("Material committed to stock. Unique ST numbers activated.");
        fetchGRNs();
      }
    } catch (error) {
      console.error("Error adding to stock:", error);
      showError(error.response?.data?.message || "Failed to process stock entry");
    } finally {
      setProcessingStock(null);
    }
  };

  const stats = [
    { 
      label: "Total GRNs", 
      value: grnData.length, 
      icon: Package,
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      borderColor: "border-blue-100 dark:border-blue-800",
      description: "Total receipts"
    },
    {
      label: "Awaiting Storage",
      value: grnData.filter((g) => ["approved", "shortage", "overage", "awaiting_storage"].includes(g.status)).length,
      icon: Warehouse,
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      borderColor: "border-emerald-100 dark:border-emerald-800",
      description: "Pending warehouse entry"
    },
    {
      label: "Completed",
      value: grnData.filter((g) => ["completed", "qc_completed"].includes(g.status)).length,
      icon: CheckCircle,
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      iconColor: "text-purple-600 dark:text-purple-400",
      borderColor: "border-purple-100 dark:border-purple-800",
      description: "Successfully added to stock"
    },
  ];

  const GRNCreationUI = () => {
    if (loadingPO) return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <RefreshCw className="animate-spin text-blue-600" size={40} />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading PO Details...</p>
      </div>
    );

    if (!poData) return null;

    return (
      <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate('/department/inventory/purchase-orders')}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-widest"
          >
            <ChevronLeft size={16} /> Back to Orders
          </button>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
              New Goods Receipt (GRN)
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Purchase Order</p>
                <h2 className="text-xl font-black text-blue-600 uppercase tracking-tight">{poData.po_number}</h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Project:</span>
                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-tight">
                        {poData.root_card_project_name || "N/A"}
                    </span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Supplier / Vendor</p>
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{poData.vendor_name}</h2>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Posting Date</p>
                <input 
                  type="date"
                  value={grnForm.posting_date}
                  onChange={(e) => setGrnForm({...grnForm, posting_date: e.target.value})}
                  className="bg-transparent border-none p-0 text-xl font-black text-slate-900 dark:text-white outline-none focus:ring-0 w-full"
                />
              </div>
            </div>
          </div>

          <div className="p-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Name / Group</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-24">Ordered</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-20">UOM</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-32">Rate/Kg</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-32">Weight (Kg)</th>
                  <th className="p-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-32">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {grnForm.items.map((item, idx) => (
                  <React.Fragment key={idx}>
                    <tr className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 flex-shrink-0 mt-1">
                            <Package size={20} />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight line-clamp-2">{item.material_name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.item_group || "N/A"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-6 text-center">
                        <span className="text-sm font-black text-slate-600 dark:text-slate-400">{parseFloat(item.ordered_qty).toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-6 text-center">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-tight">{item.unit}</span>
                      </td>
                      <td className="px-4 py-6 text-center">
                        <span className="text-sm font-black text-slate-600 dark:text-slate-400">₹{parseFloat(item.rate_per_kg || 0).toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-6 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-black text-slate-900 dark:text-white">{parseFloat(item.received_weight || 0).toFixed(3)} Kg</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Target: {item.total_weight.toFixed(3)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="relative group min-w-[100px]">
                          <input 
                            type="number"
                            step="any"
                            value={item.received_qty}
                            onChange={(e) => handleItemChange(idx, 'received_qty', e.target.value)}
                            className="w-full p-2 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-xl text-sm font-black text-center text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          />
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-8 bg-slate-50/30 dark:bg-slate-800/30 border-t border-slate-50 dark:border-slate-800">
            <div className="flex flex-col md:flex-row items-end gap-6">
              <div className="flex-1 space-y-2 w-full">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <FileText size={12} /> Remarks / Receiving Notes
                </label>
                <textarea 
                  value={grnForm.notes}
                  onChange={(e) => setGrnForm({...grnForm, notes: e.target.value})}
                  rows={2}
                  placeholder="Any discrepancies or damage reports..."
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                />
              </div>
              <button 
                onClick={handleSubmitGRN}
                className="px-10 py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-600 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-3"
              >
                <CheckCircle size={18} />
                Submit Goods Receipt
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const StatCard = ({ stat }) => {
    const Icon = stat.icon;
    return (
      <div className={`relative overflow-hidden rounded-xl border p-5 transition-all duration-300 hover:shadow-md ${stat.bgColor} ${stat.borderColor}`}>
        <div className="flex justify-between items-start mb-4">
          <div className={`p-2 rounded bg-white dark:bg-slate-800 shadow-sm ${stat.iconColor}`}>
            <Icon size={20} />
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">{stat.label}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">{stat.value}</span>
          </div>
          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-500 mt-2 uppercase tracking-wider">{stat.description}</p>
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-10">
          <Icon size={80} />
        </div>
      </div>
    );
  };

  const filteredData = grnData.filter((grn) => {
    const matchesSearch = grn.grnNo.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (grn.vendor || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (grn.poNo || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || grn.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-2">
      {poId ? (
        <GRNCreationUI />
      ) : (
        <>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-600 flex items-center justify-center text-white shadow-lg shadow-cyan-200 dark:shadow-none">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">Inventory</span>
              <span className="text-slate-300 dark:text-slate-600">›</span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Stock Inward</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              GRN
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Goods Receipt Management & Material Tracking
            </p>
          </div>
        </div>
        <button onClick={fetchGRNs} className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-blue-600 transition-all hover:shadow-md">
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <StatCard key={idx} stat={stat} />
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-2 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search GRN, PO or Supplier..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Filter Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-100 rounded text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">ALL REQUESTS</option>
              <option value="awaiting_storage">AWAITING STORAGE</option>
              <option value="pending">READY FOR QC</option>
              <option value="qc_pending">QC IN PROGRESS</option>
              <option value="qc_completed">QC COMPLETED</option>
              <option value="completed">COMPLETED</option>
              <option value="shortage">SHORTAGE</option>
              <option value="overage">OVERAGE</option>
            </select>
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="px-6 py-3">GRN Info</th>
              <th className="px-6 py-3">Supplier</th>
              <th className="px-6 py-3 text-center">Date</th>
              <th className="px-6 py-3 text-center">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredData.map((grn) => (
              <tr key={grn.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-2">
                  <span className="font-bold text-slate-900">{grn.grnNo}</span>
                  <p className="text-[10px] text-slate-500">PO: {grn.poNo}</p>
                </td>
                <td className="p-2 font-medium">{grn.vendor}</td>
                <td className="p-2 text-center text-xs">{grn.receivedDate}</td>
                <td className="p-2 text-center">
                  <span className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                    grn.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                    grn.status === 'pending_approval' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                    grn.status === 'pending' ? 'bg-slate-50 text-slate-600 border border-slate-100' :
                    grn.status === 'qc_pending' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 
                    grn.status === 'qc_completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                    grn.status === 'awaiting_storage' ? 'bg-cyan-50 text-cyan-600 border border-cyan-100' :
                    grn.status === 'shortage' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                    grn.status === 'overage' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                    'bg-cyan-50 text-cyan-600 border border-cyan-100'
                  }`}>
                    {grn.status === 'completed' ? 'COMPLETED' : 
                     grn.status === 'pending' ? 'READY FOR QC' :
                     grn.status === 'qc_pending' ? 'QC IN PROGRESS' :
                     grn.status === 'qc_completed' ? 'QC COMPLETED' :
                     grn.status === 'awaiting_storage' ? 'AWAITING STORAGE' :
                     grn.status ? grn.status.replace('_', ' ') : 'UNKNOWN'}
                  </span>
                </td>
                <td className="p-2 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => handleViewGRN(grn)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-xs font-bold hover:bg-blue-100 transition-all"
                    >
                      <Eye size={14} />
                      Details
                    </button>
                    {grn.status === 'pending' && (
                      <button 
                        onClick={() => handleSendToQuality(grn)}
                        disabled={sendingToQC === grn.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white border border-indigo-700 rounded text-xs font-bold shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all"
                      >
                        {sendingToQC === grn.id ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                        Send to Quality
                      </button>
                    )}
                    {grn.status === 'awaiting_storage' && (
                      <button 
                        onClick={() => handleAddToStock(grn)}
                        disabled={processingStock === grn.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white border border-emerald-700 rounded text-xs font-bold shadow-md shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-50 transition-all"
                      >
                        {processingStock === grn.id ? <RefreshCw size={14} className="animate-spin" /> : <Package size={14} />}
                        Add to Stock
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )}

      {/* View Details Modal with Inspection Data */}
      {showViewModal && selectedGRN && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  GRN Details - {selectedGRN.grn?.grn_number || `GRN-${selectedGRN.grn?.id}`}
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Comprehensive Receipt & Inspection Report</p>
              </div>
              <button onClick={() => { setShowViewModal(false); setExpandedItem(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-8">
              {/* Summary Header */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedGRN.grn?.qcStatus === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                    {selectedGRN.grn?.qcStatus === 'approved' ? <CheckCircle size={24} /> : <Clock size={24} />}
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">QC Status</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedGRN.grn?.qcStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {selectedGRN.grn?.qcStatus}
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Received Date</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      {new Date(selectedGRN.grn?.receivedDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                    <Package size={24} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Net Received</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      {selectedGRN.grn?.receivedQuantity} Units
                    </p>
                  </div>
                </div>
              </div>

              {/* Context Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Warehouse size={12} /> Logistics Context
                  </h3>
                  <div className="p-4 rounded-2xl border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500 uppercase">PO Reference</span>
                      <span className="text-xs font-black text-slate-900">{selectedGRN.grn?.poNumber}</span>
                    </div>
                    {selectedGRN.grn?.project_name && (
                      <div className="flex flex-col gap-1 pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Project</span>
                        <span className="text-xs font-black text-blue-600 uppercase tracking-widest">{selectedGRN.grn?.project_name}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500 uppercase">Supplier</span>
                      <span className="text-xs font-black text-slate-900">{selectedGRN.grn?.vendor}</span>
                    </div>
                  </div>
                </div>
                {selectedGRN.inspection && (
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <ClipboardCheck size={12} /> Inspection Record
                    </h3>
                    <div className="p-4 rounded-2xl border border-slate-100 space-y-4 bg-slate-50/30">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase">Decision</span>
                        <span className="text-xs font-black text-blue-600 uppercase">{selectedGRN.inspection.status}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Inspector Remarks</span>
                        <p className="text-xs font-medium text-slate-700 italic">"{selectedGRN.inspection.remarks || 'No specific remarks provided'}"</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Itemized Discrepancy Table */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <List size={12} /> Itemized Inspection Results
                </h3>
                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Item Name / Group</th>
                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Ordered</th>
                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Invoice</th>
                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Received Qty</th>
                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Shortage</th>
                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Overage</th>
                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {(selectedGRN.items || []).map((item, idx) => {
                        const shortage = Math.max(0, (Number(item.quantity) || 0) - (Number(item.received) || 0));
                        const overage = Number(item.overage) || 0;
                        const isExpanded = expandedItem === idx;

                        return (
                          <React.Fragment key={idx}>
                            <tr 
                              className={`hover:bg-slate-50/30 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/20' : ''}`}
                              onClick={() => setExpandedItem(isExpanded ? null : idx)}
                            >
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${isExpanded ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                                    <Package size={16} />
                                  </div>
                                  <div className="space-y-0.5">
                                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{item.material_name}</h4>
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                        {item.item_code ? `${item.item_code} • ` : ''}
                                        {item.item_group || 'No Group'}
                                      </span>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        {isExpanded ? <ChevronUp size={12} className="text-blue-500" /> : <ChevronDown size={12} className="text-slate-400" />}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-center text-xs font-bold text-slate-400">{item.quantity}</td>
                              <td className="px-4 py-4 text-center text-xs font-bold text-slate-900">{item.invoice_quantity || item.quantity}</td>
                              <td className="px-4 py-4 text-center">
                                <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-xs font-black">
                                  {item.received}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-center text-xs font-black text-amber-600">{shortage}</td>
                              <td className="px-4 py-4 text-center text-xs font-black text-blue-600">{overage}</td>
                              <td className="px-4 py-4 text-center">
                                {shortage > 0 ? (
                                  <span className="px-2 py-0.5 rounded text-[9px] font-black bg-red-50 text-red-600 uppercase tracking-widest">Shortage</span>
                                ) : overage > 0 ? (
                                  <span className="px-2 py-0.5 rounded text-[9px] font-black bg-amber-50 text-amber-600 uppercase tracking-widest">Overage</span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-50 text-emerald-600 uppercase tracking-widest">Verified</span>
                                )}
                              </td>
                            </tr>
                            {isExpanded && item.serials && item.serials.length > 0 && (
                              <tr className="bg-slate-50/50">
                                <td colSpan="7" className="px-12 py-4">
                                  <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                      <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                          <th className="p-2 text-[8px] font-black text-slate-400 uppercase tracking-widest w-12 text-center">#</th>
                                          <th className="p-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">Item Code</th>
                                          <th className="p-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                                          <th className="p-2 text-[8px] font-black text-indigo-400 uppercase tracking-widest">ST Code</th>
                                          <th className="p-2 text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">QC Status</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-50">
                                        {item.serials.map((stObj, sIdx) => {
                                          const stCode = typeof stObj === 'string' ? stObj : stObj.serial_number;
                                          const itemCodePerPiece = typeof stObj === 'string' ? stCode.replace('ST-', '') : (stObj.item_code || stCode.replace('ST-', ''));
                                          const status = typeof stObj === 'string' ? 'Pending' : (stObj.inspection_status || 'Pending');
                                          
                                          return (
                                            <tr key={sIdx} className="hover:bg-slate-50 transition-colors">
                                              <td className="p-2 text-[10px] font-bold text-slate-400 text-center">{sIdx + 1}</td>
                                              <td className="p-2 text-[10px] font-bold text-slate-700 uppercase tracking-tight">{itemCodePerPiece}</td>
                                              <td className="p-2 text-[10px] font-bold text-slate-600 uppercase tracking-tight">{item.material_name}</td>
                                              <td className="p-2 text-[10px] font-black text-indigo-600 uppercase tracking-tight">{stCode}</td>
                                              <td className="p-2 text-right">
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                                                  status === 'Accepted' ? 'bg-green-50 text-green-600 border border-green-100' :
                                                  status === 'Rejected' ? 'bg-red-50 text-red-600 border border-red-100' :
                                                  'bg-amber-50 text-amber-600 border border-amber-100'
                                                }`}>
                                                  {status}
                                                </span>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-2 border-t bg-slate-50 flex items-center justify-end gap-4">
              {(selectedGRN.grn?.qcStatus === 'approved' || selectedGRN.grn?.qcStatus === 'shortage' || selectedGRN.grn?.qcStatus === 'overage') && (
                <button 
                  onClick={() => handleAddToStock({ id: selectedGRN.grn.id, status: selectedGRN.grn.qcStatus })}
                  disabled={processingStock === selectedGRN.grn.id}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {processingStock === selectedGRN.grn.id ? <RefreshCw size={16} className="animate-spin" /> : <Warehouse size={16} />}
                  Add to Warehouse Stock
                </button>
              )}
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider shadow-md transition-all active:scale-95"
              >
                <Printer size={16} /> Print Inspection Report
              </button>
              <button 
                onClick={() => { setShowViewModal(false); setExpandedItem(null); }}
                className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-slate-800 transition-all active:scale-95"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GRNProcessingPage;
