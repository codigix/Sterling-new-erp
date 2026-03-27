import React, { useState, useEffect } from "react";
import axios from "../../utils/api";
import { 
  Search, 
  Layers, 
  Package, 
  ChevronDown, 
  ChevronUp, 
  ClipboardCheck,
  Calendar,
  User,
  Tag,
  Hash,
  FileText,
  Filter,
  CheckCircle,
  XCircle,
  Upload,
  AlertTriangle,
  Eye,
  Clock,
  RotateCcw,
  CheckCheck,
  MessageSquare,
  X
} from "lucide-react";
import { showSuccess, showError } from "../../utils/toastUtils";
import SearchableSelect from "../../components/ui/SearchableSelect";
import { useNavigate, useSearchParams } from "react-router-dom";

const MaterialInspectionPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [rootCards, setRootCards] = useState([]);
  const [selectedRootCard, setSelectedRootCard] = useState(null);
  const [selectedRootCardId, setSelectedRootCardId] = useState(searchParams.get("rootCardId") || "");
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingRC, setLoadingRC] = useState(true);
  const [expandedItem, setExpandedItem] = useState(null);
  const [rejectionModal, setRejectionModal] = useState({
    isOpen: false,
    grnId: null,
    poItemId: null,
    serialNumber: null,
    inspectionType: null,
    reason: ""
  });

  useEffect(() => {
    fetchReadyRootCards();
  }, []);

  useEffect(() => {
    if (rootCards.length > 0 && selectedRootCardId) {
      handleRootCardChange(selectedRootCardId);
    }
  }, [rootCards, selectedRootCardId]);

  const fetchReadyRootCards = async () => {
    try {
      setLoadingRC(true);
      const response = await axios.get("/qc/portal/ready-root-cards");
      setRootCards(response.data);
    } catch (error) {
      console.error("Error fetching root cards:", error);
      showError("Failed to load root cards");
    } finally {
      setLoadingRC(false);
    }
  };

  const fetchMaterials = async (rootCardId, silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await axios.get("/qc/portal/materials-for-inspection", {
        params: { rootCardId }
      });
      setMaterials(response.data);
    } catch (error) {
      console.error("Error fetching materials:", error);
      showError("Failed to load materials for inspection");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleRootCardChange = (id) => {
    setSelectedRootCardId(id);
    const rc = rootCards.find(card => String(card.id) === String(id));
    if (rc) {
      setSelectedRootCard(rc);
      fetchMaterials(rc.id);
    } else {
      setSelectedRootCard(null);
      setMaterials([]);
    }
    setExpandedItem(null);
  };

  const handleBulkStatusUpdate = async (grnId, poItemId, serialsToUpdate, status, inspectionType, customNotes = null) => {
    // 1. Optimistic Update
    const previousMaterials = [...materials];
    const updatedMaterials = materials.map(item => {
      if (Number(item.grn_id) === Number(grnId) && Number(item.po_item_id) === Number(poItemId)) {
        const updatedSerials = item.serials.map(s => {
          if (serialsToUpdate.includes(s.serial_number)) {
            return { ...s, inspection_status: status, rejection_reason: status === 'Rejected' ? customNotes : null };
          }
          return s;
        });
        
        // Re-calculate item-level completion status logic (similar to backend logic used in materials fetch)
        const allProcessed = updatedSerials.length > 0 && updatedSerials.every(s => s.inspection_status === 'Accepted' || s.inspection_status === 'Rejected');
        // Simple logic for UI: if all serials processed, mark as QC COMPLETED
        const newStatus = allProcessed ? 'QC COMPLETED' : 'QC PENDING';
        
        return { ...item, serials: updatedSerials, status: newStatus };
      }
      return item;
    });
    
    setMaterials(updatedMaterials);

    try {
      // Don't set global loading to true to avoid spinner flash
      await axios.post("/qc/inspection/submit", {
        grn_id: grnId,
        po_item_id: poItemId,
        inspection_type: inspectionType || "Inhouse",
        results: serialsToUpdate.map(serialNumber => ({
          serial_number: serialNumber,
          status: status,
          notes: customNotes || `${serialsToUpdate.length > 1 ? 'Bulk ' : ''}${status} from material inspection list`
        })),
        remarks: `${serialsToUpdate.length === 1 ? 'ST ' + serialsToUpdate[0] : serialsToUpdate.length + ' ST numbers'} marked as ${status}`
      });
      showSuccess(`${serialsToUpdate.length === 1 ? 'ST ' + serialsToUpdate[0] : serialsToUpdate.length + ' items'} marked as ${status}`);
      // Refresh data locally is already done optimistically
    } catch (error) {
      console.error("Error updating status:", error);
      showError(`Failed to update status for ${serialsToUpdate.length === 1 ? serialsToUpdate[0] : 'items'}`);
      // Rollback on error
      setMaterials(previousMaterials);
    }
  };

  const handleQuickStatusUpdate = async (grnId, poItemId, serialNumber, status, inspectionType) => {
    if (status === 'Rejected' && (!inspectionType || inspectionType === 'Inhouse')) {
      setRejectionModal({
        isOpen: true,
        grnId,
        poItemId,
        serialNumber,
        inspectionType,
        reason: ""
      });
    } else {
      handleBulkStatusUpdate(grnId, poItemId, [serialNumber], status, inspectionType);
    }
  };

  const submitRejection = () => {
    if (!rejectionModal.reason.trim()) {
      showError("Please enter a rejection reason");
      return;
    }
    handleBulkStatusUpdate(
      rejectionModal.grnId,
      rejectionModal.poItemId,
      [rejectionModal.serialNumber],
      'Rejected',
      rejectionModal.inspectionType,
      rejectionModal.reason
    );
    setRejectionModal({ ...rejectionModal, isOpen: false, reason: "" });
  };

  const handleApproveAll = (item) => {
    const pendingSerials = item.serials
      ?.filter(s => s.inspection_status === 'Pending' || s.inspection_status === 'Sent for Inspection')
      .map(s => s.serial_number);
    
    if (pendingSerials && pendingSerials.length > 0) {
      handleBulkStatusUpdate(item.grn_id, item.po_item_id, pendingSerials, 'Accepted', item.inspection_type);
    }
  };

  const handleRevertStatus = (grnId, poItemId, serialNumber, inspectionType) => {
    handleBulkStatusUpdate(grnId, poItemId, [serialNumber], 'Pending', inspectionType);
  };

  const handleConsolidatedUpload = async (file, grnId, poItemId, type) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append(type === 'Accepted' ? 'accepted_doc' : 'rejected_doc', file);
      formData.append('grn_id', grnId);
      formData.append('po_item_id', poItemId);
      formData.append('inspection_type', 'Outsource');
      formData.append('remarks', `Consolidated ${type} items report uploaded for item`);
      formData.append('results', JSON.stringify([])); // Header update only

      await axios.post("/qc/outsource/submit-results", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      showSuccess(`${type} items report uploaded successfully`);
      fetchMaterials(selectedRootCardId);
    } catch (error) {
      console.error("Error uploading consolidated document:", error);
      showError("Failed to upload report");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeQC = async (grnId) => {
    try {
      setLoading(true);
      await axios.post(`/qc/grn/${grnId}/finalize`);
      showSuccess("QC Finalized successfully");
      fetchMaterials(selectedRootCardId);
      fetchReadyRootCards(); // Refresh the dropdown list as well
    } catch (error) {
      console.error("Error finalizing QC:", error);
      showError(error.response?.data?.message || "Failed to finalize QC");
    } finally {
      setLoading(false);
    }
  };

  const rootCardOptions = rootCards.map(rc => ({
    value: rc.id,
    label: rc.projectName
  }));

  return (
    <div className="space-y-2 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardCheck className="text-blue-600" size={24} />
            Material Inspection
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Select a project to inspect its incoming materials
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <div className="max-w-2xl">
          <SearchableSelect
            label="Filter by Root Card (Project)"
            options={rootCardOptions}
            value={selectedRootCardId}
            onChange={handleRootCardChange}
            placeholder="Search and select a root card..."
            className="w-full"
            disabled={loadingRC}
          />
        </div>
      </div>

      <div className="w-full">
        {/* Materials List */}
        <div className="w-full">
          {!selectedRootCard ? (
            <div className="w-full min-h-[400px] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-12 text-center">
              <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center mb-4">
                <Layers size={40} className="text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Project Selected</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto text-sm">
                Select a project from the dropdown above to view its materials pending quality inspection.
              </p>
            </div>
          ) : loading ? (
            <div className="h-full min-h-[400px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Loading Materials...</p>
              </div>
            </div>
          ) : materials.length === 0 ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-200 p-12 text-center">
              <Package size={48} className="text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Materials Found</h3>
              <p className="text-slate-500">All materials for this project have been inspected.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    <Package size={16} className="text-blue-600" />
                    Pending Materials for {selectedRootCard.projectName}
                  </h3>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {materials.length} Items
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/30 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <tr>
                        <th className="p-2">ITEM NAME / GROUP</th>
                        <th className="p-2">REFERENCE</th>
                        <th className="p-2 text-center">ORDERED</th>
                        <th className="p-2 text-center">INVOICE</th>
                        <th className="p-2 text-center">RECEIVED QTY</th>
                        <th className="p-2 text-center">SHORTAGE</th>
                        <th className="p-2 text-center">OVERAGE</th>
                        <th className="p-2 text-right">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {materials.map((item, idx) => {
                        const isExpanded = expandedItem === idx;
                        return (
                          <React.Fragment key={idx}>
                            <tr 
                              className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/20' : ''}`}
                              onClick={() => setExpandedItem(isExpanded ? null : idx)}
                            >
                              <td className="p-2">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isExpanded ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                    <Package size={20} />
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{item.material_name}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{item.item_group}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-2">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <FileText size={12} className="text-slate-400" />
                                    <span className="text-xs font-bold text-slate-700">{item.grn_number}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Tag size={12} className="text-slate-400" />
                                    <span className="text-[10px] font-medium text-slate-500">PO: {item.po_number}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-2 text-center text-xs font-bold text-slate-500">{item.ordered_qty}</td>
                              <td className="p-2 text-center text-xs font-bold text-slate-500">{item.invoice_quantity || item.received_qty}</td>
                              <td className="p-2 text-center">
                                <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded text-xs font-black">
                                  {item.received_qty}
                                </span>
                              </td>
                              <td className="p-2 text-center text-xs font-bold text-orange-500">{item.rejected_quantity || 0}</td>
                              <td className="p-2 text-center text-xs font-bold text-blue-500">{item.overage || 0}</td>
                              <td className="p-2 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${
                                    item.status === 'QC COMPLETED' 
                                      ? 'bg-green-50 text-green-600 border-green-100' 
                                      : 'bg-purple-50 text-purple-600 border-purple-100'
                                  }`}>
                                    {item.status || 'QC PENDING'}
                                  </span>
                                  {isExpanded ? <ChevronUp size={16} className="text-blue-600" /> : <ChevronDown size={16} className="text-slate-400" />}
                                </div>
                              </td>
                            </tr>
                            
                            {isExpanded && (
                              <tr className="bg-slate-50/50">
                                <td colSpan="8" className="px-12 py-6">
                                  <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-200">
                                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                                      <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <Tag size={12} /> Material Tags (ST Numbers)
                                      </h5>
                                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                                        {item.serials?.length || 0} Units Tracked
                                      </span>
                                    </div>
                                    
                                    {item.serials && item.serials.length > 0 ? (
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                          <thead className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                            <tr>
                                              <th className="p-2 w-12 text-center">#</th>
                                              <th className="p-2">Item Code</th>
                                              <th className="p-2">Name</th>
                                              <th className="p-2">ST Code</th>
                                              <th className="p-2">Status</th>
                                              <th className="p-2 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                  Action
                                                  {item.serials?.some(s => s.inspection_status === 'Pending' || s.inspection_status === 'Sent for Inspection') && (
                                                    <button 
                                                      onClick={(e) => { e.stopPropagation(); handleApproveAll(item); }}
                                                      className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-600 text-white rounded text-[8px] font-black uppercase tracking-tighter hover:bg-blue-700 transition-colors shadow-sm"
                                                      title="Approve All Pending"
                                                    >
                                                      <CheckCheck size={10} /> Approve All
                                                    </button>
                                                  )}
                                                </div>
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-50">
                                            {item.serials.map((s, sIdx) => (
                                              <React.Fragment key={sIdx}>
                                                <tr className="hover:bg-slate-50/50 transition-colors">
                                                  <td className="p-2 text-[11px] font-medium text-slate-400 text-center">
                                                    {sIdx + 1}
                                                  </td>
                                                  <td className="p-2 text-[11px] font-bold text-slate-700">
                                                    {s.item_code || s.serial_number.replace('ST-', '')}
                                                  </td>
                                                  <td className="p-2 text-[11px] text-slate-600">
                                                    {item.material_name}
                                                  </td>
                                                  <td className="p-2 text-[11px] font-bold text-blue-600">
                                                    {s.serial_number}
                                                  </td>
                                                  <td className="p-2">
                                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                                      s.inspection_status === 'Accepted' ? 'bg-green-100 text-green-700' :
                                                      s.inspection_status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                                      s.inspection_status === 'Sent for Inspection' ? 'bg-blue-100 text-blue-700' :
                                                      'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                      {s.inspection_status}
                                                    </span>
                                                  </td>
                                                  <td className="p-2">
                                                  <div className="flex items-center justify-center gap-2">
                                                    {/* Unified Document Viewer for Consolidated Reports */}
                                                    {(() => {
                                                      let docPath = s.document_path; // Individual doc if exists
                                                      
                                                      // If it's outsource, prefer the consolidated reports based on ST status
                                                      if (item.inspection_type === 'Outsource') {
                                                        if (s.inspection_status === 'Accepted' && item.common_document_path) {
                                                          docPath = item.common_document_path;
                                                        } else if (s.inspection_status === 'Rejected' && item.rejected_document_path) {
                                                          docPath = item.rejected_document_path;
                                                        }
                                                      }

                                                      if (docPath) {
                                                        return (
                                                          <button 
                                                            onClick={(e) => { e.stopPropagation(); window.open(`${new URL(axios.defaults.baseURL).origin}/uploads/${docPath}`, '_blank'); }}
                                                            className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                            title="View Quality Report"
                                                          >
                                                            <Eye size={14} />
                                                          </button>
                                                        );
                                                      }
                                                      return null;
                                                    })()}

                                                    {(s.inspection_status === 'Pending' || s.inspection_status === 'Sent for Inspection') && (
                                                      <>
                                                        <button 
                                                          onClick={(e) => { e.stopPropagation(); handleQuickStatusUpdate(item.grn_id, item.po_item_id, s.serial_number, 'Accepted', item.inspection_type); }}
                                                          className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-600 hover:text-white transition-all shadow-sm group/btn"
                                                          title="Accept"
                                                        >
                                                          <CheckCircle size={14} className="group-hover/btn:scale-110 transition-transform" />
                                                        </button>
                                                        <button 
                                                          onClick={(e) => { e.stopPropagation(); handleQuickStatusUpdate(item.grn_id, item.po_item_id, s.serial_number, 'Rejected', item.inspection_type); }}
                                                          className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-600 hover:text-white transition-all shadow-sm group/btn"
                                                          title="Reject"
                                                        >
                                                          <XCircle size={14} className="group-hover/btn:scale-110 transition-transform" />
                                                        </button>
                                                      </>
                                                    )}
                                                    {(s.inspection_status === 'Accepted' || s.inspection_status === 'Rejected') && (
                                                      <button 
                                                        onClick={(e) => { e.stopPropagation(); handleRevertStatus(item.grn_id, item.po_item_id, s.serial_number, item.inspection_type); }}
                                                        className="p-1.5 bg-slate-50 text-slate-500 rounded hover:bg-slate-500 hover:text-white transition-all shadow-sm group/btn"
                                                        title="Revert to Pending"
                                                      >
                                                        <RotateCcw size={14} className="group-hover/btn:rotate-[-180deg] transition-transform duration-500" />
                                                      </button>
                                                    )}
                                                  </div>
                                                </td>
                                              </tr>
                                              {s.inspection_status === 'Rejected' && s.rejection_reason && (
                                                <tr className="bg-red-50/30">
                                                  <td colSpan="6" className="px-8 py-2">
                                                    <div className="flex items-start gap-2 text-[10px] text-red-600 font-bold">
                                                      <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                                                      <div className="flex flex-col gap-0.5">
                                                        <span className="uppercase tracking-widest text-[8px] opacity-70">Rejection Reason:</span>
                                                        <p className="italic font-medium">{s.rejection_reason}</p>
                                                      </div>
                                                    </div>
                                                  </td>
                                                </tr>
                                              )}
                                            </React.Fragment>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                    ) : (
                                      <div className="p-8 text-center">
                                        <Hash size={24} className="text-slate-300 mx-auto mb-2" />
                                        <p className="text-xs text-slate-500 italic">No ST numbers generated for this item</p>
                                      </div>
                                    )}
                                    
                                    <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                                      <div className="flex-1">
                                        {item.inspection_type === 'Outsource' ? (
                                          <div className="flex items-center gap-6">
                                            {(() => {
                                              const allProcessed = item.serials?.every(s => s.inspection_status === 'Accepted' || s.inspection_status === 'Rejected');
                                              const hasAccepted = item.serials?.some(s => s.inspection_status === 'Accepted');
                                              const hasRejected = item.serials?.some(s => s.inspection_status === 'Rejected');
                                              
                                              if (!allProcessed) {
                                                return (
                                                  <div className="flex items-center gap-2 text-amber-500 bg-amber-50 p-2 rounded-xl border border-amber-100">
                                                    <Clock size={14} className="animate-spin-slow" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">
                                                      Processing: {item.serials?.filter(s => s.inspection_status === 'Accepted' || s.inspection_status === 'Rejected').length} / {item.serials?.length} ST Numbers Done
                                                    </span>
                                                  </div>
                                                );
                                              }

                                              return (
                                                <div className="flex flex-col gap-2">
                                                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                    <FileText size={14} className="text-blue-500" /> 
                                                    Required Quality Reports (Outsource)
                                                  </p>
                                                  
                                                  <div className="flex items-center gap-4">
                                                    {/* Accepted Items Document */}
                                                    {hasAccepted && (
                                                      <div className={`flex items-center h-10 px-4 rounded-xl border transition-all ${item.common_document_path ? 'bg-green-50 border-green-200' : 'bg-white border-blue-200 border-dashed hover:border-blue-400'}`}>
                                                        {item.common_document_path ? (
                                                          <button 
                                                            onClick={() => window.open(`${new URL(axios.defaults.baseURL).origin}/uploads/${item.common_document_path}`, '_blank')}
                                                            className="flex items-center gap-2 text-[10px] font-black text-green-700 uppercase"
                                                          >
                                                            <CheckCircle size={14} /> Accepted Items Report
                                                            <Eye size={14} className="ml-1 opacity-60" />
                                                          </button>
                                                        ) : (
                                                          <label className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase cursor-pointer">
                                                            <Upload size={14} /> Upload Accepted Report
                                                            <input 
                                                              type="file" 
                                                              className="hidden" 
                                                              onChange={(e) => handleConsolidatedUpload(e.target.files[0], item.grn_id, item.po_item_id, 'Accepted')} 
                                                            />
                                                          </label>
                                                        )}
                                                      </div>
                                                    )}

                                                    {/* Rejected Items Document */}
                                                    {hasRejected && (
                                                      <div className={`flex items-center h-10 px-4 rounded-xl border transition-all ${item.rejected_document_path ? 'bg-red-50 border-red-200' : 'bg-white border-red-200 border-dashed hover:border-red-400'}`}>
                                                        {item.rejected_document_path ? (
                                                          <button 
                                                            onClick={() => window.open(`${new URL(axios.defaults.baseURL).origin}/uploads/${item.rejected_document_path}`, '_blank')}
                                                            className="flex items-center gap-2 text-[10px] font-black text-red-700 uppercase"
                                                          >
                                                            <XCircle size={14} /> Rejected Items Report
                                                            <Eye size={14} className="ml-1 opacity-60" />
                                                          </button>
                                                        ) : (
                                                          <label className="flex items-center gap-2 text-[10px] font-black text-red-600 uppercase cursor-pointer">
                                                            <Upload size={14} /> Upload Rejected Report
                                                            <input 
                                                              type="file" 
                                                              className="hidden" 
                                                              onChange={(e) => handleConsolidatedUpload(e.target.files[0], item.grn_id, item.po_item_id, 'Rejected')} 
                                                            />
                                                          </label>
                                                        )}
                                                      </div>
                                                    )}

                                                    {/* Missing Reports Indicator */}
                                                    {((hasAccepted && !item.common_document_path) || (hasRejected && !item.rejected_document_path)) && (
                                                      <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded text-[9px] font-black uppercase border border-amber-200 animate-pulse">
                                                        <AlertTriangle size={12} /> Upload Required
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            })()}
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2 text-slate-400 italic">
                                            <CheckCircle size={14} />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Inhouse inspection - No documents required</span>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {(() => {
                                        const allProcessed = item.serials?.every(s => s.inspection_status === 'Accepted' || s.inspection_status === 'Rejected');
                                        const needsAcceptedDoc = item.serials?.some(s => s.inspection_status === 'Accepted') && !item.common_document_path;
                                        const needsRejectedDoc = item.serials?.some(s => s.inspection_status === 'Rejected') && !item.rejected_document_path;
                                        const isOutsource = item.inspection_type === 'Outsource';
                                        
                                        const isFullyDone = allProcessed && (!isOutsource || (!needsAcceptedDoc && !needsRejectedDoc));

                                        if (isFullyDone) {
                                          if (item.grn_status === 'qc_completed') {
                                            return (
                                              <div className="flex items-center gap-2 p-2 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-200">
                                                <CheckCircle size={14} />
                                                QC COMPLETED
                                              </div>
                                            );
                                          }
                                          return (
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleFinalizeQC(item.grn_id);
                                              }}
                                              className="flex items-center gap-2 p-2 bg-green-600 text-white rounded-xl text-xs font-black shadow-lg shadow-green-200 hover:bg-green-700 transition-all"
                                            >
                                              <CheckCircle size={14} />
                                              FINALIZE QC
                                            </button>
                                          );
                                        }

                                        return (
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (isOutsource && (needsAcceptedDoc || needsRejectedDoc)) {
                                                showError("Please upload all required quality reports first");
                                                return;
                                              }
                                              navigate(`/department/quality/inspection/${item.grn_id}`);
                                            }}
                                            className={`p-2 rounded-xl text-xs font-black shadow-lg transition-all flex items-center gap-2 ${
                                              (isOutsource && (needsAcceptedDoc || needsRejectedDoc)) ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'
                                            }`}
                                          >
                                            <ClipboardCheck size={14} />
                                            {allProcessed ? 'FINALIZE QC' : 'RECORD QC RESULT'}
                                          </button>
                                        );
                                      })()}
                                    </div>
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
          )}
        </div>
      </div>

      {/* Rejection Reason Modal */}
      {rejectionModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center text-red-600">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Rejection Reason</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{rejectionModal.serialNumber}</p>
                </div>
              </div>
              <button 
                onClick={() => setRejectionModal({ ...rejectionModal, isOpen: false })}
                className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm text-slate-400 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <MessageSquare size={12} /> Reason for Rejection
                </label>
                <textarea
                  value={rejectionModal.reason}
                  onChange={(e) => setRejectionModal({ ...rejectionModal, reason: e.target.value })}
                  placeholder="Enter the specific reason why this unit is being rejected..."
                  className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all resize-none dark:text-white"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setRejectionModal({ ...rejectionModal, isOpen: false })}
                  className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={submitRejection}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-200 dark:shadow-none transition-all"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialInspectionPage;
