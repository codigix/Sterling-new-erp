import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '@/utils/api';
import { showSuccess, showError } from '@/utils/toastUtils';
import { getServerUrl } from '@/utils/fileUtils';
import { 
  Upload, 
  Loader2, 
  Search, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Eye,
  Filter,
  Send,
  Download,
  X
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card, { CardContent } from '@/components/ui/Card';
import SearchableSelect from '@/components/ui/SearchableSelect';
import Modal, { ModalBody } from '@/components/ui/Modal';

const QualityQAPPage = () => {
  const navigate = useNavigate();
  const [rootCards, setRootCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedRootCardId, setSelectedRootCardId] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedRow, setSelectedRow] = useState(null);
  const [viewModalData, setViewModalData] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchRootCards = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/root-cards', {
          params: { includeSteps: true }
        });
        // Filter cards that are pending QAP or have been sent for review
        const relevant = (response.data.rootCards || []).filter(rc => 
          rc.status === 'QUALITY_QAP_PENDING' || rc.status === 'DESIGN_QAP_REVIEW'
        );
        setRootCards(relevant);
      } catch (error) {
        console.error('Error fetching root cards:', error);
        showError("Failed to load pending root cards");
      } finally {
        setLoading(false);
      }
    };

    fetchRootCards();
  }, [refreshTrigger]);

  const rootCardOptions = useMemo(() => {
    return rootCards.map(rc => ({
      value: rc.id,
      label: `${rc.project_name} (${rc.project_code})`,
      subLabel: `PO: ${rc.po_number || 'N/A'}`
    }));
  }, [rootCards]);

  const filteredCards = useMemo(() => {
    if (!selectedRootCardId) return rootCards;
    return rootCards.filter(rc => String(rc.id) === String(selectedRootCardId));
  }, [rootCards, selectedRootCardId]);

  const onUploadQAPClick = (rc) => {
    setSelectedRow(rc);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleViewClick = (rc) => {
    const qapFiles = rc.steps?.quality?.qap_files || [];
    const legacyPath = rc.steps?.quality?.qap_path;
    const drawings = rc.steps?.design_engineering?.approved_drawings || [];

    setViewModalData({
      rc,
      qapFiles,
      legacyPath,
      drawings
    });
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0 || !selectedRow) return;

    const formData = new FormData();
    files.forEach(file => {
      formData.append("qap", file);
    });

    try {
      setUploading(true);
      await axios.post(`/root-cards/${selectedRow.id}/upload-qap`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      showSuccess(`${files.length} QAP file(s) uploaded successfully`);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Error uploading QAP:", error);
      showError(error.response?.data?.message || "Failed to upload QAP");
    } finally {
      setUploading(false);
      setSelectedRow(null);
      e.target.value = null;
    }
  };

  const handleSendToDesign = async (rc) => {
    try {
      setUploading(true);
      await axios.post(`/root-cards/${rc.id}/return-to-design-engineering`);
      showSuccess("Root card sent to Design Engineer for Production hand-off");
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Error sending to design:", error);
      showError(error.response?.data?.message || "Failed to send to Design Engineer");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full space-y-6 p-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">QAP Uploads</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage Quality Assurance Plans for pending root cards
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-end bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex-1 w-full max-w-md">
          <SearchableSelect
            label="Select Root Card"
            placeholder="Search and select root card..."
            options={rootCardOptions}
            value={selectedRootCardId}
            onChange={setSelectedRootCardId}
            className="w-full"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 text-sm whitespace-nowrap">
            <Filter size={16} />
            <span>All Projects</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 text-sm whitespace-nowrap">
            <span>Status: All Active</span>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Project / Root Card</th>
                <th className="px-6 py-4">PO No.</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <p className="text-slate-500 font-medium">Loading pending cards...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredCards.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-500 italic">
                    {selectedRootCardId ? "No matching root card found" : "No root cards pending QAP upload"}
                  </td>
                </tr>
              ) : (
                filteredCards.map((rc) => {
                  const qapFiles = rc.steps?.quality?.qap_files || [];
                  const isPending = rc.status === 'QUALITY_QAP_PENDING';
                  const hasFiles = qapFiles.length > 0 || !!rc.steps?.quality?.qap_path;

                  return (
                    <tr key={rc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => handleViewClick(rc)}
                          className="text-blue-600 hover:text-blue-700 font-medium hover:underline text-left group flex flex-col"
                        >
                          <span className="text-sm">{rc.project_name}</span>
                          <span className="text-[10px] text-slate-400 font-normal mt-0.5 group-hover:text-blue-400">{rc.project_code}</span>
                        </button>
                        
                        {/* Show Uploaded QAP Files Summary */}
                        {qapFiles.length > 0 && (
                          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-indigo-600 font-medium bg-indigo-50/50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-full w-fit border border-indigo-100/50 dark:border-indigo-800/50">
                            <FileText size={10} />
                            <span>{qapFiles.length} QAP files uploaded</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {rc.po_number || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                            <AlertCircle size={12} />
                            QAP Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800">
                            <CheckCircle size={12} />
                            Sent to Design Engineer
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewClick(rc)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="View Documents"
                          >
                            <Eye size={18} />
                          </button>
                          
                          {isPending && (
                            <>
                              <button
                                onClick={() => onUploadQAPClick(rc)}
                                disabled={uploading}
                                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-medium transition-all shadow-sm shadow-emerald-200"
                              >
                                <Upload size={14} />
                                {hasFiles ? 'Upload More' : 'Upload QAP'}
                              </button>

                              {hasFiles && (
                                <button
                                  onClick={() => handleSendToDesign(rc)}
                                  disabled={uploading}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-medium transition-all shadow-sm shadow-blue-200"
                                >
                                  <Send size={14} className="rotate-[-15deg]" />
                                  Send to Design Engineer
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Documents Modal */}
      {viewModalData && (
        <Modal
          isOpen={!!viewModalData}
          onClose={() => setViewModalData(null)}
          title={`Documents for ${viewModalData.rc.project_name}`}
          size="lg"
        >
          <ModalBody className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {/* QAP Files Section */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="text-indigo-600 dark:text-indigo-400" size={16} />
                    Quality Assurance Plans (QAP)
                  </h4>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    {viewModalData.qapFiles.length + (viewModalData.legacyPath ? 1 : 0)} Files
                  </span>
                </div>
                
                <div className="space-y-1">
                  {viewModalData.qapFiles.length > 0 ? (
                    viewModalData.qapFiles.map((f, idx) => (
                      <div key={idx} className="group flex items-center justify-between p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-all">
                        <div className="flex items-center gap-3">
                          <FileText size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                          <div className="flex flex-col">
                            <span className="text-sm text-slate-700 dark:text-slate-200 truncate max-w-[400px]">
                              {f.original_name || f.path.split('-').slice(2).join('-')}
                            </span>
                            <span className="text-[10px] text-slate-400">Uploaded on {new Date(f.uploaded_at || Date.now()).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 transition-all">
                          <a 
                            href={getServerUrl(f.path)} 
                            target="_blank" 
                            rel="noreferrer"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-all"
                            title="View"
                          >
                            <Eye size={16} />
                          </a>
                        </div>
                      </div>
                    ))
                  ) : viewModalData.legacyPath ? (
                    <div className="group flex items-center justify-between p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-all">
                      <div className="flex items-center gap-3">
                        <FileText size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-700 dark:text-slate-200">
                            {viewModalData.legacyPath.split('-').slice(2).join('-')}
                          </span>
                          <span className="text-[10px] text-slate-400">Main QAP Document</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 transition-all">
                        <a 
                          href={getServerUrl(viewModalData.legacyPath)} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-all"
                          title="View"
                        >
                          <Eye size={16} />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-2 text-center">No QAP files uploaded yet.</p>
                  )}
                </div>
              </div>

              {/* Design Drawings Section */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="text-emerald-600 dark:text-emerald-400" size={16} />
                    Approved Design Drawings
                  </h4>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    {viewModalData.drawings.length} Files
                  </span>
                </div>

                <div className="space-y-1">
                  {viewModalData.drawings.length > 0 ? (
                    viewModalData.drawings.map((d, idx) => (
                      <div key={idx} className="group flex items-center justify-between p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-all">
                        <div className="flex items-center gap-3">
                          <FileText size={16} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                          <div className="flex flex-col">
                            <span className="text-sm text-slate-700 dark:text-slate-200 truncate max-w-[400px]">
                              {d.name}
                            </span>
                            <span className="text-[10px] text-slate-400">Engineering Approved</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 transition-all">
                          <a 
                            href={getServerUrl(d.file_path)} 
                            target="_blank" 
                            rel="noreferrer"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded transition-all"
                            title="View"
                          >
                            <Eye size={16} />
                          </a>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic py-2 text-center">No approved drawings available.</p>
                  )}
                </div>
              </div>
            </div>
          </ModalBody>
        </Modal>
      )}

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept=".pdf,.doc,.docx,.xls,.xlsx"
        multiple
      />

      {/* Uploading Overlay */}
      {uploading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 max-w-sm w-full">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-100 dark:border-slate-700 rounded-full"></div>
              <Loader2 className="w-16 h-16 animate-spin text-blue-600 absolute top-0 left-0" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900 dark:text-white">Uploading QAP</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Please wait while we process and secure your document...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityQAPPage;
