import React, { useState, useCallback, useEffect } from "react";
import { FileText, Eye, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import FormSection from "../shared/FormSection";
import AssigneeField from "../shared/AssigneeField";
import { useRootCardContext } from "../hooks";
import axios from "../../../../utils/api";

export default function Step2_DesignEngineering({ readOnly = false }) {
  const { state, updateField, initialData } = useRootCardContext();
  const rootCardId = initialData?.id || state.createdOrderId;
  
  const [drawings, setDrawings] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const getFileUrl = (filePath) => {
    if (!filePath) return "#";
    const base = axios.defaults.baseURL.split("/api")[0];
    return `${base}/${filePath}`;
  };

  const content = React.useMemo(() => (
    <div className="space-y-6">
      <AssigneeField
        stepType="designEngineering"
        formData={state.formData}
        updateField={updateField}
        employees={state.employees}
        readOnly={readOnly}
      />
      
      <FormSection
        title="Approved Design Drawings"
        subtitle="View and access approved design revisions for this root card"
        icon={FileText}
      >
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Drawing Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Version</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-slate-500">
                    <Loader2 className="animate-spin inline-block mr-2" /> Loading approved drawings...
                  </td>
                </tr>
              ) : drawings.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-slate-500">
                    {rootCardId ? "No approved drawings found for this root card" : "Root card ID not found"}
                  </td>
                </tr>
              ) : (
                drawings.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-bold text-slate-900">{doc.name}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{doc.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">{doc.type}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-bold text-blue-600">v{doc.version}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700">
                        <CheckCircle2 size={10} /> {doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a
                        href={getFileUrl(doc.file_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-bold rounded-lg transition-colors border border-blue-100"
                      >
                        <Eye size={14} /> View Drawing
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {drawings.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
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
