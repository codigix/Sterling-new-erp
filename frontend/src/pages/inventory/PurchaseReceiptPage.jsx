import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import axios from "../../utils/api";
import Swal from "sweetalert2";
import toastUtils from "../../utils/toastUtils";
import {
  Package,
  Search,
  Filter,
  Download,
  CheckCircle,
  X,
  Plus,
  Eye,
  AlertTriangle,
  Clock,
  Truck,
  Check,
  Save,
  FileText,
  Printer,
  ShieldCheck,
  LayoutGrid,
  List,
  RefreshCw,
  Calendar,
  Warehouse,
  User,
} from "lucide-react";
import taskService from "../../utils/taskService";
import CreateGRNRequestModal from "./CreateGRNRequestModal";
import DataTable from "../../components/ui/DataTable/DataTable";

const PurchaseReceiptPage = () => {
  const location = useLocation();
  const [grnData, setGrnData] = useState([]);
  const [showNewGRNModal, setShowNewGRNModal] = useState(false);
  const [approvedPOs, setApprovedPOs] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [poItems, setPoItems] = useState([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [activeTab, setActiveTab] = useState("grn_request"); // grn_request, available_stocks
  const [viewMode, setViewMode] = useState("list"); // kanban, list
  const [availableStocks, setAvailableStocks] = useState([]);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchStocks = useCallback(async () => {
    setLoadingStocks(true);
    try {
      const response = await axios.get("/inventory/materials");
      setAvailableStocks(response.data.materials || []);
    } catch (error) {
      console.error("Error fetching stocks:", error);
    } finally {
      setLoadingStocks(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "available_stocks") {
      fetchStocks();
    }
  }, [activeTab, fetchStocks]);

  const capitalize = (str) => {
    if (!str) return "Pending";
    const stringVal = String(str);
    if (!stringVal || stringVal === "undefined" || stringVal === "null") return "Pending";
    return stringVal.charAt(0).toUpperCase() + stringVal.slice(1);
  };

  const fetchGRNs = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await axios.get("/inventory/grns");
      const formattedData = response.data.map((grn) => {
        const firstItem = grn.items && grn.items.length > 0 ? grn.items[0] : {};
        const totalQty = grn.items
          ? grn.items.reduce(
              (acc, item) => acc + (Number(item.quantity) || 0),
              0
            )
          : 0;
        const totalReceived = grn.items
          ? grn.items.reduce(
              (acc, item) =>
                acc +
                (Number(
                  item.received_quantity !== undefined
                    ? item.received_quantity
                    : item.quantity
                ) || 0),
              0
            )
          : 0;

        return {
          id: grn.id,
          grnNo: `GRN-${String(grn.id).padStart(3, "0")}-${new Date(
            grn.created_at
          ).getFullYear()}`,
          poNo: grn.po_number,
          vendor: grn.vendor_name,
          expectedQty: totalQty,
          receivedQty: totalReceived,
          unit: firstItem.unit || "units",
          expectedDate: grn.created_at,
          receivedDate: grn.created_at
            ? new Date(grn.created_at).toISOString().split("T")[0]
            : null,
          inspectionStatus: grn.inspection_status || "pending",
          rawStatus: grn.qc_status,
          status: grn.qc_status,
          items: grn.items || [],
        };
      });
      setGrnData(formattedData);
    } catch (error) {
      console.error("Error fetching GRNs:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

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
    } else if (group.includes("square bar") || group.includes("sq bar") || group.includes("square tube") || group.includes("sq tube")) {
      if (val(item.side1 || item.width || item.side_s || item.s)) parts.push(`S: ${val(item.side1 || item.width || item.side_s || item.s)}`);
      if (val(item.thickness)) parts.push(`T: ${val(item.thickness)}`);
      if (val(item.length)) parts.push(`L: ${val(item.length)}`);
    } else if (group.includes("rectangular bar") || group.includes("rec bar") || group.includes("rectangular tube") || group.includes("rec tube")) {
      if (val(item.side1 || item.width)) parts.push(`W: ${val(item.side1 || item.width)}`);
      if (val(item.side2 || item.thickness || item.height || item.side_s1)) parts.push(`T: ${val(item.side2 || item.thickness || item.height || item.side_s1)}`);
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
      <div className="text-xs text-blue-600 dark:text-blue-400 ">
        Dim: {parts.join(" \u00d7 ")} mm
      </div>
    );
  };

  const handleNewGRNClickFromState = async (poNumber) => {
    try {
      const response = await axios.get(
        "/department/inventory/purchase-orders?status=approved&inventory_status=!fulfilled"
      );
      const pos = response.data.purchaseOrders || response.data || [];
      setApprovedPOs(pos);
      
      const targetPO = pos.find(p => p.po_number === poNumber);
      if (targetPO) {
        setSelectedPO(targetPO);
        const itemsResponse = await axios.get(`/department/inventory/purchase-orders/${targetPO.id}`);
        const items = itemsResponse.data.items || [];
        setPoItems(items
          .filter(item => (parseFloat(item.quantity) - parseFloat(item.received || 0)) > 0)
          .map(item => ({ 
            ...item, 
            received_quantity: parseFloat(item.quantity) - parseFloat(item.received || 0) 
          })));
        setShowNewGRNModal(true);
      }
    } catch (error) {
      console.error("Error setting PO from state:", error);
    }
  };

  useEffect(() => {
    const extractedTaskId = taskService.getTaskIdFromParams();
    if (extractedTaskId) {
      setTaskId(extractedTaskId);
    }
    fetchGRNs();

    if (location.state?.po_number) {
      handleNewGRNClickFromState(location.state.po_number);
    }
  }, [location.state, fetchGRNs]);

  const handleNewGRNClick = async () => {
    try {
      const response = await axios.get(
        "/department/inventory/purchase-orders?status=approved&inventory_status=!fulfilled"
      );
      const pos = response.data.purchaseOrders || response.data || [];
      setApprovedPOs(pos);
      setSelectedPO(null);
      setShowNewGRNModal(true);
    } catch (error) {
      console.error("Error fetching approved POs:", error);
    }
  };

  const handleViewGRN = async (grn) => {
    try {
      const response = await axios.get(`/inventory/grns/${grn.id}`);
      const data = response.data;
      
      const mappedGRN = {
        ...data,
        grnNo: grn.grnNo,
        poNo: grn.poNo,
        vendor: grn.vendor,
        expectedDate: data.created_at,
        inspectionStatus: data.inspection_status || "pending",
        status: data.qc_status,
        receivedDate: data.receipt_date || data.created_at
      };
      
      setSelectedGRN(mappedGRN);
      setShowViewModal(true);
    } catch (error) {
      console.error("Error fetching GRN details:", error);
      toastUtils.error("Failed to load GRN details");
    }
  };

  const handleProcessToQC = async (grn) => {
    try {
      const result = await Swal.fire({
        title: "Submit for QC?",
        text: "This will move the receipt to GRN Processing for quality inspection.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes, Submit",
      });

      if (result.isConfirmed) {
        await axios.patch(`/inventory/grns/${grn.id}/status`, {
          status: "qc_pending",
        });
        toastUtils.success("Receipt sent for QC inspection.");
        fetchGRNs();
      }
    } catch (error) {
      console.error("Error submitting for QC:", error);
      toastUtils.error("Failed to submit for QC");
    }
  };

  const grnColumns = [
    {
      key: "grnNo",
      label: "Receipt No.",
      sortable: true,
      render: (value, row) => (
        <div className="flex flex-col">
          <span className="text-xs font-medium text-slate-900 dark:text-white">{value}</span>
          <span className="text-[10px] text-slate-500">{row.poNo}</span>
        </div>
      )
    },
    {
      key: "vendor",
      label: "Vendor",
      sortable: true,
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
            <User size={14} />
          </div>
          <span className="text-xs text-slate-700 dark:text-slate-300">{value}</span>
        </div>
      )
    },
    {
      key: "receivedDate",
      label: "Received Date",
      sortable: true,
      align: "center",
      render: (value) => (
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
          <Calendar size={12} className="text-slate-400" />
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {value ? new Date(value).toLocaleDateString() : 'N/A'}
          </span>
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      align: "center",
      render: (value) => (
        <span
          className={`px-3 py-1 rounded text-[10px] font-medium uppercase tracking-wider ${
            value === "completed" ? "bg-green-100 text-green-700" :
            value === "pending" ? "bg-slate-100 text-slate-700" :
            value === "qc_pending" ? "bg-purple-100 text-purple-700" :
            value === "approved" ? "bg-blue-100 text-blue-700" :
            value === "rejected" ? "bg-red-100 text-red-700" :
            value === "shortage" ? "bg-amber-100 text-amber-700" :
            value === "overage" ? "bg-cyan-100 text-cyan-700" :
            "bg-slate-100 text-slate-700"
          }`}
        >
          {value.replace('_', ' ')}
        </span>
      )
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => handleViewGRN(row)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded text-[11px] font-medium hover:bg-blue-100 transition-colors"
          >
            <Eye size={14} /> View
          </button>
          <button 
            onClick={() => handlePrintGRN(row)}
            className="p-1.5 bg-slate-100 text-slate-500 rounded hover:bg-slate-200 transition-colors"
          >
            <Printer size={14} />
          </button>
        </div>
      )
    }
  ];

  const stockColumns = [
    {
      key: "itemName",
      label: "Material Name",
      sortable: true,
      render: (value, row) => (
        <div className="flex flex-col">
          <span className="text-xs font-medium text-slate-900 dark:text-white">{value}</span>
          <span className="text-[10px] text-slate-500">{row.itemCode}</span>
        </div>
      )
    },
    {
      key: "quantity",
      label: "In Stock",
      sortable: true,
      align: "center",
      render: (value, row) => (
        <span className={`text-xs font-medium ${value <= (row.reorderLevel || 0) ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
          {Number(value).toFixed(2)}
        </span>
      )
    },
    {
      key: "unit",
      label: "Unit",
      sortable: true,
      align: "center",
      render: (value) => <span className="text-xs text-slate-500">{value}</span>
    },
    {
      key: "warehouse",
      label: "Warehouse",
      sortable: true,
      align: "center",
      render: (value) => (
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
          <Warehouse size={12} className="text-slate-400" />
          <span className="text-[11px] text-slate-500">{value || "Main Store"}</span>
        </div>
      )
    }
  ];

  const stats = [
    { 
      label: "Total Receipts", 
      value: grnData.length, 
      icon: Package,
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      borderColor: "border-blue-100 dark:border-blue-800",
      description: "Total processing requests"
    },
    {
      label: "Pending QC",
      value: grnData.filter((g) => g.inspectionStatus === "pending").length,
      icon: Clock,
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
      iconColor: "text-amber-600 dark:text-amber-400",
      borderColor: "border-amber-100 dark:border-amber-800",
      description: "Awaiting initial check"
    },
    {
      label: "QC Review",
      value: grnData.filter((g) => g.inspectionStatus === "qc_review").length,
      icon: ShieldCheck,
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      iconColor: "text-purple-600 dark:text-purple-400",
      borderColor: "border-purple-100 dark:border-purple-800",
      description: "Quality check in progress"
    },
    {
      label: "Awaiting Storage",
      value: grnData.filter((g) => g.status === "pending" && g.inspectionStatus === "passed").length,
      icon: Package,
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      borderColor: "border-blue-100 dark:border-blue-800",
      description: "Pending warehouse entry"
    },
    {
      label: "Completed",
      value: grnData.filter((g) => g.status === "completed").length,
      icon: CheckCircle,
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      borderColor: "border-emerald-100 dark:border-emerald-800",
      description: "Successfully stored"
    },
    {
      label: "Rejected",
      value: grnData.filter((g) => g.inspectionStatus === "rejected" || g.inspectionStatus === "failed").length,
      icon: X,
      bgColor: "bg-red-50 dark:bg-red-900/20",
      iconColor: "text-red-600 dark:text-red-400",
      borderColor: "border-red-100 dark:border-red-800",
      description: "Failed quality criteria"
    },
  ];

  const StatCard = ({ stat, isActive }) => {
    const Icon = stat.icon;
    return (
      <div className={`relative overflow-hidden rounded border p-5 transition-all duration-300 ${isActive ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:'} ${stat.bgColor} ${stat.borderColor}`}>
        <div className="flex justify-between items-start mb-4">
          <div className={`p-2 rounded bg-white dark:bg-slate-800  ${stat.iconColor}`}>
            <Icon size={20} />
          </div>
          {isActive && (
            <div className="w-2 h-2 rounded  bg-blue-500 animate-pulse" />
          )}
        </div>
        <div>
          <p className="text-sm  text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl  text-slate-900 dark:text-white leading-none">{stat.value}</span>
          </div>
          <p className="text-xs  text-slate-500 dark:text-slate-500 mt-2  tracking-wider">{stat.description}</p>
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-10">
          <Icon size={80} />
        </div>
      </div>
    );
  };

  const handlePrintGRN = (grn) => {
    window.print();
  };

  return (
    <div className="space-y-2">
      {/* Header section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded  bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none">
            <Truck size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs  text-blue-600 dark:text-blue-400  ">Buying</span>
              <span className="text-slate-300 dark:text-slate-500">›</span>
              <span className="text-xs  text-slate-500 dark:text-slate-400  ">Procurement</span>
            </div>
            <h1 className="text-2xl  text-slate-900 dark:text-white ">
              Purchase Receipts
            </h1>
            <p className="text-sm  text-slate-500 dark:text-slate-400">
              Receive material shipments against approved purchase orders
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded ">
            <button 
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs  transition-all ${viewMode === "kanban" ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700"}`}
            >
              <LayoutGrid size={14} /> KANBAN
            </button>
            <button 
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs  transition-all ${viewMode === "list" ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700"}`}
            >
              <List size={14} /> LIST
            </button>
          </div>
          
          <button 
            onClick={fetchGRNs}
            className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-500 hover:text-blue-600 transition-all hover:"
          >
            <RefreshCw size={15} />
          </button>
          
          <button
            onClick={handleNewGRNClick}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-lg shadow-blue-200 dark:shadow-none transition-all hover:-translate-y-0.5  text-xs  tracking-wider"
          >
            <Plus size={15} />
            CREATE GRN
          </button>
        </div>
      </div>

      {/* Stats section */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat, idx) => (
          <StatCard 
            key={idx} 
            stat={stat} 
            isActive={idx === 0} 
          />
        ))}
      </div>

      {/* Tabs and Content Section */}
      <div className="bg-white dark:bg-slate-800 rounded  border border-slate-200 dark:border-slate-700 overflow-hidden ">
        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4">
          <div className="flex gap-1">
            <button 
              onClick={() => setActiveTab("grn_request")}
              className={`p-2.5 rounded-t-xl text-xs   tracking-wider transition-all border-b-2 flex items-center gap-2 ${activeTab === "grn_request" ? "border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-900/20" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              <FileText size={15} /> GRN Request
            </button>
            <button 
              onClick={() => setActiveTab("available_stocks")}
              className={`p-2.5 rounded-t-xl text-xs   tracking-wider transition-all border-b-2 flex items-center gap-2 ${activeTab === "available_stocks" ? "border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-900/20" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              <Package size={15} /> Available Stocks
            </button>
          </div>
        </div>

        <div className="p-0">
          {activeTab === "grn_request" ? (
            <DataTable
              columns={grnColumns}
              data={grnData}
              loading={loading}
              filters={[
                {
                  key: "status",
                  label: "All Status",
                  options: [
                    { label: "Completed", value: "completed" },
                    { label: "Pending", value: "pending" },
                    { label: "QC Pending", value: "qc_pending" },
                    { label: "Approved", value: "approved" },
                    { label: "Rejected", value: "rejected" },
                    { label: "Shortage", value: "shortage" },
                    { label: "Overage", value: "overage" },
                  ]
                }
              ]}
            />
          ) : (
            <DataTable
              columns={stockColumns}
              data={availableStocks}
              loading={loadingStocks}
            />
          )}
        </div>
      </div>

      <CreateGRNRequestModal 
        isOpen={showNewGRNModal}
        onClose={() => setShowNewGRNModal(false)}
        po={selectedPO}
        onGRNCreated={fetchGRNs}
      />

      {showViewModal && selectedGRN && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded  shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
              <h2 className="text-xl  text-slate-900 dark:text-white flex items-center gap-2">
                GRN Details - {selectedGRN.grnNo}
              </h2>
              <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-2">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-4 rounded border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded flex items-center justify-center ${selectedGRN.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                    {selectedGRN.status === 'completed' ? <CheckCircle size={15} /> : <Clock size={15} />}
                  </div>
                  <div>
                    <p className="text-xs  text-slate-400   mb-1">Status</p>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded  text-xs    ${selectedGRN.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {selectedGRN.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-4 rounded border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                  <div className="w-12 h-12 rounded bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Calendar size={15} />
                  </div>
                  <div>
                    <p className="text-xs  text-slate-400   mb-1">Receipt Date</p>
                    <p className="text-sm  text-slate-900 dark:text-white">
                      {selectedGRN.receivedDate ? new Date(selectedGRN.receivedDate).toLocaleDateString() : new Date().toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded border border-slate-100 dark:border-slate-700 space-y-2">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Truck size={14} />
                    <span className="text-xs   ">PO Reference</span>
                  </div>
                  <p className="text-sm  text-slate-900 dark:text-white flex items-center gap-2">
                    <LayoutGrid size={14} className="text-blue-500" />
                    {selectedGRN.poNo}
                  </p>
                </div>
                <div className="p-4 rounded border border-slate-100 dark:border-slate-700 space-y-2">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <User size={14} />
                    <span className="text-xs   ">Supplier</span>
                  </div>
                  <p className="text-sm  text-slate-900 dark:text-white flex items-center gap-2">
                    <Warehouse size={14} className="text-blue-500" />
                    {selectedGRN.vendor}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <Package size={15} className="text-blue-600" />
                  <h3 className="text-sm   tracking-wider">Received Items</h3>
                </div>
                <div className="border border-slate-100 dark:border-slate-800 rounded overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                      <tr>
                        <th className="p-2 text-xs  text-slate-400  ">Item</th>
                        <th className="p-2 text-xs  text-slate-400   text-center">Received Qty</th>
                        <th className="p-2 text-xs  text-slate-400   text-center">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {(selectedGRN.items || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <h4 className="text-xs  text-slate-900 dark:text-white  ">
                                {item.material_name || item.description || "N/A"}
                              </h4>
                              {renderDimensionsText(item)}
                              <p className="text-xs  text-slate-500  tracking-wider">
                                {item.material_code || item.item_code || "N/A"}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="text-xs font-semibold text-blue-600">
                              {Number(item.received_qty || item.received_quantity || item.quantity).toFixed(4)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="text-xs  text-slate-500  ">
                              {item.unit || 'Units'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex items-center justify-between gap-4">
              <button 
                onClick={() => handlePrintGRN(selectedGRN)}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded  text-xs  tracking-wider  transition-all active:scale-95"
              >
                <Printer size={15} /> Print GRN
              </button>
              <button 
                onClick={() => setShowViewModal(false)}
                className="px-6 py-2.5 bg-slate-900 dark:bg-slate-700 text-white rounded  text-xs  tracking-wider hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseReceiptPage;
