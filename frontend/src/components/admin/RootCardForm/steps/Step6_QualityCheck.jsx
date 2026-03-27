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
  Info 
} from "lucide-react";
import axios from "../../../../utils/api";
import { useFormData, useRootCardContext } from "../hooks";

export default function Step6_QualityCheck({ readOnly = false }) {
  const { formData } = useFormData();
  const { state } = useRootCardContext();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedReport, setExpandedReport] = useState(null);
  const [expandedMaterials, setExpandedMaterials] = useState({});

  // Get ID from either formData or state.initialData
  const rootCardId = formData?.id || state?.initialData?.id;

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Loading Reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <FileText className="text-emerald-600" size={24} />
            Quality Inspection Reports
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs font-bold uppercase tracking-widest">
            History of all finalized quality inspections for this root card
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-12 text-center">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
              <FileText size={40} />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase">No Reports Found</h3>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Create a final report from the material inspection portal</p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <div 
              key={report.id}
              className={`bg-white dark:bg-slate-800 rounded-2xl border transition-all overflow-hidden shadow-sm ${
                expandedReport === report.id ? 'border-emerald-500 ring-4 ring-emerald-500/5' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300'
              }`}
            >
              <div 
                className="p-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer"
                onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${expandedReport === report.id ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                    <CheckCircle size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{report.grn_number}</h4>
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded text-[8px] font-black uppercase tracking-widest">{report.inspection_type}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span className="flex items-center gap-1"><User size={12} /> {report.vendor_name}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span className="flex items-center gap-1"><Package size={12} /> {report.project_name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Report Date</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 justify-end">
                      <Calendar size={12} /> {new Date(report.report_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.is_sent_to_inventory ? (
                      <div className="p-2 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-slate-200">
                        <CheckCircle size={14} className="text-green-500" />
                        Sent to Inventory
                      </div>
                    ) : (
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-amber-100">
                        Pending Transfer
                      </div>
                    )}
                    <button 
                      className="p-2.5 bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-emerald-600 rounded-xl transition-all"
                      title="Download PDF"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download size={18} />
                    </button>
                    {expandedReport === report.id ? <ChevronUp size={20} className="text-emerald-600" /> : <ChevronDown size={20} className="text-slate-400" />}
                  </div>
                </div>
              </div>

              {expandedReport === report.id && (
                <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/30 p-6 animate-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-1 gap-4">
                    <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Package size={14} /> Material Inspection Details
                    </h5>
                    
                    <div className="overflow-hidden border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 shadow-sm">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          <tr>
                            <th className="px-6 py-3">Material Info</th>
                            <th className="px-4 py-3 text-center">Received</th>
                            <th className="px-4 py-3 text-center">Result</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {report.materials?.map((m, mIdx) => {
                            const materialKey = `${report.id}-${mIdx}`;
                            const isMatExpanded = expandedMaterials[materialKey];
                            
                            return (
                              <React.Fragment key={mIdx}>
                                <tr 
                                  className={`text-[11px] font-bold text-slate-700 dark:text-slate-300 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 cursor-pointer transition-colors ${isMatExpanded ? 'bg-emerald-50/20' : ''}`}
                                  onClick={() => toggleMaterial(report.id, mIdx)}
                                >
                                  <td className="p-2">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 ${isMatExpanded ? 'bg-emerald-100 text-emerald-600' : ''}`}>
                                        <Package size={12} />
                                      </div>
                                      <div>
                                        <p className="font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
                                          {m.material_name}
                                          {m.st_numbers?.length > 0 && (
                                            isMatExpanded ? <ChevronUp size={12} className="text-emerald-600" /> : <ChevronDown size={12} className="text-slate-400" />
                                          )}
                                        </p>
                                        <p className="text-[9px] text-slate-400 uppercase tracking-tighter flex items-center gap-2">
                                          <Hash size={10} /> {m.item_code || 'N/A'} • {m.item_group}
                                        </p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 text-center">{m.received_qty} {m.unit}</td>
                                  <td className="px-4 py-4">
                                    <div className="flex items-center justify-center gap-2">
                                      <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded border border-green-100 flex items-center gap-1 font-black uppercase text-[9px]">
                                        <CheckCircle size={10} /> {m.accepted_qty} Accepted
                                      </span>
                                      {m.rejected_qty > 0 && (
                                        <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded border border-red-100 flex items-center gap-1 font-black uppercase text-[9px]">
                                          <AlertTriangle size={10} /> {m.rejected_qty} Rejected
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                                
                                {m.st_numbers?.length > 0 && isMatExpanded && (
                                  <tr className="animate-in fade-in slide-in-from-top-1 duration-200">
                                    <td colSpan="3" className="px-8 py-4 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                                      <div className="flex items-center gap-2 mb-3">
                                        <Info size={12} className="text-emerald-600" />
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">ST Number status for {m.material_name}</span>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {m.st_numbers.map((st, stIdx) => (
                                          <div 
                                            key={stIdx}
                                            className={`p-3 rounded-xl border bg-white dark:bg-slate-900 shadow-sm transition-all hover:shadow-md flex flex-col gap-2 ${
                                              st.status === 'ACCEPTED' 
                                                ? 'border-green-100 dark:border-green-900/30' 
                                                : 'border-red-100 dark:border-red-900/30'
                                            }`}
                                          >
                                            <div className="flex items-center justify-between">
                                              <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
                                                <Hash size={12} className="text-slate-400" /> {st.st_code}
                                              </span>
                                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
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
          ))
        )}
      </div>
    </div>
  );
}
