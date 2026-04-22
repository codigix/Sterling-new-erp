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
  X,
  RefreshCw
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card, { CardContent } from '@/components/ui/Card';
import SearchableSelect from '@/components/ui/SearchableSelect';
import Modal, { ModalBody } from '@/components/ui/Modal';
import DataTable from '@/components/ui/DataTable/DataTable';

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
        // Show all root cards as requested by user
        setRootCards(response.data.rootCards || []);
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

  const columns = [
    {
      header: "Project / Root Card",
      accessor: "project_name",
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="text-xs  text-slate-900">{val}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] ">{row.root_card_number}</span>
            <span className="text-[10px] text-slate-400">{row.project_code}</span>
          </div>
        </div>
      )
    },
    {
      header: "PO Number",
      accessor: "po_number",
      render: (val) => <span className="text-xs text-slate-600 ">{val || 'N/A'}</span>
    },
    {
      header: "Status",
      accessor: "status",
      render: (status) => {
        const statusConfig = {
          'QUALITY_QAP_PENDING': { label: 'QAP PENDING', classes: 'bg-amber-50 text-amber-600 border-amber-100' },
          'DESIGN_QAP_REVIEW': { label: 'UNDER REVIEW', classes: 'bg-blue-50 text-blue-600 border-blue-100' },
          'PRODUCTION_PLANNING': { label: 'PRODUCTION READY', classes: 'bg-emerald-50 text-emerald-600 border-emerald-100' }
        };
        const config = statusConfig[status] || { label: status?.replace(/_/g, ' ') || 'UNKNOWN', classes: 'bg-slate-50 text-slate-600 border-slate-100' };
        
        return (
          <span className={`px-2 py-0.5 rounded text-[10px]  border ${config.classes}`}>
            {config.label}
          </span>
        );
      }
    },
    {
      header: "QAP Files",
      accessor: "id",
      className: "text-center",
      render: (_, rc) => {
        const qapFiles = rc.steps?.quality?.qap_files || [];
        const hasLegacy = !!rc.steps?.quality?.qap_path;
        const total = qapFiles.length + (hasLegacy ? 1 : 0);
        
        return (
          <div className="flex flex-col items-center">
            <span className={`text-[10px]  ${total > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
              {total > 0 ? `${total} File(s)` : 'None'}
            </span>
            {total > 0 && <FileText size={12} className="text-blue-400 mt-0.5" />}
          </div>
        );
      }
    },
    {
      header: "Actions",
      accessor: "id",
      className: "text-right",
      render: (_, rc) => {
        const qapFiles = rc.steps?.quality?.qap_files || [];
        const isPending = rc.status === 'QUALITY_QAP_PENDING';
        const hasFiles = qapFiles.length > 0 || !!rc.steps?.quality?.qap_path;
        
        return (
          <div className="flex items-center justify-end gap-2">
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => handleViewClick(rc)}
              className="text-blue-600 hover:bg-blue-50 p-1.5 h-auto"
            >
              <Eye size={16} />
            </Button>

            {isPending ? (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => onUploadQAPClick(rc)}
                className="flex items-center gap-1.5 text-xs py-1 h-auto"
              >
                <Upload size={14} />
                {hasFiles ? 'Upload More' : 'Upload QAP'}
              </Button>
            ) : (
              <div className="flex items-center gap-1 text-emerald-600 text-[10px]  bg-emerald-50 px-2 py-1 rounded">
                <CheckCircle size={12} />
                READY
              </div>
            )}

            {hasFiles && isPending && (
              <Button 
                size="sm" 
                onClick={() => handleSendToDesign(rc)}
                className="flex items-center gap-1.5 text-xs py-1 h-auto bg-blue-600 hover:bg-blue-700"
                disabled={uploading}
              >
                <Send size={14} />
                Finalize
              </Button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="w-full space-y-4 p-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl  text-slate-900 dark:text-white flex items-center gap-2">
            QAP Management
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Manage Quality Assurance Plans for pending root cards
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setRefreshTrigger(prev => prev + 1)}
          className="text-slate-500"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        multiple 
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.xls,.xlsx"
      />

      

      <DataTable 
        columns={columns}
        data={rootCards.filter(rc => !selectedRootCardId || String(rc.id) === String(selectedRootCardId))}
        loading={loading}
        searchPlaceholder="Search project, root card or PO..."
      />

      {/* View Modal */}
      {viewModalData && (
        <Modal 
          isOpen={!!viewModalData} 
          onClose={() => setViewModalData(null)}
          title="QAP & Drawings Overview"
          size="lg"
        >
          <ModalBody>
            <div className="space-y-6">
              {/* Project Info */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800">
                <h4 className="text-xs  text-slate-900 dark:text-white uppercase tracking-wider mb-2">Project Details</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-slate-500">Project Name</p>
                    <p className=" text-slate-700 dark:text-slate-300">{viewModalData.rc.project_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Root Card No.</p>
                    <p className=" text-slate-700 dark:text-slate-300">{viewModalData.rc.root_card_number}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* QAP Files */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs  text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <FileText size={14} className="text-blue-600" />
                      QAP Documents
                    </h4>
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full ">
                      {viewModalData.qapFiles.length + (viewModalData.legacyPath ? 1 : 0)} Files
                    </span>
                  </div>
                  
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {viewModalData.legacyPath && (
                      <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded shadow-sm">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText size={14} className="text-slate-400 shrink-0" />
                          <span className="text-xs text-slate-600 dark:text-slate-400 truncate">Legacy QAP Document</span>
                        </div>
                        <a 
                          href={getServerUrl(viewModalData.legacyPath)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Download size={14} />
                        </a>
                      </div>
                    )}
                    
                    {viewModalData.qapFiles.length > 0 ? (
                      viewModalData.qapFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded shadow-sm">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <FileText size={14} className="text-slate-400 shrink-0" />
                            <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{file.name || `QAP File ${idx + 1}`}</span>
                          </div>
                          <a 
                            href={getServerUrl(file.path)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Download size={14} />
                          </a>
                        </div>
                      ))
                    ) : !viewModalData.legacyPath && (
                      <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded border border-dashed border-slate-200">
                        <AlertCircle size={20} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-[10px] text-slate-500">No QAP files uploaded yet</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Approved Drawings */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs  text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Eye size={14} className="text-emerald-600" />
                      Approved Drawings
                    </h4>
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full ">
                      {viewModalData.drawings.length} Files
                    </span>
                  </div>
                  
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {viewModalData.drawings.length > 0 ? (
                      viewModalData.drawings.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded shadow-sm">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Eye size={14} className="text-slate-400 shrink-0" />
                            <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{file.name || `Drawing ${idx + 1}`}</span>
                          </div>
                          <a 
                            href={getServerUrl(file.path)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          >
                            <Download size={14} />
                          </a>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded border border-dashed border-slate-200">
                        <AlertCircle size={20} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-[10px] text-slate-500">No approved drawings available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-end">
              <Button onClick={() => setViewModalData(null)} variant="secondary" size="sm">
                Close Overview
              </Button>
            </div>
          </ModalBody>
        </Modal>
      )}
    </div>
  );
};

export default QualityQAPPage;
