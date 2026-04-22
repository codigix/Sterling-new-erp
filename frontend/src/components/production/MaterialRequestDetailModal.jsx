import React, { useState, useEffect } from "react";
import { 
  ShoppingCart, 
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  X,
  FileText,
  User,
  Calendar,
  CheckCircle,
  ArrowRight,
  ClipboardList,
  Package
} from "lucide-react";
import axios from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import DataTable from "../../components/ui/DataTable/DataTable";
import { toast } from "react-toastify";

const MaterialRequestDetailModal = ({ isOpen, onClose, requestId, onStatusUpdate, readOnly = false }) => {
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const isProcurement = user?.role?.toLowerCase().includes("procurement") || user?.role?.toLowerCase().includes("admin");

  useEffect(() => {
    if (isOpen && requestId) {
      fetchRequestDetails();
    }
  }, [isOpen, requestId]);

  const fetchRequestDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/production/material-requests/${requestId}`);
      setRequest(response.data.data);
    } catch (error) {
      console.error("Error fetching request details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (readOnly) return;
    try {
      setSubmitting(true);
      await axios.patch(`/production/material-requests/${requestId}/status`, { status: newStatus });
      toast.success(`Request ${newStatus} successfully`);
      if (onStatusUpdate) onStatusUpdate();
      onClose();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePOProcessing = () => {
    if (!request) return;
    
    navigate("/department/procurement/quotations/sent", {
      state: {
        openModal: true,
        initialData: {
          material_request_id: request.id,
          root_card_id: request.root_card_id,
          type: "outbound"
        }
      }
    });
    onClose();
  };

  if (!isOpen) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <Badge variant="warning" className="p-0">Pending</Badge>;
      case 'approved': return <Badge variant="primary" className="p-0">Approved</Badge>;
      case 'partially_received': return <Badge variant="info" className="p-0">Partial</Badge>;
      case 'received': return <Badge variant="success" className="p-0">Received</Badge>;
      case 'cancelled': return <Badge variant="danger" className="p-0">Cancelled</Badge>;
      default: return <Badge variant="gray" className="p-0">{status}</Badge>;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-start justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded w-full max-w-4xl flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-300 border border-white/20 my-auto shadow-2xl">
        <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-600/5 to-transparent flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <ClipboardList size={15} />
            </div>
            <div>
              <h3 className="text-md text-slate-900 dark:text-white">
                {loading ? "Loading..." : `Request: ${request?.request_number}`}
              </h3>
              {!loading && <p className="text-xs text-blue-600 dark:text-blue-400 ">BOM Reference: {request?.bom_number}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded  transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-2 gap-2">
              <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded animate-spin"></div>
              <p className="text-sm  text-slate-500">Fetching request details...</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div className="p-2 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs  mb-1">
                    <Clock size={12} /> Status
                  </div>
                  <div className="p-1">{getStatusBadge(request.status)}</div>
                </div>
                <div className="p-2 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded ">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs  mb-1">
                    <FileText size={12} /> Project
                  </div>
                  <p className="text-sm  text-slate-900 dark:text-white">{request.project_name || "Internal"}</p>
                </div>
                <div className="p-2 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded ">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs  mb-1">
                    <User size={12} /> Department
                  </div>
                  <p className="text-sm  text-slate-900 dark:text-white">{request.department}</p>
                </div>
                <div className="p-2 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded ">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs  mb-1">
                    <Calendar size={12} /> Creation Date
                  </div>
                  <p className="text-sm  text-slate-900 dark:text-white">{new Date(request.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Remarks */}
              {request.remarks && (
                <div className="p-5 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100/50 rounded ">
                  <h4 className="text-xs  text-amber-600 dark:text-amber-400  mb-2 ">Observations / Remarks</h4>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">"{request.remarks}"</p>
                </div>
              )}

              {/* Items Table */}
              <div className="space-y-2">
                <DataTable
                  title="Requested Materials"
                  titleIcon={<Package size={15} />}
                  data={request.items || []}
                    columns={[
                      {
                        key: "item_name",
                        label: "Material Description",
                        className: "w-1/3",
                        render: (_, item) => (
                          <div className="flex flex-col">
                            <span className=" text-slate-900 dark:text-slate-200 text-xs group-hover:text-blue-600 transition-colors">
                              {item.item_name}
                            </span>
                            {(() => {
                              const group = (item.item_group || "").toLowerCase();
                              const parts = [];
                              const val = (v) => {
                                const n = parseFloat(v);
                                return (n && n !== 0) ? n : null;
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
                              } else if (group === "square bar" || group === "sq bar") {
                                if (val(item.side1 || item.width)) parts.push(`S: ${val(item.side1 || item.width)}`);
                                if (val(item.length)) parts.push(`L: ${val(item.length)}`);
                              } else if (group === "rectangular bar" || group === "rec bar") {
                                if (val(item.width || item.side1)) parts.push(`W: ${val(item.width || item.side1)}`);
                                if (val(item.thickness || item.side2 || item.height)) parts.push(`T: ${val(item.thickness || item.side2 || item.height)}`);
                                if (val(item.length)) parts.push(`L: ${val(item.length)}`);
                              } else if (group.includes("square tube") || group === "sq tube") {
                                if (val(item.side1 || item.width)) parts.push(`S: ${val(item.side1 || item.width)}`);
                                if (val(item.thickness)) parts.push(`T: ${val(item.thickness)}`);
                                if (val(item.length)) parts.push(`L: ${val(item.length)}`);
                              } else if (group.includes("rectangular tube") || group === "rec tube") {
                                if (val(item.width || item.side1)) parts.push(`W: ${val(item.width || item.side1)}`);
                                if (val(item.height || item.side2)) parts.push(`H: ${val(item.height || item.side2)}`);
                                if (val(item.thickness)) parts.push(`T: ${val(item.thickness)}`);
                                if (val(item.length)) parts.push(`L: ${val(item.length)}`);
                              } else if (group === "c channel" || group === "c-channel" || group.includes("channel")) {
                                if (val(item.width || item.side1)) parts.push(`W: ${val(item.width || item.side1)}`);
                                if (val(item.height || item.side2)) parts.push(`H: ${val(item.height || item.side2)}`);
                                if (val(item.web_thickness)) parts.push(`Tw: ${val(item.web_thickness)}`);
                                if (val(item.flange_thickness)) parts.push(`Tf: ${val(item.flange_thickness)}`);
                                if (val(item.length)) parts.push(`L: ${val(item.length)}`);
                              } else if (group.includes("angle")) {
                                if (val(item.side1 || item.width)) parts.push(`S1: ${val(item.side1 || item.width)}`);
                                if (val(item.side2 || item.height)) parts.push(`S2: ${val(item.side2 || item.height)}`);
                                if (val(item.thickness)) parts.push(`T: ${val(item.thickness)}`);
                                if (val(item.length)) parts.push(`L: ${val(item.length)}`);
                              } else if (group.includes("beam")) {
                                if (val(item.height || item.side2)) parts.push(`H: ${val(item.height || item.side2)}`);
                                if (val(item.width || item.side1)) parts.push(`W: ${val(item.width || item.side1)}`);
                                if (val(item.web_thickness)) parts.push(`WT: ${val(item.web_thickness)}`);
                                if (val(item.flange_thickness)) parts.push(`FT: ${val(item.flange_thickness)}`);
                                if (val(item.length)) parts.push(`L: ${val(item.length)}`);
                              }

                              if (parts.length === 0) return null;
                              return (
                                <span className="text-xs text-blue-600 dark:text-blue-400 ">
                                  Dim: {parts.join(" \u00d7 ")} mm
                                </span>
                              );
                            })()}
                            <span className="text-xs  text-slate-400 ">
                              {item.item_group || "NO-GROUP"}
                            </span>
                          </div>
                        )
                      },
                      {
                        key: "total_weight",
                        label: "Weight (Kg)",
                        className: "",
                        render: (_, item) => (
                          <div className="flex flex-col">
                            <span className="text-xs  text-slate-700 dark:text-slate-200">
                              {Number(parseFloat(item.total_weight || 0).toFixed(3))} Kg
                            </span>
                            {parseFloat(item.unit_weight) > 0 && (
                              <span className="text-xs text-slate-400">
                                Unit: {Number(parseFloat(item.unit_weight || 0).toFixed(3))}
                              </span>
                            )}
                          </div>
                        )
                      },
                      {
                        key: "required_quantity",
                        label: "Required Qty",
                        className: "text-center",
                        render: (val) => (
                          <span className="p-1 text-blue-700 dark:text-blue-400   text-xs">
                            {Number(parseFloat(val || 0).toFixed(4))}
                          </span>
                        )
                      },
                      {
                        key: "uom",
                        label: "Unit",
                        render: (val) => <span className="text-xs  text-slate-500 ">{val}</span>
                      }
                    ]}
                  />
                
              </div>

              {/* Approved Quotation Section */}
              {request.quotation && (
                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-2 rounded border border-emerald-100/50 dark:border-emerald-900/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs  text-emerald-600 dark:text-emerald-400   flex items-center gap-2">
                      <CheckCircle2 size={15} /> Approved Vendor Quotation
                    </h4>
                    <span className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded text-xs   ">
                      {request.quotation.status}
                    </span>
                  </div>
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <FileText size={15} />
                      </div>
                      <div>
                        <p className="text-sm  text-slate-900 dark:text-white">
                          {request.quotation.quotation_number}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Total Amount: ₹{(request.quotation.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                        </p>
                      </div>
                    </div>

                      {request.quotation.received_quotation_path && (
                      <button
                        onClick={async () => {
                          try {
                            const response = await axios.get(
                              `/department/inventory/quotations/${request.quotation.id}/download`,
                              { responseType: "blob" }
                            );
                            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
                            window.open(url, "_blank");
                          } catch (error) {
                            console.error("Error viewing quotation:", error);
                            toast.error("Failed to view quotation PDF");
                          }
                        }}
                        className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded text-xs  hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all  active:scale-95"
                      >
                        <FileText size={15} />
                        View Vendor Quotation PDF
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0">
          <button 
            onClick={onClose}
            disabled={submitting}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200  text-sm transition-all"
          >
            Close
          </button>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {!loading && isProcurement && request?.status === 'approved' && !readOnly && (
              <button 
                onClick={handlePOProcessing}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded  text-xs transition-all  shadow-blue-500/25 active:scale-95 flex items-center justify-center gap-2"
              >
                <ArrowRight size={15} />
                PO Processing
              </button>
            )}
            {!loading && isProcurement && request?.status === 'pending' && !readOnly && (
              <>
                <button 
                  onClick={() => handleUpdateStatus('cancelled')}
                  disabled={submitting}
                  className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 rounded  text-sm hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all  flex items-center justify-center gap-2"
                >
                  <XCircle size={15} />
                  Cancel Request
                </button>
                <button 
                  onClick={() => handleUpdateStatus('approved')}
                  disabled={submitting}
                  className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded  text-sm transition-all  shadow-blue-500/25 active:scale-95 flex items-center justify-center gap-2"
                >
                  <CheckCircle size={15} />
                  Approve Request
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaterialRequestDetailModal;
