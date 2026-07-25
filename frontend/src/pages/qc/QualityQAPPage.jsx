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
  const [uploadType, setUploadType] = useState("qap");
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchRootCards = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/root-cards', {
          params: { includeSteps: true }
        });
        // Show all active root cards (excluding pre-quality statuses)
        const cards = response.data.rootCards || [];
        const preQualityStatuses = ['RC_CREATED', 'pending', 'DESIGN_IN_PROGRESS'];
        setRootCards(cards.filter(rc => rc.status && !preQualityStatuses.includes(rc.status)));
      } catch (error) {
        console.error('Error fetching root cards:', error);
        showError("Failed to load pending route cards");
      } finally {
        setLoading(false);
      }
    };

    fetchRootCards();
  }, [refreshTrigger]);

  const rootCardOptions = useMemo(() => {
    return rootCards.map(rc => ({
      value: rc.public_id || rc.id,
      label: `${rc.project_name} (${rc.project_code})`,
      subLabel: `PO: ${rc.po_number || 'N/A'}`
    }));
  }, [rootCards]);

  const onUploadQAPClick = (rc) => {
    setSelectedRow(rc);
    setUploadType("qap");
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const onUploadATPClick = (rc) => {
    setSelectedRow(rc);
    setUploadType("atp");
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleViewClick = (rc) => {
    const qapFiles = rc.steps?.quality?.qap_files || [];
    const legacyPath = rc.steps?.quality?.qap_path;
    const atpFiles = rc.steps?.quality?.atp_files || [];
    const legacyAtpPath = rc.steps?.quality?.atp_path;
    const drawings = rc.steps?.design_engineering?.approved_drawings || [];

    setViewModalData({
      rc,
      qapFiles,
      legacyPath,
      atpFiles,
      legacyAtpPath,
      drawings
    });
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0 || !selectedRow) return;

    const formData = new FormData();
    files.forEach(file => {
      formData.append(uploadType, file);
    });

    try {
      setUploading(true);
      const rootCardIdForApi = selectedRow.public_id || selectedRow.id;
      const endpoint = uploadType === 'qap'
        ? `/root-cards/${rootCardIdForApi}/upload-qap`
        : `/root-cards/${rootCardIdForApi}/upload-atp`;

      await axios.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      showSuccess(`${files.length} ${uploadType.toUpperCase()} file(s) uploaded successfully`);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error(`Error uploading ${uploadType.toUpperCase()}:`, error);
      showError(error.response?.data?.message || `Failed to upload ${uploadType.toUpperCase()}`);
    } finally {
      setUploading(false);
      setSelectedRow(null);
      e.target.value = null;
    }
  };

  const handleSendToDesign = async (rc) => {
    try {
      setUploading(true);
      const rootCardIdForApi = rc.public_id || rc.id;
      await axios.post(`/root-cards/${rootCardIdForApi}/return-to-design-engineering`);
      showSuccess("Route card sent to Design Engineer for Production hand-off");
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
      header: "Project / Route Card",
      accessor: "project_name",
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="text-xs  text-slate-900">{val}</span>
          <div className="flex items-center gap-2 mt-0.5">
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
      render: (status, row) => {
        const qapFiles = row.steps?.quality?.qap_files || [];
        const hasFiles = qapFiles.length > 0 || !!row.steps?.quality?.qap_path;
        
        let label = 'WAITING FOR DESIGN';
        let classes = 'bg-slate-50 text-slate-400 border-slate-100';

        // QAP Specific Workflow Statuses
        if (status === 'QUALITY_QAP_PENDING') {
          if (hasFiles) {
            label = 'UPLOADED - PENDING FINALIZE';
            classes = 'bg-blue-50 text-blue-600 border-blue-200';
          } else {
            label = 'QAP PENDING';
            classes = 'bg-amber-50 text-amber-600 border-amber-200';
          }
        } else if (status === 'DESIGN_QAP_REVIEW') {
          label = 'AWAITING DESIGN REVIEW';
          classes = 'bg-purple-50 text-purple-600 border-purple-200';
        } else if (['BOM_PREPARATION', 'PRODUCTION_PLANNING', 'PARTIALLY_RELEASED', 'MATERIAL_RELEASED', 'MATERIAL_PLANNING', 'PURCHASE_ORDER_RELEASED', 'PROCUREMENT_IN_PROGRESS', 'MATERIAL_RECEIVED', 'MATERIAL_QC_PENDING', 'MATERIAL_QC_APPROVED', 'PRODUCTION_IN_PROGRESS', 'DIMENSIONAL_QC_PENDING', 'DIMENSIONAL_QC_APPROVED', 'PAINTING_IN_PROGRESS', 'FINAL_QC_PENDING', 'FINAL_QC_APPROVED', 'READY_FOR_DELIVERY', 'Redy for Dispatch'].includes(status)) {
          label = 'APPROVED & FINALIZED';
          classes = 'bg-emerald-50 text-emerald-600 border-emerald-200';
        } else if (status === 'DESIGN_IN_PROGRESS' || status === 'RC_CREATED') {
          label = 'DESIGN IN PROGRESS';
          classes = 'bg-slate-50 text-slate-500 border-slate-200';
        }

        return (
          <span className={`px-2 py-1 rounded text-[10px] font-medium border ${classes}`}>
            {label}
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
        const legacyPath = rc.steps?.quality?.qap_path;
        
        // Filter out legacy if it's already in the qap_files array to avoid duplicates
        const isLegacyDuplicate = qapFiles.some(f => f.path === legacyPath);
        const showLegacyCount = legacyPath && !isLegacyDuplicate ? 1 : 0;
        
        const total = qapFiles.length + showLegacyCount;
        
        return (
          <div className="flex flex-col items-center">
            <span className={`text-[10px] font-medium ${total > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
              {total > 0 ? `${total} File(s)` : 'None'}
            </span>
            {total > 0 && <FileText size={12} className="text-blue-400 mt-0.5" />}
          </div>
        );
      }
    },
    {
      header: "ATP Files",
      accessor: "id",
      className: "text-center",
      render: (_, rc) => {
        const atpFiles = rc.steps?.quality?.atp_files || [];
        const legacyPath = rc.steps?.quality?.atp_path;
        
        const isLegacyDuplicate = atpFiles.some(f => f.path === legacyPath);
        const showLegacyCount = legacyPath && !isLegacyDuplicate ? 1 : 0;
        
        const total = atpFiles.length + showLegacyCount;
        
        return (
          <div className="flex flex-col items-center">
            <span className={`text-[10px] font-medium ${total > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
              {total > 0 ? `${total} File(s)` : 'None'}
            </span>
            {total > 0 && <FileText size={12} className="text-indigo-400 mt-0.5" />}
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
        const atpFiles = rc.steps?.quality?.atp_files || [];
        const hasAtpFiles = atpFiles.length > 0 || !!rc.steps?.quality?.atp_path;

        const isUploadingThisRow = uploading && selectedRow && (String(selectedRow.id) === String(rc.id) || String(selectedRow.public_id) === String(rc.public_id));
        
        return (
          <div className="flex items-center justify-end gap-2">
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => handleViewClick(rc)}
              className="text-blue-600 hover:bg-blue-50 p-1.5 h-auto"
              title="View Overview"
            >
              <Eye size={16} />
            </Button>

            {isPending ? (
              <>
                {isUploadingThisRow && uploadType === 'qap' ? (
                  <div 
                    style={{ backgroundColor: '#fef3c7' }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-amber-700 border border-amber-200 rounded text-xs h-8"
                  >
                    <Loader2 size={12} className="animate-spin text-amber-700" />
                    <span>Uploading...</span>
                  </div>
                ) : (
                  !hasFiles && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => onUploadQAPClick(rc)}
                      style={{ backgroundColor: '#fef3c7' }}
                      className="flex items-center gap-1.5 text-xs py-1.5 px-3 h-auto text-amber-700 border border-amber-300 font-medium hover:bg-amber-100 transition-colors"
                      disabled={uploading}
                    >
                      <Upload size={14} />
                      Upload QAP
                    </Button>
                  )
                )}

                {hasFiles && (
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => handleSendToDesign(rc)}
                    style={{ backgroundColor: '#d1fae5' }}
                    className="flex items-center gap-1.5 text-xs py-1.5 px-3 h-auto text-emerald-700 border border-emerald-300 font-medium hover:bg-emerald-100 transition-colors"
                    disabled={uploading}
                  >
                    <Send size={14} />
                    Finalize
                  </Button>
                )}
              </>
            ) : (
              <>
                {isUploadingThisRow && uploadType === 'atp' ? (
                  <div 
                    style={{ backgroundColor: '#cffafe' }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-cyan-700 border border-cyan-200 rounded text-xs h-8"
                  >
                    <Loader2 size={12} className="animate-spin text-cyan-700" />
                    <span>Uploading...</span>
                  </div>
                ) : (
                  !hasAtpFiles && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => onUploadATPClick(rc)}
                      style={{ backgroundColor: '#cffafe' }}
                      className="flex items-center gap-1.5 text-xs py-1.5 px-3 h-auto text-cyan-700 border border-cyan-300 font-medium hover:bg-cyan-100 transition-colors"
                      disabled={uploading}
                    >
                      <Upload size={14} />
                      Upload ATP
                    </Button>
                  )
                )}

                <div className="flex items-center gap-1 text-emerald-600 text-[10px]  bg-emerald-50 px-2 py-1 rounded">
                  <CheckCircle size={12} />
                  READY
                </div>
              </>
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
            QAP & ATP Management
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Manage Quality Assurance Plans and Acceptance Test Procedures for pending route cards
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

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full max-w-md">
          <SearchableSelect
            label="Select Route Card"
            placeholder="Search and select route card..."
            options={rootCardOptions}
            value={selectedRootCardId}
            onChange={setSelectedRootCardId}
            className="w-full"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {selectedRootCardId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedRootCardId("")}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              Clear Filter
            </Button>
          )}
          <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-400 text-sm whitespace-nowrap">
            <Filter size={15} />
            <span className='text-xs'>All Route Cards</span>
          </div>
        </div>
      </div>

      <DataTable 
        columns={columns}
        data={rootCards.filter(rc => !selectedRootCardId || String(rc.public_id || rc.id) === String(selectedRootCardId))}
        loading={loading}
        searchPlaceholder="Search project, route card or PO..."
      />

      {/* View Modal */}
      {viewModalData && (
        <Modal 
          isOpen={!!viewModalData} 
          onClose={() => setViewModalData(null)}
          title="QAP, ATP & Drawings Overview"
          size="lg"
        >
          <ModalBody>
            <div className="space-y-6">
              {/* Project Info */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800">
                <h4 className="text-xs  text-slate-900 dark:text-white uppercase tracking-wider mb-2 font-semibold">Project Details</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-slate-500">Project Name</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300">{viewModalData.rc.project_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Project Code</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300">{viewModalData.rc.project_code || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* QAP Files */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs  text-slate-900 dark:text-white font-semibold uppercase tracking-wider flex items-center gap-2">
                      <FileText size={14} className="text-blue-600" />
                      QAP Documents
                    </h4>
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                      {viewModalData.qapFiles.length + (viewModalData.legacyPath && !viewModalData.qapFiles.some(f => f.path === viewModalData.legacyPath) ? 1 : 0)} Files
                    </span>
                  </div>
                  
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {viewModalData.legacyPath && !viewModalData.qapFiles.some(f => f.path === viewModalData.legacyPath) && (
                      <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded shadow-sm group hover:border-blue-200 transition-colors">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded">
                            <FileText size={14} className="text-slate-400 shrink-0" />
                          </div>
                          <span className="text-xs text-slate-600 dark:text-slate-400 truncate font-medium">Legacy QAP Document</span>
                        </div>
                        <a 
                          href={getServerUrl(viewModalData.legacyPath)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
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
                            <span className="text-xs text-slate-600 dark:text-slate-400 truncate font-medium">{file.original_name || file.name || `QAP File ${idx + 1}`}</span>
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

                {/* ATP Files */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs  text-slate-900 dark:text-white font-semibold uppercase tracking-wider flex items-center gap-2">
                      <FileText size={14} className="text-indigo-600" />
                      ATP Documents
                    </h4>
                    <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                      {viewModalData.atpFiles.length + (viewModalData.legacyAtpPath && !viewModalData.atpFiles.some(f => f.path === viewModalData.legacyAtpPath) ? 1 : 0)} Files
                    </span>
                  </div>
                  
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {viewModalData.legacyAtpPath && !viewModalData.atpFiles.some(f => f.path === viewModalData.legacyAtpPath) && (
                      <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded shadow-sm group hover:border-indigo-200 transition-colors">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded">
                            <FileText size={14} className="text-slate-400 shrink-0" />
                          </div>
                          <span className="text-xs text-slate-600 dark:text-slate-400 truncate font-medium">Legacy ATP Document</span>
                        </div>
                        <a 
                          href={getServerUrl(viewModalData.legacyAtpPath)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                        >
                          <Download size={14} />
                        </a>
                      </div>
                    )}
                    
                    {viewModalData.atpFiles.length > 0 ? (
                      viewModalData.atpFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded shadow-sm">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <FileText size={14} className="text-slate-400 shrink-0" />
                            <span className="text-xs text-slate-600 dark:text-slate-400 truncate font-medium">{file.original_name || file.name || `ATP File ${idx + 1}`}</span>
                          </div>
                          <a 
                            href={getServerUrl(file.path)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                          >
                            <Download size={14} />
                          </a>
                        </div>
                      ))
                    ) : !viewModalData.legacyAtpPath && (
                      <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded border border-dashed border-slate-200">
                        <AlertCircle size={20} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-[10px] text-slate-500">No ATP files uploaded yet</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Approved Drawings */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs  text-slate-900 dark:text-white font-semibold uppercase tracking-wider flex items-center gap-2">
                      <Eye size={14} className="text-emerald-600" />
                      Approved Drawings
                    </h4>
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium">
                      {viewModalData.drawings.length} Files
                    </span>
                  </div>
                  
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {viewModalData.drawings.length > 0 ? (
                      viewModalData.drawings.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded shadow-sm">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Eye size={14} className="text-slate-400 shrink-0" />
                            <span className="text-xs text-slate-600 dark:text-slate-400 truncate font-medium">{file.name || `Drawing ${idx + 1}`}</span>
                          </div>
                          <a 
                            href={getServerUrl(file.file_path || file.path)} 
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
