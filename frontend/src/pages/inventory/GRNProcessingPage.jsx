import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
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
  const location = useLocation();
  const poId = searchParams.get("poId");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
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
    else if (upperName.includes("ROUND BAR") || upperName.includes("RB") || upperName.includes("Ø") || upperName.includes("DIA")) typeCode = "RB";
    else if (upperName.includes("PIPE")) typeCode = "PIPE";

    // Try 3-dimension pattern (e.g. 12000X1500X25)
    let sizeMatch = upperName.match(/(\d+)\s*[X]\s*(\d+)\s*[X]\s*(\d+)/);
    let shortSize = "SIZE";
    
    if (sizeMatch) {
      const dims = [sizeMatch[1], sizeMatch[2], sizeMatch[3]].map(d => {
        const val = parseInt(d);
        return (val >= 100 && val % 100 === 0) ? (val / 100).toString() : val.toString();
      });
      shortSize = dims.join("x");
    } else {
      // Try 2-dimension pattern (e.g. Ø80 X 3000)
      sizeMatch = upperName.match(/(?:Ø|DIA|RB|ROUND BAR)?\s*(\d+)\s*[X]\s*(\d+)/);
      if (sizeMatch) {
        const dims = [sizeMatch[1], sizeMatch[2]].map(d => {
          const val = parseInt(d);
          return (val >= 100 && val % 100 === 0) ? (val / 100).toString() : val.toString();
        });
        shortSize = dims.join("x");
      }
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
    if (loading) return;
    try {
      const hasQuantities = grnForm.items.some(item => Number(item.received_qty) > 0);
      if (!hasQuantities) {
        return showError("Please enter received quantities for at least one item.");
      }

      setLoading(true);
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
      fetchGRNs(); // Refresh the list
      navigate("/department/inventory/grn");
    } catch (error) {
      console.error("Error submitting GRN:", error);
      showError(error.response?.data?.message || "Failed to submit Goods Receipt Note");
    } finally {
      setLoading(false);
    }
  };

  const handleViewGRN = async (grn) => {
    try {
      const response = await axios.get(`/department/inventory/purchase-orders/receipts/${grn.id}`);
      setSelectedGRN(response.data);
      setShowViewModal(true);
    } catch (error) {
      console.error("Error fetching GRN details:", error);
      showError("Failed to load GRN details");
    }
  };

  const fetchGRNs = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await axios.get("/department/inventory/purchase-orders/receipts/all");
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
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const getSTPreview = (materialName) => {
    return `ST-${generateItemCode(materialName)}`;
  };

  useEffect(() => {
    const extractedTaskId = taskService.getTaskIdFromParams();
    if (extractedTaskId) setTaskId(extractedTaskId);
    fetchGRNs();
  }, [fetchGRNs, location]);

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
  const [releasingMaterial, setReleasingMaterial] = useState(null);

  const handleReleaseMaterial = async (grn) => {
    try {
      const result = await Swal.fire({
        title: "Release Material?",
        text: `Do you want to release the accepted material from ${grn.grnNo} for production?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes, Release",
        cancelButtonText: "No, Cancel",
        confirmButtonColor: "#f59e0b",
      });

      if (result.isConfirmed) {
        setReleasingMaterial(grn.id);
        await axios.post(`/department/inventory/grns/${grn.id}/release-material`);
        showSuccess("Material released for production successfully!");
        fetchGRNs();
      }
    } catch (error) {
      console.error("Error releasing material:", error);
      showError(error.response?.data?.message || "Failed to release material");
    } finally {
      setReleasingMaterial(null);
    }
  };

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
      value: grnData.filter((g) => g.status === 'awaiting_storage').length,
      icon: Warehouse,
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
      iconColor: "text-amber-600 dark:text-amber-400",
      borderColor: "border-amber-100 dark:border-amber-800",
      description: "Pending warehouse entry"
    },
    {
      label: "Ready for QC",
      value: grnData.filter((g) => g.status === 'pending').length,
      icon: Package,
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      borderColor: "border-blue-100 dark:border-blue-800",
      description: "In stock, awaiting inspection"
    },
    {
      label: "QC Completed",
      value: grnData.filter((g) => ['qc_completed', 'material_released', 'partially_released'].includes(g.status)).length,
      icon: CheckCircle,
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      borderColor: "border-emerald-100 dark:border-emerald-800",
      description: "Successfully added to stock"
    },
    {
      label: "Released",
      value: grnData.filter((g) => ['material_released', 'partially_released'].includes(g.status)).length,
      icon: ShieldCheck,
      bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
      iconColor: "text-indigo-600 dark:text-indigo-400",
      borderColor: "border-indigo-100 dark:border-indigo-800",
      description: "Released to Production"
    },
  ];

  const GRNCreationUI = () => {
    if (loadingPO) return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <RefreshCw className="animate-spin text-blue-600" size={40} />
        <p className="text-sm  text-slate-400  ">Loading PO Details...</p>
      </div>
    );

    if (!poData) return null;

    return (
      <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate('/department/inventory/purchase-orders')}
            className="flex items-center gap-2 text-xs  text-slate-500 hover:text-blue-600 transition-colors  "
          >
            <ChevronLeft size={15} /> Back to Orders
          </button>
          <div className="flex items-center gap-3">
            <span className="p-1 bg-blue-50 text-blue-600 rounded  text-xs    border border-blue-100">
              New Goods Receipt (GRN)
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800  overflow-hidden">
          <div className="p-8 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-1">
                <p className="text-xs  text-slate-400  tracking-[0.2em]">Purchase Order</p>
                <h2 className="text-xl  text-blue-600  ">{poData.po_number}</h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs  text-slate-500 ">Project:</span>
                    <span className="text-xs  text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100  ">
                        {poData.root_card_project_name || "N/A"}
                    </span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs  text-slate-400  tracking-[0.2em]">Supplier / Vendor</p>
                <h2 className="text-xl  text-slate-900 dark:text-white  ">{poData.vendor_name}</h2>
              </div>
              <div className="space-y-1">
                <p className="text-xs  text-slate-400  tracking-[0.2em]">Posting Date</p>
                <input 
                  type="date"
                  value={grnForm.posting_date}
                  onChange={(e) => setGrnForm({...grnForm, posting_date: e.target.value})}
                  className="bg-transparent border-none p-0 text-xl  text-slate-900 dark:text-white outline-none focus:ring-0 w-full"
                />
              </div>
            </div>
          </div>

          <div className="p-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-8 py-4 text-xs  text-slate-400  ">Item Name / Group</th>
                  <th className="p-2 text-xs  text-slate-400   text-center w-24">Ordered</th>
                  <th className="p-2 text-xs  text-slate-400   text-center w-20">UOM</th>
                  <th className="p-2 text-xs  text-slate-400   text-center w-32">Rate/Kg</th>
                  <th className="p-2 text-xs  text-slate-400   text-center w-32">Weight (Kg)</th>
                  <th className="p-2 text-xs  text-slate-400   text-center w-32">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {grnForm.items.map((item, idx) => (
                  <React.Fragment key={idx}>
                    <tr className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 flex-shrink-0 mt-1">
                            <Package size={20} />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm  text-slate-900 dark:text-white   line-clamp-2">{item.material_name}</p>
                            <p className="text-xs  text-slate-400  ">{item.item_group || "N/A"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-6 text-center">
                        <span className="text-sm  text-slate-500 dark:text-slate-400">{parseFloat(item.ordered_qty).toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-6 text-center">
                        <span className="text-sm  text-slate-500  ">{item.unit}</span>
                      </td>
                      <td className="px-4 py-6 text-center">
                        <span className="text-sm  text-slate-500 dark:text-slate-400">₹{parseFloat(item.rate_per_kg || 0).toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-6 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-sm  text-slate-900 dark:text-white">{parseFloat(item.received_weight || 0).toFixed(3)} Kg</span>
                          <span className="text-xs  text-slate-400 ">Target: {item.total_weight.toFixed(3)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="relative group min-w-[100px]">
                          <input 
                            type="number"
                            step="any"
                            value={item.received_qty}
                            onChange={(e) => handleItemChange(idx, 'received_qty', e.target.value)}
                            className="w-full p-2 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded text-sm  text-center text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
                <label className="text-xs  text-slate-400   flex items-center gap-2">
                  <FileText size={12} /> Remarks / Receiving Notes
                </label>
                <textarea 
                  value={grnForm.notes}
                  onChange={(e) => setGrnForm({...grnForm, notes: e.target.value})}
                  rows={2}
                  placeholder="Any discrepancies or damage reports..."
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm  focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                />
              </div>
              <button 
                onClick={handleSubmitGRN}
                disabled={loading}
                className="px-10 py-4 bg-emerald-500 text-white rounded  text-xs  tracking-[0.2em] hover:bg-emerald-600 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <RefreshCw className="animate-spin" size={15} /> : <CheckCircle size={15} />}
                {loading ? "Submitting..." : "Submit Goods Receipt"}
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
      <div className={`relative overflow-hidden rounded border p-3.5 transition-all duration-300 hover: ${stat.bgColor} ${stat.borderColor}`}>
        <div className="flex justify-between items-start mb-3">
          <div className={`p-1.5 rounded bg-white dark:bg-slate-800  ${stat.iconColor}`}>
            <Icon size={15} />
          </div>
        </div>
        <div>
          <p className="text-[11px]  text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-xl  text-slate-900 dark:text-white leading-none">{stat.value}</span>
          </div>
          <p className="text-xs  text-slate-500 dark:text-slate-500 mt-1.5  ">{stat.description}</p>
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-10">
          <Icon size={64} />
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
    <div className="space-y-2 p-4">
      {poId ? (
        <GRNCreationUI />
      ) : (
        <>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded bg-cyan-600 flex items-center justify-center text-white shadow-lg shadow-cyan-200 dark:shadow-none">
            <ShieldCheck size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs  text-cyan-600 dark:text-cyan-400  ">Inventory</span>
              <span className="text-slate-300 dark:text-slate-500">›</span>
              <span className="text-xs  text-slate-500 dark:text-slate-400  ">Stock Inward</span>
            </div>
            <h1 className="text-md  text-slate-900 dark:text-white ">
              GRN
            </h1>
            <p className="text-xs  text-slate-500 dark:text-slate-400">
              Goods Receipt Management & Material Tracking
            </p>
          </div>
        </div>
        <button onClick={fetchGRNs} className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-500 hover:text-blue-600 transition-all hover:">
          <RefreshCw size={15} />
        </button>
      </div>

      <div className="grid grid-cols-1 my-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat, idx) => (
          <StatCard key={idx} stat={stat} />
        ))}
      </div>

      <div className="">
        <div className="p-2 my-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
          <div className="flex-1 max-w-md border border-gray-300 rounded relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input 
              type="text"
              placeholder="Search GRN, PO or Supplier..."
              className="w-full pl-10 pr-4 py-2  bg-slate-50 border border-slate-100 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs  text-slate-400  ">Filter Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-100 rounded text-xs  text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">ALL REQUESTS</option>
              <option value="awaiting_storage">AWAITING STORAGE</option>
              <option value="pending">READY FOR QC</option>
              <option value="qc_pending">QC IN PROGRESS</option>
              <option value="qc_completed">QC Completed</option>
              <option value="completed">COMPLETED</option>
              <option value="shortage">SHORTAGE</option>
              <option value="overage">OVERAGE</option>
            </select>
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-slate-50 text-xs  text-slate-400  ">
            <tr>
              <th className="p-2">GRN Info</th>
              <th className="p-2">Supplier</th>
              <th className="p-2 text-center">Date</th>
              <th className="p-2 text-center">Status</th>
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredData.map((grn) => (
              <tr key={grn.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-2">
                  <span className=" text-slate-900 text-xs">{grn.grnNo}</span>
                  <p className="text-xs text-slate-500">PO: {grn.poNo}</p>
                </td>
                <td className="p-2 text-xs">{grn.vendor}</td>
                <td className="p-2 text-center text-xs">{grn.receivedDate}</td>
                <td className="p-2 text-xs text-center">
                  <span className={`p-1 rounded text-xs    ${
                    grn.status === 'awaiting_storage' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                    grn.status === 'pending' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                    grn.status === 'qc_pending' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 
                    grn.status === 'qc_finalized' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                    grn.status === 'qc_completed' ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' :
                    grn.status === 'material_released' ? 'bg-blue-100 text-blue-600 border border-blue-200' :
                    grn.status === 'partially_released' ? 'bg-amber-100 text-amber-600 border border-amber-200' :
                    'bg-slate-50 text-slate-500 border border-slate-100'
                  }`}>
                    {grn.status === 'awaiting_storage' ? 'AWAITING STORAGE' : 
                     grn.status === 'pending' ? 'READY FOR QC' :
                     grn.status === 'qc_pending' ? 'QC IN PROGRESS' :
                     grn.status === 'qc_finalized' ? 'QC FINALIZED' :
                     grn.status === 'qc_completed' ? 'QC Completed' :
                     grn.status === 'material_released' ? 'MATERIAL RELEASED' :
                     grn.status === 'partially_released' ? 'Partially Released' :
                     grn.status ? grn.status.replace('_', ' ') : 'UNKNOWN'}
                  </span>
                </td>
                <td className="p-2 text-right">
                  <div className="flex justify-end gap-2">
                    {grn.status === 'qc_completed' && (
                      <button 
                        onClick={() => handleReleaseMaterial(grn)}
                        className="flex items-center gap-1.5 p-1 bg-amber-600 text-white border border-amber-700 rounded text-xs   shadow-amber-200 hover:bg-amber-700 transition-all"
                      >
                        <Zap size={14} />
                        Release Material
                      </button>
                    )}
                    <button 
                      onClick={() => handleViewGRN(grn)}
                      className="flex items-center gap-1.5 p-1 bg-blue-50 text-blue-600 border border-blue-100 rounded text-xs  hover:bg-blue-100 transition-all"
                    >
                      <Eye size={14} />
                      Details
                    </button>
                    {grn.status === 'awaiting_storage' && (
                      <button 
                        onClick={() => handleAddToStock(grn)}
                        disabled={processingStock === grn.id}
                        className="flex items-center gap-1.5 p-1 bg-emerald-600 text-white border border-emerald-700 rounded text-xs   shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-50 transition-all"
                      >
                        {processingStock === grn.id ? <RefreshCw size={14} className="animate-spin" /> : <Package size={14} />}
                        Add to Stock
                      </button>
                    )}
                    {grn.status === 'pending' && (
                      <button 
                        onClick={() => handleSendToQuality(grn)}
                        disabled={sendingToQC === grn.id}
                        className="flex items-center gap-1.5 p-1 bg-indigo-600 text-white border border-indigo-700 rounded text-xs   shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all"
                      >
                        {sendingToQC === grn.id ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                        Send to Quality
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
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
              <div>
                <h2 className="text-md  text-slate-900 dark:text-white flex items-center gap-2">
                  GRN Details - {selectedGRN.grn?.grn_number || `GRN-${selectedGRN.grn?.id}`}
                </h2>
                <p className="text-xs  text-slate-400   mt-0.5">Comprehensive Receipt & Inspection Report</p>
              </div>
              <button onClick={() => { setShowViewModal(false); setExpandedItem(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="p-2 overflow-y-auto space-y-8">
              {/* Summary Header */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                  <div className={`p-2 rounded flex items-center justify-center ${selectedGRN.grn?.qcStatus === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                    {selectedGRN.grn?.qcStatus === 'approved' ? <CheckCircle size={15} /> : <Clock size={15} />}
                  </div>
                  <div>
                    <p className="text-xs  text-slate-400   mb-0.5">QC Status</p>
                    <span className={`px-2 py-0.5 rounded  text-xs    ${
                      selectedGRN.grn?.status === 'awaiting_storage' ? 'bg-amber-100 text-amber-700' :
                      selectedGRN.grn?.status === 'pending' ? 'bg-blue-100 text-blue-700' :
                      selectedGRN.grn?.status === 'qc_pending' ? 'bg-purple-100 text-purple-700' :
                      selectedGRN.grn?.status === 'qc_finalized' ? 'bg-indigo-100 text-indigo-700' :
                      selectedGRN.grn?.status === 'qc_completed' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {selectedGRN.grn?.status === 'awaiting_storage' ? 'AWAITING STORAGE' : 
                       selectedGRN.grn?.status === 'pending' ? 'READY FOR QC' :
                       selectedGRN.grn?.status === 'qc_pending' ? 'QC IN PROGRESS' :
                       selectedGRN.grn?.status === 'qc_finalized' ? 'QC FINALIZED' :
                       selectedGRN.grn?.status === 'qc_completed' ? 'QC Completed' :
                       selectedGRN.grn?.status?.replace('_', ' ') || 'UNKNOWN'}
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                  <div className="p-2 rounded bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Calendar size={15} />
                  </div>
                  <div>
                    <p className="text-xs  text-slate-400   mb-0.5">Received Date</p>
                    <p className="text-sm  text-slate-900 dark:text-white">
                      {new Date(selectedGRN.grn?.receivedDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                  <div className="p-2 rounded bg-purple-100 text-purple-600 flex items-center justify-center">
                    <Package size={15} />
                  </div>
                  <div>
                    <p className="text-xs  text-slate-400   mb-0.5">Net Received</p>
                    <p className="text-sm  text-slate-900 dark:text-white">
                      {selectedGRN.grn?.receivedQuantity} Units
                    </p>
                  </div>
                </div>
              </div>

              {/* Context Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-3">
                  <h3 className="text-md  text-slate-500  flex items-center gap-2">
                    <Warehouse size={12} /> Logistics Context
                  </h3>
                  <div className="p-2 rounded border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs  text-slate-500 ">PO Reference</span>
                      <span className="text-xs  text-slate-900">{selectedGRN.grn?.poNumber}</span>
                    </div>
                    {selectedGRN.grn?.project_name && (
                      <div className="flex flex-col gap-1 pt-1">
                        <span className="text-xs  text-slate-400 ">Project</span>
                        <span className="text-xs  text-blue-600  ">{selectedGRN.grn?.project_name}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-xs  text-slate-500 ">Supplier</span>
                      <span className="text-xs  text-slate-900">{selectedGRN.grn?.vendor}</span>
                    </div>
                  </div>
                </div>
                {selectedGRN.inspection && (
                  <div className="space-y-3">
                    <h3 className="text-xs  text-slate-400   flex items-center gap-2">
                      <ClipboardCheck size={12} /> Inspection Record
                    </h3>
                    <div className="p-4 rounded border border-slate-100 space-y-4 bg-slate-50/30">
                      <div className="flex justify-between items-center">
                        <span className="text-xs  text-slate-500 ">Decision</span>
                        <span className="text-xs  text-blue-600 ">{selectedGRN.inspection.status}</span>
                      </div>
                      <div>
                        <span className="text-xs  text-slate-400   block mb-1">Inspector Remarks</span>
                        <p className="text-xs  text-slate-700 italic">"{selectedGRN.inspection.remarks || 'No specific remarks provided'}"</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Itemized Discrepancy Table */}
              <div className="space-y-4">
                <h3 className="text-xs  text-slate-400   flex items-center gap-2">
                  <List size={12} /> Itemized Inspection Results
                </h3>
                <div className="border border-slate-100 rounded overflow-hidden ">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="p-2 text-xs  text-slate-400  ">Item Name / Group</th>
                        <th className="p-2 text-xs  text-slate-400   text-center">Ordered</th>
                        <th className="p-2 text-xs  text-slate-400   text-center">Accepted Qty</th>
                        <th className="p-2 text-xs  text-slate-400   text-center">Shortage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {(selectedGRN.items || []).map((item, idx) => {
                        const isQCReportReceived = selectedGRN.items && selectedGRN.items.some(item => item.inspection_report_received === 1);
                        const isReleased = ['material_released', 'partially_released'].includes(selectedGRN.grn?.status);

                        const acceptedQtyNum = item.serials && item.serials.length > 0 
                          ? item.serials.filter(st => (typeof st === 'object' && st.inspection_status === 'Accepted')).length 
                          : Number(item.received || 0);
                        
                        const rejectedQtyNum = item.serials && item.serials.length > 0 
                          ? item.serials.filter(st => (typeof st === 'object' && st.inspection_status === 'Rejected')).length 
                          : 0;
                        
                        const acceptedQtyDisplay = isQCReportReceived || isReleased ? acceptedQtyNum : (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-slate-400">0</span>
                            {selectedGRN.grn?.status === 'pending' && <span className="px-2 py-0.5 rounded text-[7px]   er bg-amber-50 text-amber-600 border border-amber-100">PENDING</span>}
                          </div>
                        );
                        
                        const shortageDisplay = isQCReportReceived || isReleased ? rejectedQtyNum : (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-slate-400">0</span>
                            {selectedGRN.grn?.status === 'pending' && <span className="px-2 py-0.5 rounded text-[7px]   er bg-amber-50 text-amber-600 border border-amber-100">PENDING</span>}
                          </div>
                        );
                        
                        const isExpanded = expandedItem === idx;

                        return (
                          <React.Fragment key={idx}>
                            <tr 
                              className={`hover:bg-slate-50/30 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/20' : ''}`}
                              onClick={() => setExpandedItem(isExpanded ? null : idx)}
                            >
                              <td className="p-2">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${isExpanded ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                                    <Package size={15} />
                                  </div>
                                  <div className="space-y-0.5">
                                    <h4 className="text-xs  text-slate-900 dark:text-white  ">{item.material_name}</h4>
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-xs  text-slate-400  ">
                                        {item.item_code ? `${item.item_code} • ` : ''}
                                        {item.item_group || 'No Group'}
                                      </span>
                                      
                                    </div>
                                    
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                        {isExpanded ? <ChevronUp size={20} className="text-blue-500" /> : <ChevronDown size={20} className="text-slate-400" />}
                                      </div>
                                </div>
                              </td>
                              <td className="p-2 text-center text-xs  text-slate-400">{item.quantity}</td>
                              <td className="p-2 text-center">
                                <span className={`px-2 py-1 rounded text-xs  ${isQCReportReceived ? 'bg-emerald-50 text-emerald-600' : ''}`}>
                                  {acceptedQtyDisplay}
                                </span>
                              </td>
                              <td className={`p-2 text-center text-xs  ${isQCReportReceived ? 'text-amber-600' : ''}`}>{shortageDisplay}</td>
                            </tr>
                            {isExpanded && item.serials && item.serials.length > 0 && (
                              <tr className="bg-slate-50/50">
                                <td colSpan="4" className="p-2">
                                  <div className="bg-white border border-slate-100 rounded  overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                      <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                          <th className="p-2 text-xs  text-slate-400   w-12 text-center">#</th>
                                          <th className="p-2 text-xs  text-slate-400  ">Item Code</th>
                                          <th className="p-2 text-xs  text-slate-400  ">Name</th>
                                          <th className="p-2 text-xs  text-indigo-400  ">ST Code</th>
                                          <th className="p-2 text-xs  text-slate-400   text-right">QC Status</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-50">
                                        {item.serials.map((stObj, sIdx) => {
                                          const stCode = typeof stObj === 'string' ? stObj : stObj.serial_number;
                                          const itemCodePerPiece = typeof stObj === 'string' ? stCode.replace('ST-', '') : (stObj.item_code || stCode.replace('ST-', ''));
                                          
                                          // Prioritize individual serial inspection status if available
                                          const status = (typeof stObj === 'object' && stObj.inspection_status) 
                                            ? stObj.inspection_status 
                                            : (!isQCReportReceived ? 'Pending' : 'Pending');
                                          
                                          return (
                                            <tr key={sIdx} className="hover:bg-slate-50 transition-colors">
                                              <td className="p-2 text-xs  text-slate-400 text-center">{sIdx + 1}</td>
                                              <td className="p-2 text-xs  text-slate-700  ">{itemCodePerPiece}</td>
                                              <td className="p-2 text-xs  text-slate-500  ">{item.material_name}</td>
                                              <td className="p-2 text-xs  text-indigo-600  ">{stCode}</td>
                                              <td className="p-2 text-right">
                                                <span className={`px-2 py-0.5 rounded text-xs   er ${
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

            <div className="p-2 flex items-center justify-end gap-4">
              {selectedGRN.grn?.status === 'awaiting_storage' && (
                <button 
                  onClick={() => handleAddToStock(selectedGRN.grn)}
                  disabled={processingStock === selectedGRN.grn.id}
                  className="flex items-center gap-1.5 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded  text-xs    transition-all active:scale-95 disabled:opacity-50"
                >
                  {processingStock === selectedGRN.grn.id ? <RefreshCw size={15} className="animate-spin" /> : <Warehouse size={15} />}
                  Add to Warehouse Stock
                </button>
              )}
              {selectedGRN.grn?.status === 'pending' && (
                <button 
                  onClick={() => handleSendToQuality(selectedGRN.grn)}
                  disabled={sendingToQC === selectedGRN.grn.id}
                  className="flex items-center gap-1.5 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded  text-xs    transition-all active:scale-95 disabled:opacity-50"
                >
                  {sendingToQC === selectedGRN.grn.id ? <RefreshCw size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                  Send to Quality
                </button>
              )}
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-1.5 p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded  text-xs    transition-all active:scale-95"
              >
                <Printer size={15} /> Print Inspection Report
              </button>
              <button 
                onClick={() => { setShowViewModal(false); setExpandedItem(null); }}
                className="p-2 bg-slate-900 text-white rounded  text-xs   hover:bg-slate-800 transition-all active:scale-95"
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
