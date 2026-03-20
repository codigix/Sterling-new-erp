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
  Eye
} from "lucide-react";
import { showSuccess, showError } from "../../utils/toastUtils";
import SearchableSelect from "../../components/ui/SearchableSelect";
import { useNavigate, useSearchParams } from "react-router-dom";

const UploadModal = ({ isOpen, onClose, onUpload, title, description }) => {
  const [file, setFile] = useState(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Upload size={18} className="text-blue-600" />
            {title}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400">
            <XCircle size={20} />
          </button>
        </div>
        <div className="p-8 text-center">
          <div className={`p-8 rounded-3xl border-2 border-dashed mb-6 transition-all ${file ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200 hover:border-blue-200'}`}>
            <label className="flex flex-col items-center justify-center gap-4 cursor-pointer">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm ${file ? 'bg-green-600 text-white' : 'bg-white text-slate-400'}`}>
                <Upload size={32} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 mb-1">
                  {file ? file.name : 'Click to select document'}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{description}</p>
              </div>
              <input type="file" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
            </label>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
              Cancel
            </button>
            <button 
              onClick={() => { if (file) { onUpload(file); setFile(null); onClose(); } }}
              disabled={!file}
              className={`flex-1 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${file ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              Upload & Process
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // { grnId, serialNumber, status, type: 'single' | 'common' }

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

  const fetchMaterials = async (rootCardId) => {
    try {
      setLoading(true);
      const response = await axios.get("/qc/portal/materials-for-inspection", {
        params: { rootCardId }
      });
      setMaterials(response.data);
    } catch (error) {
      console.error("Error fetching materials:", error);
      showError("Failed to load materials for inspection");
    } finally {
      setLoading(false);
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

  const handleQuickStatusUpdate = async (grnId, serialNumber, status, inspectionType) => {
    // If it's outsource and rejected, we need a document
    if (inspectionType === 'Outsource' && status === 'Rejected') {
      setPendingAction({ grnId, serialNumber, status, type: 'single' });
      setShowUploadModal(true);
      return;
    }

    try {
      setLoading(true);
      await axios.post("/qc/inspection/submit", {
        grn_id: grnId,
        inspection_type: inspectionType || "Inhouse",
        results: [
          {
            serial_number: serialNumber,
            status: status,
            notes: `Quick ${status} from material inspection list`
          }
        ],
        remarks: `ST ${serialNumber} marked as ${status}`
      });
      showSuccess(`ST ${serialNumber} marked as ${status}`);
      fetchMaterials(selectedRootCardId);
    } catch (error) {
      console.error("Error updating status:", error);
      showError(`Failed to update status for ${serialNumber}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!pendingAction) return;
    const { grnId, serialNumber, status } = pendingAction;
    
    try {
      setLoading(true);
      // Simulating file upload paths since we don't have a real multipart handler here
      const dummyPath = `uploads/qc_${status}_${serialNumber || 'common'}.pdf`;
      
      const payload = {
        grn_id: grnId,
        inspection_type: 'Outsource',
        results: serialNumber ? [
          {
            serial_number: serialNumber,
            status: status,
            notes: `Quick ${status} with document`,
            document_path: dummyPath
          }
        ] : [],
        remarks: `ST ${serialNumber || 'Bulk'} marked as ${status} with document`
      };

      if (!serialNumber && status === 'Accepted') {
        payload.common_document_path = dummyPath;
        // For common doc, we might need to find all accepted but missing doc serials
        // But for quick action, let's keep it simple and just record the header result
      }

      await axios.post("/qc/outsource/submit-results", payload);
      showSuccess(`${serialNumber ? 'ST ' + serialNumber : 'GRN'} processed successfully with document`);
      fetchMaterials(selectedRootCardId);
    } catch (error) {
      console.error("Error uploading document:", error);
      showError("Failed to process with document");
    } finally {
      setLoading(false);
      setPendingAction(null);
    }
  };

  const handleCommonAcceptedDoc = (grnId) => {
    setPendingAction({ grnId, status: 'Accepted', type: 'common' });
    setShowUploadModal(true);
  };

  const rootCardOptions = rootCards.map(rc => ({
    value: rc.id,
    label: rc.projectName
  }));

  return (
    <div className="space-y-6 p-6">
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
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 flex items-center justify-between">
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
                        <th className="px-6 py-4">ITEM NAME / GROUP</th>
                        <th className="px-6 py-4">REFERENCE</th>
                        <th className="px-6 py-4 text-center">ORDERED</th>
                        <th className="px-6 py-4 text-center">INVOICE</th>
                        <th className="px-6 py-4 text-center">RECEIVED QTY</th>
                        <th className="px-6 py-4 text-center">SHORTAGE</th>
                        <th className="px-6 py-4 text-center">OVERAGE</th>
                        <th className="px-6 py-4 text-right">STATUS</th>
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
                              <td className="px-6 py-4">
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
                              <td className="px-6 py-4">
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
                              <td className="px-6 py-4 text-center text-xs font-bold text-slate-500">{item.ordered_qty}</td>
                              <td className="px-6 py-4 text-center text-xs font-bold text-slate-500">{item.invoice_quantity || item.received_qty}</td>
                              <td className="px-6 py-4 text-center">
                                <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-black">
                                  {item.received_qty}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center text-xs font-bold text-orange-500">{item.rejected_quantity || 0}</td>
                              <td className="px-6 py-4 text-center text-xs font-bold text-blue-500">{item.overage || 0}</td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <span className="px-2 py-1 rounded text-[9px] font-black bg-purple-50 text-purple-600 uppercase tracking-widest border border-purple-100">
                                    QC PENDING
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
                                              <th className="px-4 py-2 w-12 text-center">#</th>
                                              <th className="px-4 py-2">Item Code</th>
                                              <th className="px-4 py-2">Name</th>
                                              <th className="px-4 py-2">ST Code</th>
                                              <th className="px-4 py-2">Status</th>
                                              <th className="px-4 py-2 text-center">Action</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-50">
                                            {item.serials.map((s, sIdx) => (
                                              <tr key={sIdx} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-2 text-[11px] font-medium text-slate-400 text-center">
                                                  {sIdx + 1}
                                                </td>
                                                <td className="px-4 py-2 text-[11px] font-bold text-slate-700">
                                                  {s.serial_number.replace('ST-', '')}
                                                </td>
                                                <td className="px-4 py-2 text-[11px] text-slate-600">
                                                  {item.material_name}
                                                </td>
                                                <td className="px-4 py-2 text-[11px] font-bold text-blue-600">
                                                  {s.serial_number}
                                                </td>
                                                <td className="px-4 py-2">
                                                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                                    s.inspection_status === 'Accepted' ? 'bg-green-100 text-green-700' :
                                                    s.inspection_status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                                    s.inspection_status === 'Sent for Inspection' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                                  }`}>
                                                    {s.inspection_status}
                                                  </span>
                                                </td>
                                                <td className="px-4 py-2">
                                                  <div className="flex items-center justify-center gap-2">
                                                    {s.document_path && (
                                                      <button 
                                                        onClick={(e) => { e.stopPropagation(); window.open(`${axios.defaults.baseURL.replace('/api', '')}/${s.document_path}`, '_blank'); }}
                                                        className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                        title="View Document"
                                                      >
                                                        <Eye size={14} />
                                                      </button>
                                                    )}
                                                    {(s.inspection_status === 'Pending' || s.inspection_status === 'Sent for Inspection') && (
                                                      <>
                                                        <button 
                                                          onClick={(e) => { e.stopPropagation(); handleQuickStatusUpdate(item.grn_id, s.serial_number, 'Accepted', item.inspection_type); }}
                                                          className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all shadow-sm group/btn"
                                                          title="Accept"
                                                        >
                                                          <CheckCircle size={14} className="group-hover/btn:scale-110 transition-transform" />
                                                        </button>
                                                        <button 
                                                          onClick={(e) => { e.stopPropagation(); handleQuickStatusUpdate(item.grn_id, s.serial_number, 'Rejected', item.inspection_type); }}
                                                          className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm group/btn"
                                                          title="Reject"
                                                        >
                                                          <XCircle size={14} className="group-hover/btn:scale-110 transition-transform" />
                                                        </button>
                                                      </>
                                                    )}
                                                  </div>
                                                </td>
                                              </tr>
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
                                    
                                    <div className="p-4 bg-blue-50/30 border-t border-slate-100 flex items-center justify-between">
                                      <div className="flex items-center gap-4">
                                        <div>
                                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Vendor</p>
                                          <p className="text-xs font-bold text-slate-800">{item.vendor_name}</p>
                                        </div>
                                        <div className="w-px h-8 bg-slate-200"></div>
                                        <div>
                                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Receipt Date</p>
                                          <p className="text-xs font-bold text-slate-800">{new Date(item.posting_date).toLocaleDateString()}</p>
                                        </div>
                                        {item.inspection_type === 'Outsource' && (
                                          <>
                                            <div className="w-px h-8 bg-slate-200"></div>
                                            <div className="flex items-center gap-3">
                                              <div className="flex flex-col">
                                                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Outsource Flow</p>
                                                <div className="flex items-center gap-2">
                                                  {item.serials?.some(s => s.inspection_status === 'Accepted') && !item.common_document_path && (
                                                    <button 
                                                      onClick={() => handleCommonAcceptedDoc(item.grn_id)}
                                                      className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-tight"
                                                    >
                                                      <Upload size={10} /> Upload Common Doc
                                                    </button>
                                                  )}
                                                  {item.common_document_path && (
                                                    <button 
                                                      onClick={() => window.open(`${axios.defaults.baseURL.replace('/api', '')}/${item.common_document_path}`, '_blank')}
                                                      className="flex items-center gap-1.5 text-[10px] font-black text-green-600 hover:text-green-700 uppercase tracking-tight"
                                                    >
                                                      <Eye size={10} /> View Common Doc
                                                    </button>
                                                  )}
                                                </div>
                                              </div>
                                              {item.serials?.some(s => s.inspection_status === 'Accepted') && !item.common_document_path && (
                                                <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[9px] font-black uppercase border border-amber-100 animate-pulse">
                                                  <AlertTriangle size={10} /> Doc Required
                                                </div>
                                              )}
                                            </div>
                                          </>
                                        )}
                                      </div>
                                      
                                      <button 
                                        onClick={() => navigate(`/department/quality/inspection/${item.grn_id}`)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
                                      >
                                        <ClipboardCheck size={14} />
                                        RECORD QC RESULT
                                      </button>
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

      <UploadModal 
        isOpen={showUploadModal}
        onClose={() => { setShowUploadModal(false); setPendingAction(null); }}
        onUpload={handleFileUpload}
        title={pendingAction?.type === 'common' ? 'Upload Common Document' : `Upload Document for ST: ${pendingAction?.serialNumber}`}
        description={pendingAction?.type === 'common' ? 'One common document for all accepted ST numbers in this GRN' : `Required document for rejected ST: ${pendingAction?.serialNumber}`}
      />
    </div>
  );
};

export default MaterialInspectionPage;
