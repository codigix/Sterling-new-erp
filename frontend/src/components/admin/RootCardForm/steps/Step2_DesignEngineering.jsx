import React, { useState, useCallback, useEffect } from "react";
import { FileText, Eye, Loader2, CheckCircle2, AlertCircle, FileCode, Box, Download, ClipboardCheck, Send } from "lucide-react";
import FormSection from "../shared/FormSection";
import { useRootCardContext } from "../hooks";
import axios from "../../../../utils/api";
import { getServerUrl, downloadFile } from "../../../../utils/fileUtils";
import { showSuccess, showError } from "../../../../utils/toastUtils";
import DataTable from "../../../ui/DataTable/DataTable";

export default function Step2_DesignEngineering({ readOnly = false }) {
  const { state, updateField, initialData } = useRootCardContext();
  const rootCardId = initialData?.id || state.createdOrderId;
  const status = state?.formData?.status || initialData?.status;
  
  const [drawings, setDrawings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchApprovedDrawings = useCallback(async () => {
    if (!rootCardId) return;
    try {
      setLoading(true);
      const response = await axios.get(`/design-drawings/root-card/${rootCardId}`);
      const allDocs = response.data.drawings || response.data.documents || [];
      
      // Group by name and type to get latest version
      const latestVersions = allDocs.reduce((acc, doc) => {
        const key = `${doc.name}-${doc.type}`;
        if (!acc[key] || doc.version > acc[key].version) {
          acc[key] = doc;
        }
        return acc;
      }, {});

      // Filter for approved only
      const approved = Object.values(latestVersions).filter(doc => doc.status === "Approved");
      setDrawings(approved);
    } catch (error) {
      console.error("Error fetching approved drawings:", error);
    } finally {
      setLoading(false);
    }
  }, [rootCardId]);

  useEffect(() => {
    fetchApprovedDrawings();
  }, [fetchApprovedDrawings]);

  const handleSendToQuality = async () => {
    if (drawings.length === 0) {
      showError("Please ensure drawings are uploaded and approved before sending to Quality");
      return;
    }

    try {
      setSending(true);
      await axios.post(`/root-cards/${rootCardId}/send-to-quality`);
      updateField("status", "QUALITY_QAP_PENDING");
      showSuccess("Root card sent to Quality for QAP upload");
    } catch (error) {
      console.error("Error sending to Quality:", error);
      showError(error.response?.data?.message || "Failed to send to Quality");
    } finally {
      setSending(false);
    }
  };

  const handleSendToProduction = async () => {
    try {
      setSending(true);
      await axios.post(`/root-cards/${rootCardId}/send-to-production`);
      updateField("status", "BOM_PREPARATION");
      showSuccess("Root card sent to Production for BOM Preparation");
    } catch (error) {
      console.error("Error sending to Production:", error);
      showError(error.response?.data?.message || "Failed to send to Production");
    } finally {
      setSending(false);
    }
  };

  const getFileUrl = (filePath) => {
    return getServerUrl(filePath);
  };

  const drawingColumns = [
    {
      key: "name",
      label: "Drawing Name",
      render: (val, row) => (
        <div>
          <div className="text-slate-900">{val}</div>
          <div className="text-xs text-slate-500 truncate max-w-xs">{row.description}</div>
        </div>
      )
    },
    {
      key: "type",
      label: "Type",
      render: (val) => (
        <span className="text-xs  text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{val}</span>
      )
    },
    {
      key: "version",
      label: "Version",
      align: "center",
      render: (val) => <span className="text-xs text-blue-600">v{val}</span>
    },
    {
      key: "status",
      label: "Status",
      align: "center",
      render: (val) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs tracking-wider bg-green-100 text-green-700">
          <CheckCircle2 size={10} /> {val}
        </span>
      )
    },
    {
      key: "actions",
      label: "Action",
      align: "right",
      render: (_, doc) => (
        <div className="flex items-center justify-end gap-2">
          {doc.dwg_path && (
            <button
              onClick={() => downloadFile(doc.dwg_path, `${doc.name}.dwg`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-blue-700 hover:bg-blue-50 text-xs rounded transition-colors border border-blue-100"
              title="Download DWG File"
            >
              <Eye size={14} /> DWG
            </button>
          )}
          {doc.step_path && (
            <button
              onClick={() => downloadFile(doc.step_path, `${doc.name}.step`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-orange-700 hover:bg-orange-50 text-xs rounded transition-colors border border-orange-100"
              title="Download STEP File"
            >
              <Eye size={14} /> STEP
            </button>
          )}
          <a
            href={getFileUrl(doc.file_path)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs rounded transition-colors border border-blue-100"
          >
            <Eye size={14} /> View
          </a>
        </div>
      )
    }
  ];

  const content = React.useMemo(() => (
    <div className="space-y-4">
      {/* Action Section */}
      {!readOnly && (
        <div className="flex justify-end gap-3 mb-2">
          {status === 'DESIGN_IN_PROGRESS' && drawings.length > 0 && (
            <button
              onClick={handleSendToQuality}
              disabled={sending}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white hover:bg-amber-700 rounded-xl text-sm  transition-all disabled:opacity-50"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Send to Quality (QAP)
            </button>
          )}
          {/* {status === 'DESIGN_QAP_REVIEW' && (
            <button
              onClick={handleSendToProduction}
              disabled={sending}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-sm  transition-all disabled:opacity-50"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Approve & Send to Production
            </button>
          )} */}
        </div>
      )}

      {/* QAP Section for Review */}
      {(state.formData?.qualityCheck?.qap_path || (state.formData?.qualityCheck?.qap_files && state.formData.qualityCheck.qap_files.length > 0)) && (
        <FormSection
          title="Project QAP / ATP"
          subtitle="Quality Assurance Plan uploaded by Quality Department"
          icon={ClipboardCheck}
        >
          <div className="space-y-3">
            {state.formData.qualityCheck.qap_files && state.formData.qualityCheck.qap_files.length > 0 ? (
              state.formData.qualityCheck.qap_files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200">
                      <FileText className="text-indigo-500" size={16} />
                    </div>
                    <div>
                      <p className="text-sm  text-slate-700 dark:text-slate-300">
                        {file.original_name || file.path.split('-').slice(2).join('-') || 'Project_QAP.pdf'}
                      </p>
                      <p className="text-xs text-slate-400">
                        Uploaded by Quality Department
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a 
                      href={getServerUrl(file.path)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 text-blue-600 hover:bg-blue-50 text-xs rounded transition-colors border border-blue-100"
                    >
                      <Eye size={14} /> View
                    </a>
                    <button
                      onClick={() => downloadFile(file.path, file.original_name || 'Project_QAP.pdf')}
                      className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 text-xs rounded transition-colors"
                    >
                      <Download size={14} /> Download
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200">
                    <FileText className="text-indigo-500" size={16} />
                  </div>
                  <div>
                    <p className="text-sm  text-slate-700 dark:text-slate-300">
                      {state.formData.qualityCheck.qap_path.split('-').slice(2).join('-') || 'Project_QAP.pdf'}
                    </p>
                    <p className="text-xs text-slate-400">
                      Uploaded by Quality Department
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a 
                    href={getServerUrl(state.formData.qualityCheck.qap_path)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 text-blue-600 hover:bg-blue-50 text-xs rounded transition-colors border border-blue-100"
                  >
                    <Eye size={14} /> View
                  </a>
                  <button
                    onClick={() => downloadFile(state.formData.qualityCheck.qap_path, 'Project_QAP.pdf')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 text-xs rounded transition-colors"
                  >
                    <Download size={14} /> Download
                  </button>
                </div>
              </div>
            )}
          </div>
        </FormSection>
      )}

      <FormSection
        title="Approved Design Drawings"
        subtitle="View and access approved design revisions for this root card"
        icon={FileText}
      >
        <DataTable
          columns={drawingColumns}
          data={drawings}
          loading={loading}
          emptyMessage={rootCardId ? "No approved drawings found for this root card" : "Root card ID not found"}
        />
        
        {drawings.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded flex items-start gap-3">
            <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={15} />
            <p className="text-sm text-blue-900">
              Only approved drawings are shown here. These are the final revisions that should be used for production.
            </p>
          </div>
        )}
      </FormSection>
    </div>
  ), [
    state.formData, 
    state.employees, 
    readOnly, 
    loading, 
    drawings, 
    rootCardId,
    updateField
  ]);

  return content;
}
