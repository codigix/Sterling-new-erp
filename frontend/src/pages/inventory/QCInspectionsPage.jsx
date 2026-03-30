import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import axios from "../../utils/api";
import { getServerUrl } from "../../utils/fileUtils";
import Swal from "sweetalert2";
import { useNavigate, useLocation } from "react-router-dom";
import {
  CheckCircle,
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  AlertTriangle,
  Clock,
  User,
  FileText,
  X,
  Save,
  Layers,
  Package,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import taskService from "../../utils/taskService";
import { showSuccess, showError } from "../../utils/toastUtils";

const QCInspectionsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rootCardFilter, setRootCardFilter] = useState("all");
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskId, setTaskId] = useState(null);

  // Get unique root cards for the filter
  const uniqueRootCards = useMemo(() => {
    const cards = [];
    const seen = new Set();
    inspections.forEach(ins => {
      if (ins.rootCardId && ins.projectName && !seen.has(ins.rootCardId)) {
        seen.add(ins.rootCardId);
        cards.push({ id: ins.rootCardId, name: ins.projectName });
      }
    });
    return cards.sort((a, b) => a.name.localeCompare(b.name));
  }, [inspections]);

  // Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportSearchQuery, setReportSearchQuery] = useState("");
  const [expandedReportItems, setExpandedReportItems] = useState({});

  // Modal State
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [inspectionForm, setInspectionForm] = useState({
    items: [],
    status: "pending",
    remarks: "",
    inspectorId: null, // Should be current user
  });

  useEffect(() => {
    const extractedTaskId = taskService.getTaskIdFromParams();
    if (extractedTaskId) {
      setTaskId(extractedTaskId);
    }
    
    // Handle search parameter from notification
    const params = new URLSearchParams(window.location.search);
    const initialSearch = params.get("search");
    if (initialSearch) {
      setSearchQuery(initialSearch);
    }
    
    fetchInspections();
  }, []);

  const fetchInspections = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/qc/portal/grn-inspections");
      setInspections(response.data.grnInspections);
    } catch (error) {
      console.error("Error fetching inspections:", error);
      showError("Failed to load inspections");
    } finally {
      setLoading(false);
    }
  };

  const handleShowReport = async (inspection) => {
    try {
      setLoading(true);
      const response = await axios.get("/qc/portal/materials-for-inspection", {
        params: { rootCardId: inspection.rootCardId }
      });
      setReportData({
        ...inspection,
        materials: response.data.filter(m => Number(m.grn_id) === Number(inspection.dbId))
      });
      setExpandedReportItems({});
      setShowReportModal(true);
    } catch (error) {
      console.error("Error fetching report data:", error);
      showError("Failed to load QC report");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = async () => {
    try {
      setLoading(true);
      const payload = {
        grn_id: reportData.dbId,
        grn_number: reportData.id,
        project_name: reportData.projectName,
        vendor_name: reportData.vendor,
        inspection_type: reportData.inspectionType,
        received_date: reportData.receivedDate,
        materials: reportData.materials.map(m => ({
          material_id: m.material_id,
          material_name: m.material_name,
          item_code: m.item_code,
          item_group: m.item_group,
          received_qty: m.received_qty,
          unit: m.unit,
          accepted_qty: m.serials?.filter(s => s.inspection_status === 'Accepted').length || 0,
          rejected_qty: m.serials?.filter(s => s.inspection_status === 'Rejected').length || 0,
          accepted_report: m.common_document_path,
          rejected_report: m.rejected_document_path,
          st_numbers: m.serials?.map(s => ({
            st_code: s.serial_number,
            item_code: s.item_code,
            status: s.inspection_status?.toUpperCase()
          })) || []
        }))
      };

      await axios.post("/qc/reports/create", payload);
      showSuccess("QC Report created and saved successfully");
      setShowReportModal(false);
      fetchInspections(); // Refresh the list
      navigate("/department/quality/reports");
    } catch (error) {
      console.error("Error creating report:", error);
      showError("Failed to create QC report");
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = async (dbId, type) => {
    try {
      await axios.post(`/qc/grn/${dbId}/inspection-type`, { inspection_type: type });
      showSuccess(`Inspection type updated to ${type}`);
      fetchInspections();
    } catch (error) {
      console.error("Error updating inspection type:", error);
      showError("Failed to update inspection type");
    }
  };

  const handleInspectClick = async (grn) => {
    try {
      let items = [];
      let existingInspection = null;

      // Try to get existing inspection details first
      try {
        const inspectionRes = await axios.get(
          `/qc/portal/inspections/grn/${grn.dbId}`
        );
        existingInspection = inspectionRes.data;
      } catch {
        // No inspection yet, ignore 404
      }

      if (existingInspection) {
        // If inspection exists, use its items_results combined with GRN items if possible,
        // or just use items_results if it captures everything.
        // But items_results might not have descriptions.
        // We need GRN items for descriptions.
      }

      // Fetch GRN details using the single GRN endpoint
      const grnRes = await axios.get(`/inventory/grns/${grn.dbId}`);
      const targetGRN = grnRes.data;

      if (!targetGRN) {
        showError("GRN details not found");
        return;
      }

      items = targetGRN.items || [];

      // Prepare form data
      let formItems = items.map((item) => ({
        ...item,
        invoice_quantity: item.invoice_quantity || 0,
        accepted: Number(
          item.received_quantity !== undefined
            ? item.received_quantity
            : item.quantity
        ),
        rejected: 0,
        overage: 0,
        notes: "",
      }));

      let formStatus = "pending";
      let formRemarks = "";

      if (existingInspection) {
        formStatus = existingInspection.status;
        formRemarks = existingInspection.remarks || "";
        if (
          existingInspection.items_results &&
          Array.isArray(existingInspection.items_results)
        ) {
          // Merge results
          formItems = formItems.map((item) => {
            // find result for this item. Assuming matching by index or item code if available.
            // For now assuming index matching or we need unique ID.
            // GRN items usually have item_code or just order.
            // Let's match by description or item_code if available.
            const savedResult = existingInspection.items_results.find(
              (r) => r.description === item.description
            );
            if (savedResult) {
              // Ensure the ordered quantity always comes from the actual GRN record, not stale inspection results
              return { ...item, ...savedResult, quantity: item.quantity };
            }
            return item;
          });
        }
      }

      // Ensure UI helper fields are set
      formItems = formItems.map((item) => ({
        ...item,
        total_received_val:
          (Number(item.accepted) || 0) + (Number(item.overage) || 0),
      }));

      setSelectedGRN(grn);
      setInspectionForm({
        items: formItems,
        status: formStatus,
        remarks: formRemarks,
        inspectorId: null,
      });
      setShowInspectModal(true);
    } catch (error) {
      console.error("Error preparing inspection:", error);
      toastUtils.error("Failed to prepare inspection form");
    }
  };

  const handleQuantityChange = (index, field, value) => {
    const newItems = [...inspectionForm.items];
    newItems[index] = { ...newItems[index] }; // Clone item to avoid direct mutation

    // Allow empty string for better UX (deleting 0)
    const val = value === "" ? "" : Math.max(0, Number(value));
    const safeVal = (v) =>
      v === "" || v === undefined || v === null || isNaN(v) ? 0 : Number(v);

    const invoiceQty =
      field === "invoice_quantity"
        ? safeVal(val)
        : safeVal(newItems[index].invoice_quantity);
    const expectedQty = safeVal(newItems[index].quantity);

    if (field === "invoice_quantity") {
      newItems[index].invoice_quantity = val;
      // Re-calculate Rejected if Invoice Qty changes
      const totalReceived =
        safeVal(newItems[index].accepted) + safeVal(newItems[index].overage);
      newItems[index].rejected = Math.max(0, safeVal(val) - totalReceived);
    } else if (field === "total_received") {
      // "Received" Input Field Logic:
      newItems[index].total_received_val = val;

      const totalGood = safeVal(val);

      // 1. Calculate Accepted and Overage
      if (totalGood > expectedQty) {
        newItems[index].accepted = expectedQty;
        newItems[index].overage = totalGood - expectedQty;
      } else {
        newItems[index].accepted = totalGood;
        newItems[index].overage = 0;
      }

      // 2. Calculate Rejected
      newItems[index].rejected = Math.max(0, invoiceQty - totalGood);
    } else if (field === "overage") {
      newItems[index].overage = val;
      // Update total_received_val and rejected if overage changes
      const totalRec = safeVal(newItems[index].accepted) + safeVal(val);
      newItems[index].total_received_val = totalRec;
      newItems[index].rejected = Math.max(0, invoiceQty - totalRec);
    } else {
      newItems[index][field] = val;
    }

    // Auto-calculate Status
    const totalShortage = newItems.reduce(
      (sum, item) => sum + safeVal(item.rejected),
      0
    );
    const totalOverage = newItems.reduce(
      (sum, item) => sum + safeVal(item.overage),
      0
    );

    let newStatus = "pending";

    if (totalShortage > 0) {
      newStatus = "shortage";
    } else if (totalOverage > 0) {
      newStatus = "overage";
    } else {
      newStatus = "passed";
    }

    setInspectionForm({
      ...inspectionForm,
      items: newItems,
      status: newStatus,
    });
  };

  const handleSubmitInspection = async () => {
    try {
      // Validate
      const totalInvoice = inspectionForm.items.reduce(
        (sum, item) => sum + Number(item.invoice_quantity),
        0
      );
      const totalRecorded = inspectionForm.items.reduce(
        (sum, item) =>
          sum +
          Number(item.accepted) +
          Number(item.rejected) +
          Number(item.overage),
        0
      );

      if (totalInvoice !== totalRecorded) {
        const result = await Swal.fire({
          title: "Quantity Mismatch",
          text: `Total recorded quantity (Accepted + Rejected + Overage = ${totalRecorded}) does not match Invoice quantity (${totalInvoice}). Continue?`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Yes, save anyway",
        });
        if (!result.isConfirmed) return;
      }

      const payload = {
        grnId: selectedGRN.dbId,
        itemsResults: inspectionForm.items.map((item) => ({
          description: item.description, // Identifier
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          invoice_quantity: item.invoice_quantity,
          accepted: item.accepted,
          rejected: item.rejected,
          overage: item.overage,
          notes: item.notes,
        })),
        status: inspectionForm.status,
        remarks: inspectionForm.remarks,
        inspectorId: 1, // TODO: Get from auth context
      };

      await axios.post("/qc/portal/inspections", payload);

      if (taskId) {
        await taskService.autoCompleteTaskByAction(taskId, "save");
      }

      showSuccess("Inspection saved successfully");
      setShowInspectModal(false);
      fetchInspections();
    } catch (error) {
      console.error("Error saving inspection:", error);
      showError("Failed to save inspection");
    }
  };

  const filteredData = inspections.filter(
    (inspection) =>
      (inspection.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inspection.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inspection.vendor.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (statusFilter === "all" || inspection.qcStatus === statusFilter) &&
      (rootCardFilter === "all" || String(inspection.rootCardId) === String(rootCardFilter))
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
      case "passed":
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "overage":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "shortage":
      case "failed":
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  return (
    <div className="space-y-2 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl  text-slate-900 dark:text-white text-xs">
            QC Inspections
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Quality control inspection records and reports
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {/* <button className="flex items-center text-xs gap-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors font-medium">
            <Plus size={18} />
            New Inspection
          </button> */}
          <button className="flex items-center text-xs gap-2 p-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded transition-colors font-medium">
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3 top-3 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search inspection, GRN or vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
            />
          </div>
          <select
            value={rootCardFilter}
            onChange={(e) => setRootCardFilter(e.target.value)}
            className="p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium text-xs max-w-[200px]"
          >
            <option value="all">All Projects / Root Cards</option>
            {uniqueRootCards.map((rc) => (
              <option key={rc.id} value={rc.id}>
                {rc.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium text-xs"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="passed">Approved</option>
            <option value="shortage">Shortage</option>
            <option value="overage">Overage</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="p-2 text-left text-sm font-semibold text-slate-900 dark:text-white">
                  GRN ID
                </th>
                <th className="p-2 text-left text-sm font-semibold text-slate-900 dark:text-white">
                  Project / Root Card
                </th>
                <th className="p-2 text-left text-sm font-semibold text-slate-900 dark:text-white">
                  PO No.
                </th>
                <th className="p-2 text-left text-sm font-semibold text-slate-900 dark:text-white">
                  Vendor
                </th>
                <th className="p-2 text-left text-sm font-semibold text-slate-900 dark:text-white">
                  Status
                </th>
                <th className="p-2 text-left text-sm font-semibold text-slate-900 dark:text-white">
                  Inspection Type
                </th>
                <th className="p-2 text-center text-sm font-semibold text-slate-900 dark:text-white">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" className="p-4 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-4 text-center text-slate-500">
                    No inspections found
                  </td>
                </tr>
              ) : (
                filteredData.map((inspection) => (
                  <tr
                    key={inspection.id}
                    className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <td className="p-2 text-sm font-medium text-slate-900 text-left dark:text-white">
                      {inspection.id}
                    </td>
                    <td className="p-2 text-sm text-slate-500 dark:text-slate-400">
                      {inspection.projectName ? (
                        <Link
                          to={`/department/quality/root-cards/${inspection.rootCardId}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {inspection.projectName}
                        </Link>
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td className="p-2 text-sm text-slate-500 dark:text-slate-400">
                      {inspection.poNumber}
                    </td>
                    <td className="p-2 text-sm text-slate-500 dark:text-slate-400">
                      {inspection.vendor}
                    </td>
                    <td className="p-2 text-sm">
                      <span
                        className={`px-3 py-1 rounded  text-[10px]   tracking-widest ${getStatusColor(
                          inspection.finalReportId ? "completed" : inspection.qcStatus
                        )}`}
                      >
                        {inspection.finalReportId 
                          ? "Report Generated" 
                          : inspection.qcStatus === "completed"
                          ? "QC Completed"
                          : inspection.qcStatus === "passed" || inspection.qcStatus === "approved"
                          ? "Approved"
                          : inspection.qcStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-2 text-sm">
                      <select
                        value={inspection.inspectionType || 'Inhouse'}
                        onChange={(e) => handleTypeChange(inspection.dbId, e.target.value)}
                        className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded  text-xs outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="Inhouse">Inhouse</option>
                        <option value="Outsource">Outsource</option>
                      </select>
                    </td>
                    <td className="p-2 text-center text-sm">
                      {inspection.finalReportId ? (
                        <button
                          onClick={() => navigate("/department/quality/reports")}
                          className="px-4 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 rounded text-[10px]   tracking-widest transition-all shadow-sm flex items-center gap-2 mx-auto"
                        >
                          <Eye size={14} />
                          View Report
                        </button>
                      ) : inspection.qcStatus === 'completed' ? (
                        <button
                          onClick={() => handleShowReport(inspection)}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px]   tracking-widest transition-all shadow-sm shadow-emerald-200 flex items-center gap-2 mx-auto"
                        >
                          <FileText size={14} />
                          QC Report
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/department/quality/material-inspection?rootCardId=${inspection.rootCardId}`)}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px]   tracking-widest transition-all shadow-sm shadow-blue-200"
                        >
                          Do Inspection
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QC Report Modal */}
      {showReportModal && reportData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                  <FileText size={24} />
                </div>
                <div>
                  <h2 className="text-xl  text-slate-900 dark:text-white  ">
                    QC Inspection Report: {reportData.id}
                  </h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px]  text-slate-400  tracking-widest">
                      Project: <span className="text-slate-500 dark:text-slate-300">{reportData.projectName}</span>
                    </span>
                    <span className="w-1 h-1 rounded  bg-slate-300"></span>
                    <span className="text-[10px]  text-slate-400  tracking-widest">
                      Vendor: <span className="text-slate-500 dark:text-slate-300">{reportData.vendor}</span>
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowReportModal(false)} 
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
              >
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto space-y-8">
              {/* Materials Summary Table */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-xs  text-slate-500  tracking-[0.2em] flex items-center gap-2">
                    <Layers size={14} /> Inspected Materials Detail Tracking
                  </h3>
                  
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search Material or ST Number..."
                      value={reportSearchQuery}
                      onChange={(e) => setReportSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px]  text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 w-full sm:w-64 transition-all"
                    />
                  </div>
                </div>

                <div className="overflow-hidden border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                        <th className="p-2 text-[10px]  text-slate-400  tracking-widest">Material & ST Numbers</th>
                        <th className="px-4 py-4 text-[10px]  text-slate-400  tracking-widest text-center">Received Qty</th>
                        <th className="px-4 py-4 text-[10px]  text-slate-400  tracking-widest text-center">Summary Status</th>
                        <th className="p-2 text-[10px]  text-slate-400  tracking-widest text-right">Reports</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {reportData.materials?.filter(item => 
                        item.material_name.toLowerCase().includes(reportSearchQuery.toLowerCase()) ||
                        item.item_group.toLowerCase().includes(reportSearchQuery.toLowerCase()) ||
                        item.serials?.some(s => s.serial_number.toLowerCase().includes(reportSearchQuery.toLowerCase()))
                      ).map((item, idx) => {
                        const acceptedCount = item.serials?.filter(s => s.inspection_status === 'Accepted').length || 0;
                        const rejectedCount = item.serials?.filter(s => s.inspection_status === 'Rejected').length || 0;
                        const isExpanded = expandedReportItems[idx];
                        
                        return (
                          <React.Fragment key={idx}>
                            <tr 
                              className={`hover:bg-slate-50/30 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/10' : ''}`}
                              onClick={() => setExpandedReportItems(prev => ({ ...prev, [idx]: !prev[idx] }))}
                            >
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${isExpanded ? 'bg-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'}`}>
                                    <Package size={16} />
                                  </div>
                                  <div>
                                    <p className="text-sm  text-slate-900 dark:text-white   flex items-center gap-2">
                                      {item.material_name}
                                      {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                                    </p>
                                    <p className="text-[10px]  text-slate-400  tracking-widest">{item.item_group}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-5 text-center">
                                <span className="text-sm  text-slate-700 dark:text-slate-300">
                                  {item.received_qty} {item.unit}
                                </span>
                              </td>
                              <td className="px-4 py-5">
                                <div className="flex flex-col items-center gap-1">
                                  <div className="flex gap-2">
                                    {acceptedCount > 0 && (
                                      <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-[9px]   border border-green-100">
                                        {acceptedCount} Passed
                                      </span>
                                    )}
                                    {rejectedCount > 0 && (
                                      <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-[9px]   border border-red-100">
                                        {rejectedCount} Failed
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex flex-col items-end gap-2">
                                  {item.common_document_path && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(getServerUrl(item.common_document_path), '_blank');
                                      }}
                                      className="flex items-center gap-2 text-[9px]  text-green-600  hover:text-green-700 transition-colors"
                                    >
                                      <CheckCircle size={12} /> Accepted <Eye size={12} />
                                    </button>
                                  )}
                                  {item.rejected_document_path && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(getServerUrl(item.rejected_document_path), '_blank');
                                      }}
                                      className="flex items-center gap-2 text-[9px]  text-red-600  hover:text-red-700 transition-colors"
                                    >
                                      <AlertTriangle size={12} /> Rejected <Eye size={12} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                            
                            {isExpanded && (
                              <tr>
                                <td colSpan="4" className="px-8 py-4 bg-slate-50/50 dark:bg-slate-800/20">
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {item.serials?.map((s, sIdx) => (
                                      <div 
                                        key={sIdx}
                                        className={`p-3 rounded border flex flex-col gap-1.5 transition-all ${
                                          s.inspection_status === 'Accepted' 
                                            ? 'bg-white dark:bg-slate-900 border-green-100 dark:border-green-900/30' 
                                            : 'bg-white dark:bg-slate-900 border-red-100 dark:border-red-900/30'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="text-[8px]  text-slate-400  tracking-widest">ST Number</span>
                                          <span className={`w-2 h-2 rounded  ${s.inspection_status === 'Accepted' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                        </div>
                                        <p className="text-[10px]  text-slate-700 dark:text-slate-200  truncate" title={s.serial_number}>
                                          {s.serial_number}
                                        </p>
                                        <div className={`mt-1 px-2 py-0.5 rounded text-[8px]   er w-fit ${
                                          s.inspection_status === 'Accepted' 
                                            ? 'bg-green-50 text-green-600' 
                                            : 'bg-red-50 text-red-600'
                                        }`}>
                                          {s.inspection_status}
                                        </div>
                                      </div>
                                    ))}
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

              {/* General Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-4">
                  <h4 className="text-[10px]  text-slate-400  tracking-[0.2em] flex items-center gap-2">
                    <Search size={14} /> Inspection Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px]  text-slate-400  mb-1">Inspection Type</p>
                      <p className="text-xs  text-slate-700 dark:text-slate-200 ">{reportData.inspectionType}</p>
                    </div>
                    <div>
                      <p className="text-[9px]  text-slate-400  mb-1">Received Date</p>
                      <p className="text-xs  text-slate-700 dark:text-slate-200 ">{reportData.receivedDate}</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-2">
                  <h4 className="text-[10px]  text-slate-400  tracking-[0.2em]">Summary Status</h4>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <CheckCircle size={20} />
                    </div>
                    <div>
                      <p className="text-sm  text-slate-900 dark:text-white  ">Quality Passed</p>
                      <p className="text-[10px]  text-slate-400  tracking-widest">All criteria met for production release</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end gap-4">
              <button 
                onClick={() => setShowReportModal(false)}
                className="px-8 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 rounded text-[10px]   tracking-widest hover:bg-slate-50 transition-all shadow-sm"
              >
                Close Report
              </button>
              <button 
                onClick={handleCreateReport}
                disabled={loading}
                className="px-8 py-3 bg-emerald-600 text-white rounded text-[10px]   tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2"
              >
                <Plus size={14} /> Create Final Report
              </button>
              <button 
                onClick={() => window.print()}
                className="px-8 py-3 bg-blue-600 text-white rounded text-[10px]   tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
              >
                <Download size={14} /> Export PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Modal */}
      {showInspectModal && selectedGRN && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                QC Inspection - {selectedGRN.id}
              </h2>
              <button
                onClick={() => setShowInspectModal(false)}
                className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 dark:bg-slate-700/30 p-4 rounded border border-slate-100 dark:border-slate-700">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400  tracking-wide font-medium mb-1">
                    PO Number
                  </p>
                  <p className="font-semibold text-slate-900 dark:text-white text-lg">
                    {selectedGRN.poNumber}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400  tracking-wide font-medium mb-1">
                    Vendor
                  </p>
                  <p className="font-semibold text-slate-900 dark:text-white text-lg">
                    {selectedGRN.vendor}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <CheckCircle size={18} className="text-blue-600" />
                  Items Inspection
                </h3>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                        <th className="p-3 text-left font-semibold text-slate-900 dark:text-white">
                          Item Details
                        </th>
                        <th className="p-3 text-center font-semibold text-slate-900 dark:text-white w-24">
                          Expected
                        </th>
                        <th className="p-3 text-center font-semibold text-slate-900 dark:text-white w-32">
                          Invoice Quantity
                        </th>
                        <th className="p-3 text-center font-semibold text-slate-900 dark:text-white w-32">
                          Received
                        </th>
                        <th className="p-3 text-center font-semibold text-slate-900 dark:text-white w-32">
                          Shortage
                        </th>
                        <th className="p-3 text-center font-semibold text-slate-900 dark:text-white w-32">
                          Overage
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {inspectionForm.items.map((item, idx) => (
                        <tr
                          key={idx}
                          className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <td className="p-3">
                            <p className="font-medium text-slate-900 dark:text-white text-xs">
                              {item.description}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {item.category}
                            </p>
                          </td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-700 font-medium text-slate-700 dark:text-slate-300">
                              {item.quantity} {item.unit}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex justify-center">
                              <input
                                type="number"
                                className="w-24 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-center font-medium transition-all shadow-sm"
                                value={item.invoice_quantity}
                                onChange={(e) =>
                                  handleQuantityChange(
                                    idx,
                                    "invoice_quantity",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex justify-center">
                              <input
                                type="number"
                                className="w-24 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-center font-medium transition-all shadow-sm"
                                value={
                                  item.total_received_val !== undefined
                                    ? item.total_received_val
                                    : ""
                                }
                                onChange={(e) =>
                                  handleQuantityChange(
                                    idx,
                                    "total_received",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex justify-center">
                              <input
                                type="number"
                                className="w-24 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-center font-medium cursor-not-allowed"
                                value={item.rejected}
                                readOnly
                              />
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex justify-center">
                              <input
                                type="number"
                                className="w-24 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-center font-medium cursor-not-allowed"
                                value={item.overage}
                                readOnly
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-700/30 p-5 rounded border border-slate-100 dark:border-slate-700">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Overall Status
                  </label>
                  <div className="relative">
                    <select
                      className="w-full pl-4 pr-10 py-2.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none shadow-sm font-medium"
                      value={inspectionForm.status}
                      onChange={(e) =>
                        setInspectionForm({
                          ...inspectionForm,
                          status: e.target.value,
                        })
                      }
                    >
                      <option value="pending">Pending Review</option>
                      <option value="passed">Approved</option>
                      <option value="shortage">Shortage</option>
                      <option value="overage">Overage</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 9l-7 7-7-7"
                        ></path>
                      </svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    General Remarks
                  </label>
                  <textarea
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                    rows="2"
                    placeholder="Enter any overall comments or observations..."
                    value={inspectionForm.remarks}
                    onChange={(e) =>
                      setInspectionForm({
                        ...inspectionForm,
                        remarks: e.target.value,
                      })
                    }
                  ></textarea>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-lg">
              <button
                onClick={() => setShowInspectModal(false)}
                className="p-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-slate-300 dark:hover:border-slate-600 rounded transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitInspection}
                className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm hover:shadow transition-all"
              >
                <Save size={18} />
                Save Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QCInspectionsPage;
