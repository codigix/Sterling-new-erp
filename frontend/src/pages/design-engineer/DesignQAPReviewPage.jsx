import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '@/utils/api';
import { showSuccess, showError } from '@/utils/toastUtils';
import { getServerUrl } from '@/utils/fileUtils';
import { 
  Loader2, 
  Search, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Eye,
  Filter,
  Send,
  Download
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card, { CardContent } from '@/components/ui/Card';
import SearchableSelect from '@/components/ui/SearchableSelect';
import Modal, { ModalBody } from '@/components/ui/Modal';
import Swal from 'sweetalert2';

const DesignQAPReviewPage = () => {
  const navigate = useNavigate();
  const [rootCards, setRootCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedRootCardId, setSelectedRootCardId] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [viewModalData, setViewModalData] = useState(null);

  useEffect(() => {
    const fetchRootCards = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/root-cards', {
          params: { includeSteps: true }
        });
        // Filter cards that are in QAP review status or further
        const relevant = (response.data.rootCards || []).filter(rc => 
          rc.status === 'DESIGN_QAP_REVIEW' || 
          rc.status === 'BOM_PREPARATION' || 
          rc.status === 'RC_PRODUCTION_READY' ||
          rc.status === 'RC_IN_PRODUCTION'
        );
        setRootCards(relevant);
      } catch (error) {
        console.error('Error fetching root cards:', error);
        showError("Failed to load root cards for QAP review");
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

  const handleSendToProduction = async (rc) => {
    try {
      const result = await Swal.fire({
        title: 'Send to Production?',
        text: `Are you sure you want to send "${rc.project_name}" to Production?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Yes, Send to Production',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        setActionLoading(true);
        await axios.post(`/root-cards/${rc.id}/send-to-production`);
        showSuccess("Root card sent to Production successfully");
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (error) {
      console.error("Error sending to production:", error);
      showError(error.response?.data?.message || "Failed to send to Production");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6 p-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">QAP Review & Hand-off</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Review uploaded QAPs and send root cards to Production
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
            <span>Status: QAP Review</span>
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
                      <p className="text-slate-500 font-medium">Loading root cards...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredCards.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-500 italic">
                    {selectedRootCardId ? "No matching root card found" : "No root cards pending QAP review"}
                  </td>
                </tr>
              ) : (
                filteredCards.map((rc) => {
                  const qapFiles = rc.steps?.quality?.qap_files || [];
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
                        {hasFiles && (
                          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-indigo-600 font-medium bg-indigo-50/50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-full w-fit border border-indigo-100/50 dark:border-indigo-800/50">
                            <FileText size={10} />
                            <span>{qapFiles.length || 1} QAP files available</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {rc.po_number || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {rc.status === 'DESIGN_QAP_REVIEW' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                            <AlertCircle size={12} />
                            Ready for Production
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                            <CheckCircle size={12} />
                            Sent to Production
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
                          
                          {rc.status === 'DESIGN_QAP_REVIEW' && (
                            <button
                              onClick={() => handleSendToProduction(rc)}
                              disabled={actionLoading}
                              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-medium transition-all shadow-sm shadow-emerald-200"
                            >
                              <Send size={14} />
                              Send to Production
                            </button>
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
                            <span className="text-[10px] text-slate-400">Uploaded by Quality</span>
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
                    Your Approved Design Drawings
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
                            <span className="text-[10px] text-slate-400">Version {d.version} Approved</span>
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

      {/* Loading Overlay */}
      {actionLoading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 max-w-sm w-full">
            <Loader2 className="w-16 h-16 animate-spin text-blue-600" />
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900 dark:text-white">Processing Approval</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Updating status and notifying production...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesignQAPReviewPage;
