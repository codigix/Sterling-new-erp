import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import axios from "../../utils/api";
import { getServerUrl } from "../../utils/fileUtils";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
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
import { renderDimensions } from "../../utils/dimensionUtils";
import DataTable from "../../components/ui/DataTable/DataTable";

const QCInspectionsPage = () => {
  const navigate = useNavigate();
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

  // Modal State
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [selectedGRN] = useState(null);
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
      
      const grnMaterials = response.data.filter(m => Number(m.grn_id) === Number(inspection.dbId));
      
      // Enhance materials with fallback dimensions for serials
      const enhancedMaterials = grnMaterials.map(item => {
        const itemDimensions = {
          length: item.length || item.length_mm || 0,
          width: item.width || item.width_mm || 0,
          thickness: item.thickness || item.thickness_mm || 0,
          diameter: item.diameter || item.diameter_mm || 0,
          outer_diameter: item.outer_diameter || item.outerDiameter || 0,
          height: item.height || item.height_mm || 0,
          side_s: item.side_s || item.sideS || 0,
          side1: item.side1 || item.sideS1 || 0,
          side2: item.side2 || item.sideS2 || 0,
          web_thickness: item.web_thickness || item.tw || 0,
          flange_thickness: item.flange_thickness || item.tf || 0,
          item_group: item.item_group || item.itemGroup || ""
        };

        const enhancedSerials = (item.serials || []).map(s => {
          const serialDimensions = {
            ...(s.dimensions || {}),
            item_group: s.item_group || s.itemGroup || itemDimensions.item_group
          };
          const hasSerialDims = Object.values(serialDimensions).some(v => v !== null && v !== 0 && v !== '' && typeof v === 'number');
          
          return {
            ...s,
            dimensions: hasSerialDims ? serialDimensions : itemDimensions
          };
        });

        return { ...item, ...itemDimensions, serials: enhancedSerials };
      });

      setReportData({
        ...inspection,
        materials: enhancedMaterials
      });
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
          length: m.length || null,
          width: m.width || null,
          thickness: m.thickness || null,
          diameter: m.diameter || null,
          outer_diameter: m.outer_diameter || null,
          height: m.height || null,
          side1: m.side1 || null,
          side2: m.side2 || null,
          side_s: m.side_s || null,
          web_thickness: m.web_thickness || null,
          flange_thickness: m.flange_thickness || null,
          st_numbers: m.serials?.map(s => ({
            st_code: s.serial_number,
            item_code: s.item_code,
            status: s.inspection_status?.toUpperCase(),
            length: s.dimensions?.length || null,
            width: s.dimensions?.width || null,
            thickness: s.dimensions?.thickness || null,
            diameter: s.dimensions?.diameter || null,
            outer_diameter: s.dimensions?.outer_diameter || null,
            height: s.dimensions?.height || null,
            web_thickness: s.dimensions?.web_thickness || null,
            flange_thickness: s.dimensions?.flange_thickness || null,
            side1: s.dimensions?.side1 || null,
            side2: s.dimensions?.side2 || null,
            side_s: s.dimensions?.side_s || null
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

  const columns = [
    {
      key: "id",
      label: "GRN ID",
      sortable: true,
    },
    {
      key: "projectName",
      label: "Project / Root Card",
      sortable: true,
      render: (value, row) => (
        value ? (
          <Link
            to={`/department/quality/root-cards/${row.rootCardId}`}
            className="text-blue-600 hover:underline"
          >
            {value}
          </Link>
        ) : "N/A"
      ),
    },
    {
      key: "poNumber",
      label: "PO No.",
      sortable: true,
    },
    {
      key: "vendor",
      label: "Vendor",
      sortable: true,
    },
    {
      key: "qcStatus",
      label: "Status",
      sortable: true,
      render: (value, row) => (
        <span
          className={`p-1 rounded text-xs ${getStatusColor(
            row.finalReportId ? "completed" : value
          )}`}
        >
          {row.finalReportId 
            ? "Report Generated" 
            : value === "completed"
            ? "QC Completed"
            : value === "passed" || value === "approved"
            ? "Approved"
            : value.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: "inspectionType",
      label: "Inspection Type",
      sortable: true,
      render: (value, row) => (
        <select
          value={value || 'Inhouse'}
          onChange={(e) => handleTypeChange(row.dbId, e.target.value)}
          className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="Inhouse">Inhouse</option>
          <option value="Outsource">Outsource</option>
        </select>
      ),
    },
    {
      key: "actions",
      label: "Action",
      align: "center",
      sortable: false,
      render: (_, row) => (
        <div className="flex justify-center">
          {row.finalReportId ? (
            <button
              onClick={() => navigate("/department/quality/reports")}
              className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 rounded text-xs transition-all flex items-center gap-2"
            >
              <Eye size={14} />
              View Report
            </button>
          ) : row.qcStatus === 'completed' ? (
            <button
              onClick={() => handleShowReport(row)}
              className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs transition-all shadow-emerald-200 flex items-center gap-2"
            >
              <FileText size={14} />
              QC Report
            </button>
          ) : (
            <button
              onClick={() => navigate(`/department/quality/material-inspection?rootCardId=${row.rootCardId}`)}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-all shadow-blue-200"
            >
              Do Inspection
            </button>
          )}
        </div>
      ),
    },
  ];

  const reportColumns = [
    {
      key: "material_name",
      label: "Material & ST Numbers",
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
            <Package size={15} />
          </div>
          <div>
            <p className="text-xs text-slate-900 dark:text-white">{value}</p>
            <p className="text-xs text-slate-400">{row.item_group}</p>
          </div>
        </div>
      ),
    },
    {
      key: "dimensions",
      label: "Dimensions",
      render: (_, row) => (
        <div className="text-xs text-slate-500 font-mono">
          {renderDimensions(row)}
        </div>
      ),
    },
    {
      key: "received_qty",
      label: "Received Qty",
      align: "center",
      render: (value, row) => (
        <span className="text-xs text-slate-700 dark:text-slate-300">
          {value} {row.unit}
        </span>
      ),
    },
    {
      key: "status",
      label: "Summary Status",
      align: "center",
      render: (_, row) => {
        const acceptedCount = row.serials?.filter(s => s.inspection_status === 'Accepted').length || 0;
        const rejectedCount = row.serials?.filter(s => s.inspection_status === 'Rejected').length || 0;
        return (
          <div className="flex flex-col items-center gap-1">
            <div className="flex gap-2">
              {acceptedCount > 0 && (
                <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-xs border border-green-100">
                  {acceptedCount} Passed
                </span>
              )}
              {rejectedCount > 0 && (
                <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-xs border border-red-100">
                  {rejectedCount} Failed
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "reports",
      label: "Reports",
      align: "right",
      render: (_, row) => (
        <div className="flex flex-col items-end gap-2">
          {row.common_document_path && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                window.open(getServerUrl(row.common_document_path), '_blank');
              }}
              className="flex items-center gap-2 text-xs text-green-600 hover:text-green-700 transition-colors"
            >
              <CheckCircle size={12} /> Accepted <Eye size={12} />
            </button>
          )}
          {row.rejected_document_path && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                window.open(getServerUrl(row.rejected_document_path), '_blank');
              }}
              className="flex items-center gap-2 text-xs text-red-600 hover:text-red-700 transition-colors"
            >
              <AlertTriangle size={12} /> Rejected <Eye size={12} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const inspectColumns = [
    {
      key: "description",
      label: "Item Details",
      render: (value, row) => (
        <div>
          <p className="text-slate-900 dark:text-white text-xs">{value}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{row.category}</p>
        </div>
      ),
    },
    {
      key: "quantity",
      label: "Expected",
      align: "center",
      render: (value, row) => (
        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
          {value} {row.unit}
        </span>
      ),
    },
    {
      key: "invoice_quantity",
      label: "Invoice Quantity",
      align: "center",
      render: (value, row, _, idx) => (
        <input
          type="number"
          className="w-24 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-center transition-all"
          value={value}
          onChange={(e) => handleQuantityChange(idx, "invoice_quantity", e.target.value)}
        />
      ),
    },
    {
      key: "total_received_val",
      label: "Received",
      align: "center",
      render: (value, row, _, idx) => (
        <input
          type="number"
          className="w-24 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-center transition-all"
          value={value}
          onChange={(e) => handleQuantityChange(idx, "total_received", e.target.value)}
        />
      ),
    },
    {
      key: "rejected",
      label: "Shortage",
      align: "center",
      render: (value) => (
        <span className={`text-xs ${Number(value) > 0 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
          {value}
        </span>
      ),
    },
    {
      key: "overage",
      label: "Overage",
      align: "center",
      render: (value) => (
        <span className={`text-xs ${Number(value) > 0 ? 'text-orange-500 font-bold' : 'text-slate-400'}`}>
          {value}
        </span>
      ),
    },
  ];

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
    <div className="space-y-2 p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl  text-slate-900 dark:text-white ">
            QC Inspections
          </h1>
          <p className="text-slate-500 text-xs dark:text-slate-400 mt-1">
            Quality control inspection records and reports
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {/* <button className="flex items-center text-xs gap-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors ">
            <Plus size={15} />
            New Inspection
          </button> */}
          <button className="flex items-center text-xs gap-2 p-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded transition-colors ">
            <Download size={15} />
            Export
          </button>
        </div>
      </div>

      <DataTable
        title="Quality Inspections"
        titleIcon={Package}
        columns={columns}
        data={inspections}
        loading={loading}
        emptyMessage="No inspections found"
        initialSearchValue={new URLSearchParams(window.location.search).get("search") || ""}
        filters={[
          {
            key: "rootCardId",
            label: "All Projects / Root Cards",
            options: uniqueRootCards.map((rc) => ({ label: rc.name, value: rc.id }))
          },
          {
            key: "qcStatus",
            label: "All Status",
            options: [
              { label: "Completed", value: "completed" },
              { label: "Approved", value: "passed" },
              { label: "Shortage", value: "shortage" },
              { label: "Overage", value: "overage" },
              { label: "Pending", value: "pending" },
            ]
          }
        ]}
      />

      {/* QC Report Modal */}
      {showReportModal && reportData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded  bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                  <FileText size={15} />
                </div>
                <div>
                  <h2 className="text-xl  text-slate-900 dark:text-white  ">
                    QC Inspection Report: {reportData.id}
                  </h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs  text-slate-400  ">
                      Project: <span className="text-slate-500 dark:text-slate-300">{reportData.projectName}</span>
                    </span>
                    <span className="w-1 h-1 rounded  bg-slate-300"></span>
                    <span className="text-xs  text-slate-400  ">
                      Vendor: <span className="text-slate-500 dark:text-slate-300">{reportData.vendor}</span>
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowReportModal(false)} 
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
              >
                <X size={15} className="text-slate-400" />
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
                      className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs  text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 w-full sm:w-64 transition-all"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <DataTable
                    columns={reportColumns}
                    data={reportData.materials?.filter(item => 
                      item.material_name.toLowerCase().includes(reportSearchQuery.toLowerCase()) ||
                      item.item_group.toLowerCase().includes(reportSearchQuery.toLowerCase()) ||
                      item.serials?.some(s => s.serial_number.toLowerCase().includes(reportSearchQuery.toLowerCase()))
                    )}
                    showSearch={false}
                    expandableRow={(item) => (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-4 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl">
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
                              <span className="text-[8px]  text-slate-400  ">ST Number</span>
                              <span className={`w-2 h-2 rounded  ${s.inspection_status === 'Accepted' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            </div>
                            <p className="text-xs  text-slate-700 dark:text-slate-200  truncate" title={s.serial_number}>
                              {s.serial_number}
                            </p>
                            <div className="text-xs text-blue-600 font-mono">
                              {renderDimensions(s.dimensions)}
                            </div>
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
                    )}
                  />
                </div>
              </div>

              {/* General Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded  border border-slate-100 dark:border-slate-700 space-y-4">
                  <h4 className="text-xs  text-slate-400  tracking-[0.2em] flex items-center gap-2">
                    <Search size={14} /> Inspection Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs  text-slate-400  mb-1">Inspection Type</p>
                      <p className="text-xs  text-slate-700 dark:text-slate-200 ">{reportData.inspectionType}</p>
                    </div>
                    <div>
                      <p className="text-xs  text-slate-400  mb-1">Received Date</p>
                      <p className="text-xs  text-slate-700 dark:text-slate-200 ">{reportData.receivedDate}</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded  border border-slate-100 dark:border-slate-700 space-y-2">
                  <h4 className="text-xs  text-slate-400  tracking-[0.2em]">Summary Status</h4>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <CheckCircle size={20} />
                    </div>
                    <div>
                      <p className="text-xs  text-slate-900 dark:text-white  ">Quality Passed</p>
                      <p className="text-xs  text-slate-400  ">All criteria met for production release</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end gap-4">
              <button 
                onClick={() => setShowReportModal(false)}
                className="px-8 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 rounded text-xs    hover:bg-slate-50 transition-all "
              >
                Close Report
              </button>
              <button 
                onClick={handleCreateReport}
                disabled={loading}
                className="px-8 py-3 bg-emerald-600 text-white rounded text-xs    hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2"
              >
                <Plus size={14} /> Create Final Report
              </button>
              <button 
                onClick={() => window.print()}
                className="px-8 py-3 bg-blue-600 text-white rounded text-xs    hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
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
          <div className="bg-white dark:bg-slate-800 rounded  w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg  text-slate-900 dark:text-white">
                QC Inspection - {selectedGRN.id}
              </h2>
              <button
                onClick={() => setShowInspectModal(false)}
                className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-2">
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-slate-700/30 p-4 rounded border border-slate-100 dark:border-slate-700">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400  tracking-wide  mb-1">
                    PO Number
                  </p>
                  <p className=" text-slate-900 dark:text-white text-lg">
                    {selectedGRN.poNumber}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400  tracking-wide  mb-1">
                    Vendor
                  </p>
                  <p className=" text-slate-900 dark:text-white text-lg">
                    {selectedGRN.vendor}
                  </p>
                </div>
              </div>

              <div>
                <h3 className=" text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <CheckCircle size={15} className="text-blue-600" />
                  Items Inspection
                </h3>
                <DataTable
                  columns={inspectColumns}
                  data={inspectionForm.items}
                  showSearch={false}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-700/30 p-5 rounded border border-slate-100 dark:border-slate-700">
                <div>
                  <label className="block text-xs  text-slate-700 dark:text-slate-300 mb-2">
                    Overall Status
                  </label>
                  <div className="relative">
                    <select
                      className="w-full pl-4 pr-10 py-2.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none  "
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
                  <label className="block text-xs  text-slate-700 dark:text-slate-300 mb-2">
                    General Remarks
                  </label>
                  <textarea
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all "
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
                className="p-2 text-xs  text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-slate-300 dark:hover:border-slate-600 rounded transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitInspection}
                className="flex items-center gap-2 px-6 py-2 text-xs  text-white bg-blue-600 hover:bg-blue-700 rounded  hover:shadow transition-all"
              >
                <Save size={15} />
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
