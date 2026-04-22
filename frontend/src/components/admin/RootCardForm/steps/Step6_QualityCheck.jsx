import React, { useCallback, useEffect, useState } from "react";
import { 
  FileText, 
  User, 
  Package, 
  Calendar, 
  ChevronUp, 
  ChevronDown, 
  CheckCircle, 
  AlertTriangle, 
  Hash, 
  Search, 
  Download, 
  Info,
  Upload,
  Loader2,
  FileCode,
  Send,
  Eye
} from "lucide-react";
import axios from "../../../../utils/api";
import { useFormData, useRootCardContext } from "../hooks";
import { showSuccess, showError } from "../../../../utils/toastUtils";
import { getServerUrl, downloadFile } from "../../../../utils/fileUtils";
import DataTable from "../../../ui/DataTable/DataTable";

export default function Step6_QualityCheck() {
  const { formData } = useFormData();
  const { state } = useRootCardContext();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedReport, setExpandedReport] = useState(null);
  const [expandedMaterials, setExpandedMaterials] = useState({});

  // Get ID from either formData or state.initialData
  const rootCardId = formData?.id || state?.initialData?.id;
  const qualityStepData = state?.formData?.qualityCheck || {};

  useEffect(() => {
    const fetchReports = async () => {
      if (!rootCardId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const response = await axios.get("/qc/reports", {
          params: { rootCardId }
        });
        setReports(response.data || []);
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [rootCardId]);

  const toggleMaterial = useCallback((reportId, materialIdx) => {
    const key = `${reportId}-${materialIdx}`;
    setExpandedMaterials(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);

  const filteredReports = reports.filter(r => 
    r.grn_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.vendor_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const materialColumns = [
    {
      key: "material_info",
      label: "Material Info",
      render: (_, m, row, mIdx) => {
        const materialKey = `${expandedReport}-${mIdx}`;
        const isMatExpanded = expandedMaterials[materialKey];
        return (
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleMaterial(expandedReport, mIdx)}>
            <div className={`w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 ${isMatExpanded ? 'bg-emerald-100 text-emerald-600' : ''}`}>
              <Package size={12} />
            </div>
            <div>
              <p className=" text-slate-900 dark:text-white  flex items-center gap-2">
                {m.material_name}
                {m.st_numbers?.length > 0 && (
                  isMatExpanded ? <ChevronUp size={12} className="text-emerald-600" /> : <ChevronDown size={12} className="text-slate-400" />
                )}
              </p>
              <p className="text-xs text-slate-400  er flex items-center gap-2">
                <Hash size={10} /> {m.item_code || 'N/A'} • {m.item_group}
              </p>
            </div>
          </div>
        );
      }
    },
    { key: "received_qty", label: "Received", align: "center", render: (val, m) => `${val} ${m.unit}` },
    {
      key: "result",
      label: "Result",
      align: "center",
      render: (_, m) => (
        <div className="flex items-center justify-center gap-2">
          <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded border border-green-100 flex items-center gap-1">
            <CheckCircle size={10} /> {m.accepted_qty}
          </span>
          {m.rejected_qty > 0 && (
            <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded border border-red-100 flex items-center gap-1">
              <AlertTriangle size={10} /> {m.rejected_qty}
            </span>
          )}
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded  animate-spin"></div>
        <p className="text-slate-500    text-xs">Loading Reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* QAP Upload Section */}
      <div className="bg-white dark:bg-slate-800 rounded  border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
              <FileCode size={20} />
            </div>
            <div>
              <h3 className="text-lg  text-slate-900 dark:text-white">Project QAP / ATP</h3>
              <p className="text-sm text-slate-500">Quality Assurance Plan for this root card</p>
            </div>
          </div>
        </div>

        {qualityStepData.qap_files && qualityStepData.qap_files.length > 0 ? (
          <div className="space-y-3">
            {qualityStepData.qap_files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200">
                    <FileText className="text-indigo-500" size={16} />
                  </div>
                  <div>
                    <p className="text-sm  text-slate-700 dark:text-slate-300">
                      {file.original_name || file.path.split('-').slice(2).join('-') || 'Project_QAP.pdf'}
                    </p>
                    <p className="text-xs text-slate-400">
                      Uploaded on {new Date(file.uploaded_at || qualityStepData.qap_uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a 
                    href={getServerUrl(file.path)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="View Document"
                  >
                    <Eye size={18} />
                  </a>
                  <button
                    onClick={() => downloadFile(file.path, file.original_name || 'Project_QAP.pdf')}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                    title="Download QAP"
                  >
                    <Download size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : qualityStepData.qap_path ? (
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200">
                <FileText className="text-indigo-500" size={16} />
              </div>
              <div>
                <p className="text-sm  text-slate-700 dark:text-slate-300">
                  {qualityStepData.qap_path.split('-').slice(2).join('-') || 'Project_QAP.pdf'}
                </p>
                <p className="text-xs text-slate-400">
                  Uploaded on {new Date(qualityStepData.qap_uploaded_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a 
                href={getServerUrl(qualityStepData.qap_path)}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="View Document"
              >
                <Eye size={18} />
              </a>
              <button
                onClick={() => downloadFile(qualityStepData.qap_path, 'Project_QAP.pdf')}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                title="Download QAP"
              >
                <Download size={18} />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
            <p className="text-sm text-slate-400">No QAP document uploaded yet</p>
          </div>
        )}
      </div>

      {/* Header with Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl  text-slate-900 dark:text-white   flex items-center gap-2">
            <FileText className="text-emerald-600" size={15} />
            Quality Inspection Reports
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs   ">
            History of all finalized quality inspections for this root card
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded  text-xs  text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all "
          />
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-12 text-center">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded  flex items-center justify-center mx-auto mb-4 text-slate-300">
              <FileText size={40} />
            </div>
            <h3 className="text-lg  text-slate-900 dark:text-white ">No Reports Found</h3>
            <p className="text-slate-500 text-xs    mt-2">Create a final report from the material inspection portal</p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <div 
              key={report.id}
              className={`bg-white dark:bg-slate-800 rounded  border transition-all overflow-hidden  ${
                expandedReport === report.id ? 'border-emerald-500 ring-4 ring-emerald-500/5' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300'
              }`}
            >
              <div 
                className="p-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer"
                onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded  flex items-center justify-center transition-colors ${expandedReport === report.id ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                    <CheckCircle size={15} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm  text-slate-900 dark:text-white  ">{report.grn_number}</h4>
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded text-[8px]   ">{report.inspection_type}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs  text-slate-400  ">
                      <span className="flex items-center gap-1"><User size={12} /> {report.vendor_name}</span>
                      <span className="w-1 h-1 rounded  bg-slate-300"></span>
                      <span className="flex items-center gap-1"><Package size={12} /> {report.project_name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs  text-slate-400  ">Report Date</p>
                    <p className="text-xs  text-slate-700 dark:text-slate-300 flex items-center gap-1 justify-end">
                      <Calendar size={12} /> {new Date(report.report_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.is_sent_to_inventory ? (
                      <div className="p-2 bg-slate-100 text-slate-500 rounded text-xs    flex items-center gap-2 border border-slate-200">
                        <CheckCircle size={14} className="text-green-500" />
                        Sent to Inventory
                      </div>
                    ) : (
                      <div className="p-2 bg-amber-50 text-amber-600 rounded text-xs    flex items-center gap-2 border border-amber-100">
                        Pending Transfer
                      </div>
                    )}
                    <button 
                      className="p-2.5 bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-emerald-600 rounded transition-all"
                      title="Download PDF"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download size={15} />
                    </button>
                    {expandedReport === report.id ? <ChevronUp size={20} className="text-emerald-600" /> : <ChevronDown size={20} className="text-slate-400" />}
                  </div>
                </div>
              </div>

              {expandedReport === report.id && (
                <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/30 p-6 animate-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-1 gap-4">
                    <h5 className="text-xs  text-slate-500   mb-2 flex items-center gap-2">
                      <Package size={14} /> Material Inspection Details
                    </h5>
                    
                    <div className="overflow-hidden border border-slate-200 dark:border-slate-700 rounded  bg-white dark:bg-slate-800 ">
                      <DataTable
                        columns={materialColumns}
                        data={report.materials || []}
                        showSearch={false}
                        striped={false}
                        hover={true}
                        renderRowDetail={(m, mIdx) => {
                          const materialKey = `${report.id}-${mIdx}`;
                          const isMatExpanded = expandedMaterials[materialKey];
                          
                          if (m.st_numbers?.length > 0 && isMatExpanded) {
                            return (
                              <tr className="animate-in fade-in slide-in-from-top-1 duration-200">
                                <td colSpan={materialColumns.length} className="px-8 py-4 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Info size={12} className="text-emerald-600" />
                                    <span className="text-xs text-slate-500">ST Number status for {m.material_name}</span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {m.st_numbers.map((st, stIdx) => (
                                      <div 
                                        key={stIdx}
                                        className={`p-3 rounded border bg-white dark:bg-slate-900 transition-all hover: flex flex-col gap-2 ${
                                          st.status === 'ACCEPTED' 
                                            ? 'border-green-100 dark:border-green-900/30' 
                                            : 'border-red-100 dark:border-red-900/30'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-slate-900 dark:text-white flex items-center gap-2">
                                            <Hash size={12} className="text-slate-400" /> {st.st_code}
                                          </span>
                                          <span className={`px-2 py-0.5 rounded text-[8px] ${
                                            st.status === 'ACCEPTED' 
                                              ? 'bg-green-100 text-green-600' 
                                              : 'bg-red-100 text-red-600'
                                          }`}>
                                            {st.status}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            );
                          }
                          return null;
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
