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
  ArrowRight
} from "lucide-react";
import axios from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
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
      case 'pending': return <Badge variant="warning">Pending</Badge>;
      case 'approved': return <Badge variant="primary">Approved</Badge>;
      case 'partially_received': return <Badge variant="info">Partial</Badge>;
      case 'received': return <Badge variant="success">Received</Badge>;
      case 'cancelled': return <Badge variant="danger">Cancelled</Badge>;
      default: return <Badge variant="gray">{status}</Badge>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded">
              <ShoppingCart size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {loading ? "Loading..." : `Request: ${request?.request_number}`}
              </h3>
              {!loading && <p className="text-xs text-slate-500">BOM: {request?.bom_number}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-slate-500">Fetching request details...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <Clock size={12} /> Status
                  </div>
                  <div className="pt-1">{getStatusBadge(request.status)}</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <FileText size={12} /> Project
                  </div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{request.project_name || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <User size={12} /> Department
                  </div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{request.department}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <Calendar size={12} /> Date
                  </div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{new Date(request.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Remarks */}
              {request.remarks && (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Remarks</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 italic">"{request.remarks}"</p>
                </div>
              )}

              {/* Items Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                  Requested Materials
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-[10px]">
                    {request.items?.length} Items
                  </span>
                </h4>
                <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black tracking-widest">
                      <tr>
                        <th className="px-4 py-3 w-12 text-center">#</th>
                        <th className="px-4 py-3">Item Name / Group</th>
                        <th className="px-4 py-3">Part Detail / Grade</th>
                        <th className="px-4 py-3">Remark / Make</th>
                        <th className="px-4 py-3 text-center">Qty</th>
                        <th className="px-4 py-3 text-center">UOM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {request.items?.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/30 transition-colors group">
                          <td className="px-4 py-4 text-center text-xs font-medium text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 transition-colors">
                                {item.item_name}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tight mt-0.5">
                                {item.item_group || "NO-GROUP"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs text-slate-700 dark:text-slate-300">
                                {item.part_detail || "-"}
                              </span>
                              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">
                                {item.material_grade || "-"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-500 italic">
                                {item.remark || "-"}
                              </span>
                              <span className="text-xs text-slate-600 dark:text-slate-400">
                                {item.make || "-"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="font-black text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border border-slate-100 dark:border-slate-800">
                              {item.required_quantity}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold text-slate-600 dark:text-slate-400">
                              {item.uom}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Close</Button>
          {!loading && isProcurement && request?.status === 'approved' && !readOnly && (
            <Button 
              variant="primary" 
              icon={ArrowRight} 
              onClick={handlePOProcessing}
            >
              PO Processing
            </Button>
          )}
          {!loading && isProcurement && request?.status === 'pending' && !readOnly && (
            <>
              <Button 
                variant="danger" 
                icon={XCircle} 
                onClick={() => handleUpdateStatus('cancelled')}
                loading={submitting}
              >
                Cancel Request
              </Button>
              <Button 
                variant="primary" 
                icon={CheckCircle} 
                onClick={() => handleUpdateStatus('approved')}
                loading={submitting}
              >
                Approve Request
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaterialRequestDetailModal;
