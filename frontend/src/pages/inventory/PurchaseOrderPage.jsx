import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "../../utils/api";
import Swal from "sweetalert2";
import toastUtils from "../../utils/toastUtils";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import CreatePurchaseOrderModal from "./CreatePurchaseOrderModal";
import { renderDimensions } from "../../utils/dimensionUtils";
import DataTable from "../../components/ui/DataTable/DataTable";
import {
  ShoppingCart,
  Search,
  Plus,
  Filter,
  Download,
  Eye,
  CheckCircle,
  FileText,
  Calendar,
  X,
  Mail,
  MessageSquare,
  RefreshCw,
  ChevronRight,
  Clock,
  Send,
  User,
  Package,
  Edit,
  Paperclip,
  Upload,
  Layers,
  FileSpreadsheet,
} from "lucide-react";

const PurchaseOrderDetailTable = ({ po }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPOItems = async () => {
      try {
        const response = await axios.get(`/department/procurement/purchase-orders/${po.id}`);
        setItems(response.data.items || []);
      } catch (error) {
        console.error("Error fetching PO items:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPOItems();
  }, [po.id]);

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <RefreshCw size={20} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-2 rounded ">
      <DataTable
        title="Order Items Breakdown"
        titleIcon={<Package size={16} />}
        data={items}
        columns={[
          {
            key: "material_name",
            label: "Item Details",
            render: (val, item) => (
              <div>
                <p className=" text-slate-900 dark:text-white">{val}</p>
                <p className="text-[10px] text-slate-500">{item.item_group}</p>
              </div>
            )
          },
          {
            key: "dimensions",
            label: "Dimensions",
            render: (_, item) => (
              <span className="text-xs text-slate-500">
                {renderDimensions(item)}
              </span>
            )
          },
          {
            key: "quantity",
            label: "Ordered Qty",
            align: "right",
            render: (val, item) => (
              <div className="flex flex-col items-end">
                <span className=" text-slate-900 dark:text-white">
                  {Number(val).toLocaleString()} {item.unit || item.uom}
                </span>
                {item.total_weight > 0 && (
                  <span className="text-[10px] text-slate-500">
                    {Number(item.total_weight).toFixed(3)} Kg
                  </span>
                )}
              </div>
            )
          },
          {
            key: "received_qty",
            label: "Received",
            align: "right",
            render: (val, item) => (
              <span className={` ${Number(val || 0) >= Number(item.quantity || 0) ? 'text-emerald-600' : 'text-blue-600'}`}>
                {Number(val || 0).toLocaleString()}
              </span>
            )
          },
          {
            key: "rate",
            label: "Rate",
            align: "right",
            render: (val, item) => (
              <div className="flex flex-col items-end">
                <span className="text-slate-900 dark:text-white">
                  ₹{Number(item.rate_per_kg || val || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500">
                  per {item.rate_per_kg ? 'Kg' : (item.unit || 'Unit')}
                </span>
              </div>
            )
          },
          {
            key: "amount",
            label: "Total Amount",
            align: "right",
            className: " text-slate-900 dark:text-white",
            render: (val) => `₹${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
          }
        ]}
      />
    </div>
  );
};

const KanbanView = ({
  data,
  navigate,
  handleEditPO,
  handleViewPO,
  handleMonitorPO,
  handleSendPO,
  handleDownloadPO,
  handleExportToExcel,
  handleSendToInventory,
  formatCurrency,
  isInventoryView = false,
}) => {
  const columns = [
    { id: "draft", title: "Draft", color: "orange" },
    { id: "submitted", title: "Submitted", color: "blue" },
    { id: "approved", title: "Approved", color: "emerald" },
    { id: "goods arrival", title: "Goods Arrival", color: "amber" },
    { id: "sent to inventory", title: "Sent to Inventory", color: "purple" },
    { id: "fulfilled", title: "Fulfilled", color: "emerald" },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "draft":
        return "bg-orange-500";
      case "submitted":
        return "bg-blue-500";
      case "approved":
        return "bg-emerald-500";
      case "goods arrival":
        return "bg-amber-500";
      case "sent to inventory":
        return "bg-purple-500";
      case "fulfilled":
        return "bg-emerald-600";
      default:
        return "bg-slate-500";
    }
  };

  return (
    <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar min-h-[600px]">
      {columns.map((col) => (
        <div
          key={col.id}
          className="min-w-[320px] max-w-[320px] flex flex-col gap-4"
        >
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded ${getStatusColor(col.id)}`}
              />
              <h3 className="text-xs  text-slate-700 dark:text-slate-300">
                {col.title}
              </h3>
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs  text-slate-500">
                {data.filter((po) => po.status === col.id).length}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 flex-1">
            {data.filter((po) => po.status === col.id).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 bg-slate-50/50 dark:bg-slate-800/20 rounded border border-dashed border-slate-200 dark:border-slate-800/50">
                <p className="text-xs  text-slate-400">
                  No orders
                </p>
              </div>
            ) : (
              data
                .filter((po) => po.status === col.id)
                .map((po) => {
                  const totalQty = Number(po.total_qty) || 0;
                  const receivedQty = Number(po.received_qty) || 0;
                  const fulfillmentPercent =
                    totalQty > 0
                      ? Math.round((receivedQty / totalQty) * 100)
                      : 0;

                  return (
                    <div
                      key={po.id}
                      className="bg-white dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800 p-4 shadow-sm transition-all group border-l-4 border-l-blue-500"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <button
                          onClick={() => handleViewPO(po)}
                          className="text-xs  text-blue-600 hover:text-blue-700 font-mono"
                        >
                          {po.po_number}
                        </button>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleViewPO(po)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded transition-all"
                            title="View"
                          >
                            <Eye size={14} />
                          </button>
                          {po.status === "draft" && (
                            <button
                              onClick={() => handleEditPO(po)}
                              className="p-1 text-slate-400 hover:text-emerald-600 rounded transition-all"
                              title="Edit"
                            >
                              <Edit size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleMonitorPO(po)}
                            className="p-1 text-slate-400 hover:text-purple-600 rounded transition-all relative group/msg"
                            title="Monitor"
                          >
                            <MessageSquare
                              size={14}
                              className={
                                po.unread_communication_count > 0
                                  ? "text-purple-600 animate-pulse"
                                  : ""
                              }
                            />
                            {po.unread_communication_count > 0 && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 ">
                                {po.unread_communication_count}
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => handleSendPO(po)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded transition-all"
                            title="Send Email"
                          >
                            <Send size={14} />
                          </button>
                          <button
                            onClick={() => handleDownloadPO(po)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-all"
                            title="Download"
                          >
                            <Download size={14} />
                          </button>
                          {!isInventoryView && (
                            <button
                              onClick={() => handleExportToExcel(po)}
                              className="p-1 text-emerald-600 hover:text-emerald-700 rounded transition-all"
                              title="Export to Excel"
                            >
                              <FileSpreadsheet size={14} />
                            </button>
                          )}
                          {(po.status === "approved" || po.status === "submitted") && po.status !== "sent to inventory" && !isInventoryView && (
                            <button
                              onClick={() => handleSendToInventory(po)}
                              className="p-1 text-slate-400 hover:text-emerald-600 rounded transition-all"
                              title="Send to Inventory"
                            >
                              <Send size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      <h4 className="text-xs  text-slate-700 dark:text-slate-300 mb-1  truncate">
                        {po.vendor_name || "N/A"}
                      </h4>

                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <div className="flex items-center gap-1">
                          <Calendar size={10} className="text-slate-400" />
                          <span className="text-xs  text-slate-400 ">
                            {new Date(
                              po.order_date || po.created_at,
                            ).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText size={10} className="text-slate-400" />
                          <span className="text-xs  text-slate-400 font-mono">
                            #{po.mr_number || po.quotation_id || "Direct"}
                          </span>
                        </div>
                        {po.root_card_id && (
                          <div className="flex items-center gap-1">
                            <Layers size={10} className="text-blue-600 flex-shrink-0" />
                            <span className="text-xs  text-blue-600  break-words">
                              Project: {po.root_card_project_name || "N/A"}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        {!isInventoryView ? (
                          <div>
                            <p className="text-xs  text-slate-900 dark:text-white ">
                              ₹{formatCurrency(po.total_amount)}
                            </p>
                            <p className="text-[8px]  text-slate-400 uppercase mt-0.5">
                              Total Value
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs  text-slate-900 dark:text-white ">
                              {po.total_qty || 0} {po.uom || "Units"}
                            </p>
                            <p className="text-[8px]  text-slate-400 uppercase mt-0.5">
                              Total Quantity
                            </p>
                          </div>
                        )}
                        <div className="text-right">
                          <p
                            className={`text-xs  ${fulfillmentPercent === 100 ? "text-emerald-500" : "text-blue-600"}`}
                          >
                            {fulfillmentPercent}%
                          </p>
                          <p className="text-[8px]  text-slate-400 uppercase mt-0.5">
                            Received
                          </p>
                        </div>
                      </div>

                      <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${fulfillmentPercent === 100 ? "bg-emerald-500" : "bg-blue-500"}`}
                          style={{ width: `${fulfillmentPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const PurchaseOrderPage = ({ isInventoryView = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [rootCardFilter, setRootCardFilter] = useState("all");
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalViewMode, setModalViewMode] = useState(false);
  const [editPO, setEditPO] = useState(null);
  const [preFilledFromQuotation, setPreFilledFromQuotation] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qid = params.get('quotationId');
    if (qid) {
      axios.get(`/department/procurement/quotations/${qid}`).then(res => {
        setPreFilledFromQuotation(res.data);
        setShowCreateModal(true);
        navigate(location.pathname, { replace: true });
      }).catch(err => console.error("Error fetching quotation for PO:", err));
    }

    if (location.state?.quotation) {
      setPreFilledFromQuotation(location.state.quotation);
      setShowCreateModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }

    const projFilter = params.get('projectFilter');
    if (projFilter) {
      setProjectFilter(projFilter);
    }

    const poId = params.get('poId');
    if (poId) {
      axios.get(`/department/procurement/purchase-orders/${poId}`).then(res => {
        setEditPO(res.data);
        setModalViewMode(true);
        setShowCreateModal(true);
        navigate(location.pathname, { replace: true });
      }).catch(err => console.error("Error fetching PO for auto-view:", err));
    }
  }, [location.state, location.search, location.pathname, navigate]);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showMonitorModal, setShowMonitorModal] = useState(false);
  const [selectedPOForMonitor, setSelectedPOForMonitor] = useState(null);
  const [communications, setCommunications] = useState([]);
  const [fetchingCommunications, setFetchingCommunications] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailData, setEmailData] = useState({
    poId: null,
    poNumber: "",
    email: "",
    subject: "",
    message: "",
  });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedPOForUpload, setSelectedPOForUpload] = useState(null);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [filesToUpload, setFilesToUpload] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [isFullReceipt, setIsFullReceipt] = useState(false);

  const fetchPOAttachments = async (poId) => {
    try {
      const response = await axios.get(`/department/procurement/purchase-orders/${poId}`);
      setExistingAttachments(response.data.attachments || []);
    } catch (error) {
      console.error("Error fetching PO attachments:", error);
    }
  };

  const handleOpenUploadModal = (po) => {
    setSelectedPOForUpload(po);
    setFilesToUpload([]);
    setExistingAttachments([]);
    setIsFullReceipt(false);
    setShowUploadModal(true);
    fetchPOAttachments(po.id);
  };

  useEffect(() => {
    fetchPurchaseOrders();
    fetchStats();
    const interval = setInterval(() => {
      fetchPurchaseOrders(true);
      fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let interval;
    if (showMonitorModal && selectedPOForMonitor) {
      interval = setInterval(() => {
        fetchCommunications(selectedPOForMonitor.id);
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showMonitorModal, selectedPOForMonitor]);

  const fetchPurchaseOrders = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await axios.get("/department/procurement/purchase-orders");
      setPurchaseOrders(response.data.purchaseOrders || response.data);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      toastUtils.error("Failed to load purchase orders");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(
        "/department/procurement/purchase-orders/stats/summary",
      );
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const loadImage = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
  };

  const generatePOPDF = async (po) => {
    const doc = new jsPDF();
    try {
      const logo = await loadImage("/logo.png");
      doc.addImage(logo, "PNG", 14, 5, 50, 15);
    } catch (error) {
      console.warn("Logo not found or failed to load:", error);
    }

    doc.setFontSize(20);
    doc.text("PURCHASE ORDER", 105, 30, { align: "center" });

    const formatDate = (dateStr) => {
      if (!dateStr) return "N/A";
      try {
        const date = new Date(dateStr);
        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const y = date.getFullYear();
        return `${d}-${m}-${y}`;
      } catch {
        return dateStr;
      }
    };

    doc.setFontSize(10);
    doc.text(`PO Number: ${po.po_number}`, 14, 45);
    doc.text(`Date: ${formatDate(po.order_date || po.created_at)}`, 14, 50);
    doc.text(`Vendor: ${po.vendor_name || "N/A"}`, 14, 55);

    if (po.expected_delivery_date) {
      doc.text(`Expected Delivery: ${formatDate(po.expected_delivery_date)}`, 14, 60);
    }

    const tableColumn = ["#", "Item Name / Group", "Qty", "UOM", "Rate/Kg", "Weight (Kg)", "Total"];
    const tableRows = (po.items || []).map((item, index) => {
      const dimText = renderDimensions(item);
      const dimDisplay = dimText ? `\nDim: ${dimText} mm` : "";
      const rate = parseFloat(item.rate_per_kg) || parseFloat(item.rate) || 0;
      return [
        index + 1,
        { content: `${item.material_name || "N/A"}\n${item.item_group || "-"}${dimDisplay}`, styles: { fontStyle: "bold" } },
        item.quantity ? parseFloat(item.quantity).toString() : "0",
        item.unit || item.uom || "Nos",
        `INR ${Number(rate).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 })}`,
        item.total_weight ? parseFloat(item.total_weight).toFixed(3) : "0.000",
        `INR ${Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 })}`,
      ];
    });

    autoTable(doc, {
      startY: 80,
      head: [tableColumn],
      body: tableRows,
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246], fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 60 },
        2: { cellWidth: 20, halign: "center" },
        3: { cellWidth: 20, halign: "center" },
        4: { cellWidth: 25 },
        5: { cellWidth: 25, halign: "center" },
        6: { cellWidth: 30 },
      },
      styles: { fontSize: 8, overflow: "linebreak" },
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.text(`Subtotal: INR ${Number(po.subtotal || 0).toLocaleString()}`, 140, finalY);
    doc.text(`Tax Amount: INR ${Number(po.tax_amount || 0).toLocaleString()}`, 140, finalY + 7);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Amount: INR ${Number(po.total_amount || 0).toLocaleString()}`, 140, finalY + 15);
    return doc;
  };

  const handleSendEmail = async (po) => {
    try {
      const response = await axios.get(`/department/procurement/purchase-orders/${po.id}`);
      const fullPO = response.data;
      setEmailData({
        poId: fullPO.id,
        poNumber: fullPO.po_number,
        email: fullPO.vendor_email || "",
        subject: `Purchase Order ${fullPO.po_number} from Sterling`,
        message: `Dear ${fullPO.vendor_name || "Vendor"},\n\nPlease find attached the Purchase Order ${fullPO.po_number}.\n\nBest regards,\nSterling`,
        po: fullPO,
      });
      setShowEmailModal(true);
    } catch (error) {
      console.error("Error fetching PO details for email:", error);
      toastUtils.error("Failed to fetch Purchase Order details");
    }
  };

  const handleMonitorReplies = async (po) => {
    setSelectedPOForMonitor(po);
    setCommunications([]);
    setShowMonitorModal(true);
    fetchCommunications(po.id);
  };

  const closeMonitorModal = () => {
    setShowMonitorModal(false);
    setSelectedPOForMonitor(null);
    fetchPurchaseOrders(true);
    fetchStats();
  };

  const fetchCommunications = async (poId) => {
    try {
      setFetchingCommunications(true);
      const response = await axios.get(`/department/procurement/purchase-orders/${poId}/communications`);
      setCommunications(response.data);
    } catch (error) {
      console.error("Error fetching communications:", error);
    } finally {
      setFetchingCommunications(false);
    }
  };

  const handleUploadInvoice = async (po) => {
    try {
      const response = await axios.get(`/department/procurement/purchase-orders/${po.id}`);
      setSelectedPOForUpload(response.data);
      setShowUploadModal(true);
      setFilesToUpload([]);
      setIsFullReceipt(false);
    } catch (error) {
      console.error("Error fetching PO for upload:", error);
      toastUtils.error("Failed to load PO details");
    }
  };

  const handleFileUpload = async () => {
    if (filesToUpload.length === 0) {
      toastUtils.error("Please select files to upload");
      return;
    }
    try {
      setUploadingFiles(true);
      const formData = new FormData();
      filesToUpload.forEach((file) => formData.append("files", file));
      formData.append("poId", selectedPOForUpload.id);
      formData.append("isFullReceipt", isFullReceipt);

      await axios.post(`/department/procurement/purchase-orders/${selectedPOForUpload.id}/invoices`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toastUtils.success("Files uploaded successfully");
      setShowUploadModal(false);
      fetchPurchaseOrders();
    } catch (error) {
      console.error("Error uploading files:", error);
      toastUtils.error("Failed to upload files");
    } finally {
      setUploadingFiles(false);
    }
  };

  const viewAttachment = async (attachmentId, fileName) => {
    try {
      const response = await axios.get(`/department/procurement/purchase-orders/attachments/${attachmentId}/download`, {
        responseType: "blob",
      });
      const contentType = response.headers['content-type'] || 'application/pdf';
      const file = new Blob([response.data], { type: contentType });
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL, '_blank');
    } catch (error) {
      console.error("Error viewing attachment:", error);
      toastUtils.error("Failed to view attachment");
    }
  };

  const downloadAttachment = async (attachmentId, fileName) => {
    try {
      const response = await axios.get(`/department/procurement/purchase-orders/attachments/${attachmentId}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName || "download");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading attachment:", error);
      toastUtils.error("Failed to download attachment");
    }
  };

  const handleExportToExcel = async (po) => {
    try {
      const response = await axios.get(`/department/procurement/purchase-orders/${po.id}`);
      const fullPO = response.data;
      const items = fullPO.items || [];

      const exportData = items.map((item) => {
        const rate = parseFloat(item.rate_per_kg) || parseFloat(item.rate) || 0;
        return {
          "Item Name / Group": `${item.material_name || "N/A"}\n(${item.item_group || "-"})`,
          "Dimensions": renderDimensions(item),
          "Ordered Qty": `${item.quantity} ${item.unit || item.uom}`,
          "Rate": rate,
          "Weight (Kg)": item.total_weight ? parseFloat(item.total_weight).toFixed(3) : "0.000",
          "Total Amount": item.amount || 0,
        };
      });

      const headerData = [
        { A: "SUPPLIER", B: fullPO.vendor_name || "N/A" },
        { A: "PO NUMBER", B: fullPO.po_number || "N/A" },
        { A: "PROJECT", B: fullPO.root_card_project_name || "N/A" },
        { A: "ORDER DATE", B: new Date(fullPO.order_date || fullPO.created_at).toLocaleDateString() },
        { A: "TOTAL AMOUNT", B: `INR ${Number(fullPO.total_amount || 0).toLocaleString()}` },
      ];

      const ws = XLSX.utils.json_to_sheet(exportData, { origin: "A8" });
      XLSX.utils.sheet_add_json(ws, headerData, { skipHeader: true, origin: "A1" });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Purchase Order");
      XLSX.writeFile(wb, `PurchaseOrder-${fullPO.po_number}.xlsx`);
    } catch (error) {
      console.error("Error exporting to excel:", error);
      toastUtils.error("Failed to export Purchase Order to Excel");
    }
  };

  const handleSendToInventory = async (po) => {
    try {
      await axios.patch(`/department/procurement/purchase-orders/${po.id}/status`, {
        status: "sent to inventory",
        inventory_status: "pending receipt",
      });
      toastUtils.success(`PO ${po.po_number} sent to inventory successfully`);
      fetchPurchaseOrders();
      fetchStats();
    } catch (error) {
      console.error("Error sending PO to inventory:", error);
      toastUtils.error("Failed to send Purchase Order to inventory");
    }
  };

  const submitEmail = async (e) => {
    e.preventDefault();
    setSendingEmail(true);
    try {
      const doc = await generatePOPDF(emailData.po);
      const pdfBase64 = doc.output("datauristring");
      await axios.post(`/department/procurement/purchase-orders/${emailData.poId}/email`, { 
        ...emailData, 
        pdfBase64,
        poNumber: emailData.po.po_number 
      });
      if (emailData.po.status === "draft") {
        await axios.patch(`/department/procurement/purchase-orders/${emailData.poId}/status`, { status: "submitted" });
      }
      setShowEmailModal(false);
      toastUtils.success("Purchase Order emailed successfully");
      fetchPurchaseOrders();
    } catch (error) {
      console.error("Error sending email:", error);
      toastUtils.error("Failed to send Purchase Order");
    } finally {
      setSendingEmail(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(amount || 0);
  };

  const displayedOrders = isInventoryView 
    ? purchaseOrders.filter(po => 
        po.status === "sent to inventory" || 
        (po.inventory_status && po.inventory_status !== "pending") ||
        ["material received", "delivered", "fulfilled"].includes(po.status)
      )
    : purchaseOrders;

  const projects = Array.from(new Set(displayedOrders.map(po => po.root_card_project_name).filter(Boolean))).sort();

  const handleViewPO = (po) => {
    setEditPO(po);
    setModalViewMode(true);
    setShowCreateModal(true);
  };

  const handleEditPO = (po) => {
    setEditPO(po);
    setModalViewMode(false);
    setShowCreateModal(true);
  };

  const handleDownloadPO = async (po) => {
    try {
      const response = await axios.get(`/department/procurement/purchase-orders/${po.id}`);
      const fullPO = response.data;
      const doc = await generatePOPDF(fullPO);
      doc.save(`PurchaseOrder-${fullPO.po_number}.pdf`);
    } catch (error) {
      console.error("Error downloading PO:", error);
      toastUtils.error("Failed to generate Purchase Order PDF");
    }
  };

  return (
    <div className="p-4 bg-slate-50/50 dark:bg-slate-950 min-h-screen">
      <DataTable
        title={isInventoryView ? "Received Purchase Orders" : "Purchase Orders"}
        titleIcon={<ShoppingCart size={15} />}
        titleExtra={
          <div className="flex items-center gap-2 ml-4">
            <button onClick={fetchPurchaseOrders} className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-500 hover:bg-slate-50 transition-all">
              <RefreshCw size={14} />
            </button>
            {!isInventoryView && (
              <button onClick={() => { setEditPO(null); setShowCreateModal(true); }} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 shadow-sm transition-all">
                <Plus size={14} /> Create Order
              </button>
            )}
          </div>
        }
        filters={[
          {
            key: isInventoryView ? "inventory_status" : "status",
            label: "Status",
            options: [
              { label: "Draft", value: "draft" },
              { label: "Submitted", value: "submitted" },
              { label: "Approved", value: "approved" },
              { label: "Goods Arrival", value: "goods arrival" },
              { label: "Sent to Inventory", value: "sent to inventory" },
              { label: "Material Received", value: "material received" },
              { label: "Completed", value: "completed" },
              { label: "Cancelled", value: "cancelled" },
            ]
          },
          {
            key: "root_card_project_name",
            label: "Project",
            options: projects.map(p => ({ label: p, value: p }))
          }
        ]}
        data={displayedOrders}
        columns={[
          {
            key: "po_number",
            label: "PO Details",
            render: (val, po) => (
              <button onClick={() => handleViewPO(po)} className="text-xs text-blue-600 hover:text-blue-700  font-mono">
                {val}
              </button>
            )
          },
          {
            key: "vendor_name",
            label: "Supplier",
            render: (val) => (
              <div>
                <p className="text-xs text-slate-700 dark:text-slate-300 ">{val || "N/A"}</p>
                <p className="text-[10px] text-emerald-500 flex items-center gap-1 mt-0.5 ">
                  <span className="w-1 h-1 rounded bg-emerald-500"></span> Active Vendor
                </p>
              </div>
            )
          },
          {
            key: "root_card_project_name",
            label: "Project",
            render: (val) => val ? (
              <div className="flex items-start gap-2 max-w-[200px]">
                <div className="w-1.5 h-1.5 rounded bg-blue-500 mt-1 flex-shrink-0"></div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2 ">
                  {val}
                </p>
              </div>
            ) : (
              <span className="text-[10px] text-slate-400 italic ">Direct PO</span>
            )
          },
          {
            key: "order_date",
            label: "Order -- Expected",
            render: (_, po) => (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700 ">
                  <Calendar size={10} />
                  <span className="text-[10px]">
                    {new Date(po.order_date || po.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                </div>
                <ChevronRight size={10} className="text-slate-300" />
                <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-900/30 text-orange-600 border border-orange-100 dark:border-orange-800/30 ">
                  <Clock size={10} />
                  <span className="text-[10px]">
                    {po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "N/A"}
                  </span>
                </div>
              </div>
            )
          },
          ...(!isInventoryView ? [{
            key: "total_amount",
            label: "Amount",
            render: (val) => (
              <div>
                <p className="text-xs  text-slate-900 dark:text-white">₹{formatCurrency(val)}</p>
                <p className="text-[10px] text-emerald-500 ">Net Value</p>
              </div>
            )
          }] : []),
          {
            key: isInventoryView ? "inventory_status" : "status",
            label: "Status",
            className: "text-center",
            render: (val, po) => {
              const status = isInventoryView ? po.inventory_status : po.status;
              const config = {
                draft: "bg-orange-50 text-orange-600 border-orange-100 dot-orange-500",
                submitted: "bg-blue-50 text-blue-600 border-blue-100 dot-blue-500",
                approved: "bg-emerald-50 text-emerald-600 border-emerald-100 dot-emerald-500",
                "goods arrival": "bg-amber-50 text-amber-600 border-amber-100 dot-amber-500",
                "sent to inventory": "bg-purple-50 text-purple-600 border-purple-100 dot-purple-500",
                "material received": "bg-indigo-50 text-indigo-600 border-indigo-100 dot-indigo-500",
                "dc uploaded": "bg-orange-50 text-orange-600 border-orange-100 dot-orange-500",
                "partially received": "bg-amber-50 text-amber-600 border-amber-100 dot-amber-500",
                fulfilled: "bg-emerald-100 text-emerald-700 border-emerald-200 dot-emerald-500",
                delivered: "bg-emerald-100 text-emerald-700 border-emerald-200 dot-emerald-500",
                "pending receipt": "bg-purple-50 text-purple-600 border-purple-100 dot-purple-500",
              };
              const style = config[status] || "bg-slate-50 text-slate-500 border-slate-200 dot-slate-500";
              const dotMatch = style.match(/dot-(\w+)-(\d+)/);
              const dotColor = dotMatch ? `bg-${dotMatch[1]}-${dotMatch[2]}` : "bg-slate-500";
              return (
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px]  border ${style.replace(/dot-\w+-\d+/, '')}`}>
                  <div className={`w-1 h-1 rounded-full ${dotColor}`}></div>
                  <span className="capitalize">{status?.replace(/_/g, ' ')}</span>
                </span>
              );
            }
          },
          {
            key: "actions",
            label: "Actions",
            align: "center",
            render: (_, po) => (
              <div className="flex items-center justify-center gap-1">
                <button onClick={() => handleViewPO(po)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all" title="View"><Eye size={14} /></button>
                {po.status === "draft" && !isInventoryView && (
                  <button onClick={() => handleEditPO(po)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all" title="Edit"><Edit size={14} /></button>
                )}
                {!isInventoryView && (
                  <>
                    <button onClick={() => handleMonitorReplies(po)} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-all relative" title="Monitor Communication">
                      <MessageSquare size={14} className={po.unread_communication_count > 0 ? "text-purple-600 animate-pulse" : ""} />
                      {po.unread_communication_count > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full border border-white font-bold">
                          {po.unread_communication_count}
                        </span>
                      )}
                    </button>
                    <button 
                      onClick={() => handleSendEmail(po)} 
                      disabled={po.status !== "draft"}
                      className={`p-1.5 rounded transition-all ${po.status === "draft" ? "text-slate-400 hover:text-blue-600 hover:bg-blue-50" : "text-slate-200 cursor-not-allowed"}`} 
                      title={po.status === "draft" ? "Send Email" : "Already Sent"}
                    >
                      <Mail size={14} />
                    </button>
                    <button onClick={() => handleExportToExcel(po)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all" title="Export to Excel"><FileSpreadsheet size={14} /></button>
                    {(po.status === "approved" || po.status === "submitted") && po.status !== "sent to inventory" && (
                      <button onClick={() => handleSendToInventory(po)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all" title="Send to Inventory"><Send size={14} /></button>
                    )}
                  </>
                )}
                <button onClick={() => handleDownloadPO(po)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all" title="Download PDF"><Download size={14} /></button>
                {isInventoryView && !["fulfilled", "delivered"].includes(po.inventory_status) && (
                  <button 
                    onClick={() => handleOpenUploadModal(po)} 
                    className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-all" 
                    title="Upload Delivery Challan"
                  >
                    <Paperclip size={14} />
                  </button>
                )}
                {isInventoryView && ["material received", "partially received"].includes(po.inventory_status) && po.dc_approved === 1 && (
                  <button onClick={() => navigate(`/department/inventory/grn?poId=${po.id}`)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-all" title="Create GRN"><FileText size={14} /></button>
                )}
              </div>
            )
          }
        ]}
        renderRowDetail={(po) => <PurchaseOrderDetailTable po={po} />}
        searchPlaceholder="Search by PO #, supplier, or project..."
      />

      <CreatePurchaseOrderModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setEditPO(null); setPreFilledFromQuotation(null); setModalViewMode(false); }}
        editData={editPO}
        isInventoryView={isInventoryView}
        initialViewMode={modalViewMode}
        preFilledFromQuotation={preFilledFromQuotation}
        onPOCreated={() => { fetchPurchaseOrders(); fetchStats(); }}
      />

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Send Purchase Order</h3>
                <p className="text-xs text-slate-500">PO: {emailData.poNumber}</p>
              </div>
              <button onClick={() => setShowEmailModal(false)} className="text-slate-400 hover:text-slate-500">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitEmail} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Vendor Email</label>
                <input
                  type="email"
                  value={emailData.email}
                  onChange={(e) => setEmailData({ ...emailData, email: e.target.value })}
                  className="w-full p-2 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  placeholder="vendor@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                  className="w-full p-2 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Message</label>
                <textarea
                  value={emailData.message}
                  onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                  className="w-full p-2 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none min-h-[120px] resize-none"
                  required
                />
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800 flex items-center gap-3">
                <FileText size={20} className="text-blue-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-blue-900 dark:text-blue-200 truncate">PurchaseOrder-{emailData.poNumber}.pdf</p>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400">Attached automatically</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowEmailModal(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-colors">Cancel</button>
                <button type="submit" disabled={sendingEmail} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-all disabled:bg-blue-400">
                  {sendingEmail ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                  Send PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Monitor Modal */}
      {showMonitorModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Vendor Communication</h3>
                  <p className="text-xs text-slate-500">PO: {selectedPOForMonitor?.po_number}</p>
                </div>
              </div>
              <button onClick={closeMonitorModal} className="text-slate-400 hover:text-slate-500">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 dark:bg-slate-900/30">
              {fetchingCommunications ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                  <RefreshCw size={24} className="animate-spin" />
                  <p className="text-sm">Fetching communications...</p>
                </div>
              ) : communications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Clock size={32} />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-slate-600 dark:text-slate-400">No communication found</p>
                    <p className="text-xs">Replies from vendor via email will appear here</p>
                  </div>
                </div>
              ) : (
                communications.map((comm) => (
                  <div 
                    key={comm.id} 
                    className={`flex flex-col ${comm.is_outgoing ? "items-end" : "items-start"} space-y-1`}
                  >
                    <div className={`max-w-[85%] rounded-lg p-4 shadow-sm space-y-3 ${
                      comm.is_outgoing 
                        ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800" 
                        : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                    }`}>
                      <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800/50 pb-2 gap-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            comm.is_outgoing ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-600"
                          }`}>
                            <User size={14} />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-900 dark:text-white">
                              {comm.is_outgoing ? "Me (Sterling)" : (comm.sender_name || comm.sender_email)}
                              {comm.is_outgoing && <span className="ml-2 font-normal text-slate-500">(Sent)</span>}
                            </p>
                            <p className="text-[10px] text-slate-500">{new Date(comm.received_at).toLocaleString()}</p>
                          </div>
                        </div>
                        {comm.has_attachments && (
                          <div className="flex items-center gap-1 text-[9px] font-medium text-blue-600 bg-blue-100/50 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
                            <Paperclip size={10} />
                            Attachments
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {comm.content_text}
                      </div>
                      {comm.attachments && comm.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-50 dark:border-slate-800/50">
                          {comm.attachments.map((att) => (
                            <div key={att.id} className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded overflow-hidden shadow-sm">
                              <button
                                onClick={() => viewAttachment(att.id, att.file_name)}
                                className="flex items-center gap-2 px-2 py-1 text-[10px] hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-r border-slate-100 dark:border-slate-700"
                                title="View file"
                              >
                                <FileText size={12} className="text-red-500" />
                                <span className="max-w-[120px] truncate">{att.file_name}</span>
                                <span className="text-slate-400 text-[8px]">({Math.round(att.file_size / 1024)} KB)</span>
                              </button>
                              <button
                                onClick={() => downloadAttachment(att.id, att.file_name)}
                                className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                title="Download"
                              >
                                <Download size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <button onClick={() => fetchCommunications(selectedPOForMonitor?.id)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-all" title="Refresh">
                  <RefreshCw size={18} />
                </button>
                <div className="flex-1 text-xs text-slate-500 italic">
                  Monitoring vendor replies for PO #{selectedPOForMonitor?.po_number}...
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Delivery Challan Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Upload Delivery Challan</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Vendor:</span>
                  <span className="text-slate-900 dark:text-white font-medium">{selectedPOForUpload?.vendor_name}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">PO Number:</span>
                  <span className="text-slate-900 dark:text-white font-mono font-medium">{selectedPOForUpload?.po_number}</span>
                </div>
              </div>

              {existingAttachments.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Previously Uploaded Documents</label>
                  <div className="space-y-1">
                    {existingAttachments.map((att, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-emerald-50/50 dark:bg-emerald-900/10 rounded border border-emerald-100/50 dark:border-emerald-800/30">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText size={14} className="text-emerald-500" />
                          <span className="text-xs truncate text-emerald-900 dark:text-emerald-200">{att.file_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => viewAttachment(att.id, att.file_name)} className="p-1 text-slate-400 hover:text-blue-500 transition-colors" title="View"><Eye size={12} /></button>
                          <button onClick={() => downloadAttachment(att.id, att.file_name)} className="p-1 text-slate-400 hover:text-emerald-500 transition-colors" title="Download"><Download size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Select Files (PDF, Images)</label>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-8 text-center hover:border-blue-500 transition-all group relative">
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setFilesToUpload(Array.from(e.target.files))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="mx-auto text-slate-300 group-hover:text-blue-500 transition-colors mb-2" size={32} />
                  <p className="text-xs text-slate-500">Click or drag files to upload</p>
                </div>
                
                {filesToUpload.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {filesToUpload.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText size={14} className="text-blue-500" />
                          <span className="text-xs truncate">{file.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{Math.round(file.size / 1024)} KB</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isFullReceipt}
                  onChange={(e) => setIsFullReceipt(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-600 dark:text-slate-400 group-hover:text-slate-900">Mark order as fully fulfilled</span>
              </label>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">Cancel</button>
                <button
                  onClick={handleFileUpload}
                  disabled={uploadingFiles || filesToUpload.length === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-all disabled:bg-slate-300"
                >
                  {uploadingFiles ? <RefreshCw size={16} className="animate-spin" /> : "Upload Files"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderPage;
