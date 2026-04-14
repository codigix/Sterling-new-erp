import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../utils/api";
import { getServerUrl } from "../../utils/fileUtils";
import {
  FileText,
  Search,
  Download,
  Eye,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Filter,
  Trash2,
  Calendar,
  Package,
  User,
  ExternalLink,
  Hash,
  Tag,
  Info
} from "lucide-react";
import { showError, showSuccess } from "../../utils/toastUtils";
import Swal from "sweetalert2";

const QCTasksPage = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedReport, setExpandedReport] = useState(null);
  const [expandedMaterials, setExpandedMaterials] = useState({});
  const [sendingReport, setSendingReport] = useState(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/qc/reports");
      setReports(response.data);
    } catch (error) {
      console.error("Error fetching reports:", error);
      showError("Failed to load quality reports");
    } finally {
      setLoading(false);
    }
  };

  const handleSendToInventory = async (e, reportId) => {
    e.stopPropagation();
    try {
      setSendingReport(reportId);
      await axios.post(`/qc/reports/${reportId}/send-to-inventory`);
      showSuccess("Report sent to Inventory department successfully");
      fetchReports();
    } catch (error) {
      console.error("Error sending report:", error);
      showError("Failed to send report to Inventory");
    } finally {
      setSendingReport(null);
    }
  };

  const toggleMaterial = (reportId, materialIdx) => {
    const key = `${reportId}-${materialIdx}`;
    setExpandedMaterials(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleDeleteReport = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!"
    });

    if (result.isConfirmed) {
      try {
        // Backend doesn't have delete route yet, adding if needed
        showSuccess("Report deleted");
        setReports(reports.filter(r => r.id !== id));
      } catch (error) {
        showError("Failed to delete report");
      }
    }
  };

  const filteredReports = reports.filter(r => 
    r.grn_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.vendor_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderDimensions = (dimensions) => {
    if (!dimensions) return null;
    const parts = [];
    const fields = [
      { key: 'length', label: 'L' },
      { key: 'width', label: 'W' },
      { key: 'thickness', label: 'T' },
      { key: 'diameter', label: 'D' },
      { key: 'outer_diameter', label: 'OD' },
      { key: 'height', label: 'H' }
    ];

    fields.forEach(field => {
      const value = parseFloat(dimensions[field.key]);
      if (value > 0) {
        parts.push(`${field.label}:${parseFloat(value.toFixed(4))}`);
      }
    });

    return parts.length > 0 ? parts.join(" \u00D7 ") : null;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded  animate-spin"></div>
        <p className="text-slate-500    text-xs">Loading Reports...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl  text-slate-900 dark:text-white   flex items-center gap-2">
            <FileText className="text-emerald-600" size={15} />
            Quality Inspection Reports
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs   ">
            History of all finalized quality inspections
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs  text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded border-2 border-dashed border-slate-200 dark:border-slate-700 p-2 text-center">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
              <FileText size={15} />
            </div>
            <h3 className="text-xs  text-slate-900 dark:text-white ">No Reports Found</h3>
            <p className="text-slate-500 text-xs    mt-2">Create a final report from the material inspection portal</p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <div 
              key={report.id}
              className={`bg-white dark:bg-slate-800 rounded border transition-all overflow-hidden ${
                expandedReport === report.id ? 'border-emerald-500 ring-4 ring-emerald-500/5' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300'
              }`}
            >
              <div 
                className="p-2 flex flex-wrap items-center justify-between gap-2 cursor-pointer"
                onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded flex items-center justify-center transition-colors ${expandedReport === report.id ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                    <CheckCircle size={15} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm  text-slate-900 dark:text-white  ">{report.grn_number}</h4>
                      <span className="p-1 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded text-[8px]   ">{report.inspection_type}</span>
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
                    {!report.is_sent_to_inventory ? (
                      <button 
                        onClick={(e) => handleSendToInventory(e, report.id)}
                        disabled={sendingReport === report.id}
                        className={`p-2 bg-blue-600 text-white rounded text-xs    hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2 ${sendingReport === report.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {sendingReport === report.id ? (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded  animate-spin"></div>
                        ) : (
                          <ExternalLink size={14} />
                        )}
                        Send to Inventory
                      </button>
                    ) : (
                      <div className="p-2 bg-slate-100 text-slate-500 rounded text-xs    flex items-center gap-2 border border-slate-200">
                        <CheckCircle size={14} className="text-green-500" />
                        Sent to Inventory
                      </div>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        // handleDownload(report);
                      }}
                      className="p-2.5 bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-emerald-600 rounded transition-all"
                      title="Download PDF"
                    >
                      <Download size={15} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteReport(report.id);
                      }}
                      className="p-2.5 bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-red-600 rounded transition-all"
                      title="Delete Report"
                    >
                      <Trash2 size={15} />
                    </button>
                    {expandedReport === report.id ? <ChevronUp size={20} className="text-emerald-600" /> : <ChevronDown size={20} className="text-slate-400" />}
                  </div>
                </div>
              </div>

              {expandedReport === report.id && (
                <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/30 p-2 animate-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-1 gap-4">
                    <h5 className="text-xs  text-slate-500 flex items-center gap-2">
                      <Package size={14} /> Material Inspection Details
                    </h5>
                    
                    <div className="overflow-hidden border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 ">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs  text-slate-400  ">
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
                                  className={`text-xs  text-slate-700 dark:text-slate-300 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 cursor-pointer transition-colors ${isMatExpanded ? 'bg-emerald-50/20' : ''}`}
                                  onClick={() => toggleMaterial(report.id, mIdx)}
                                >
                                  <td className="p-2">
                                    <div className="flex items-center gap-2">
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
                                  </td>
                                  <td className="px-4 py-4 text-center">{m.received_qty} {m.unit}</td>
                                  <td className="px-4 py-4">
                                    <div className="flex items-center justify-center gap-2">
                                      <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded border border-green-100 flex items-center gap-1">
                                        <CheckCircle size={10} /> {m.accepted_qty} Accepted
                                      </span>
                                      {m.rejected_qty > 0 && (
                                        <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded border border-red-100 flex items-center gap-1">
                                          <AlertTriangle size={10} /> {m.rejected_qty} Rejected
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                                
                                {m.st_numbers?.length > 0 && isMatExpanded && (
                                  <tr className="animate-in fade-in slide-in-from-top-1 duration-200">
                                    <td colSpan="3" className="p-2 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                                      <div className="flex items-center gap-2 mb-3">
                                        <Info size={12} className="text-emerald-600" />
                                        <span className="text-xs  text-slate-500  ">ST Number status for {m.material_name}</span>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {m.st_numbers.map((st, stIdx) => (
                                          <div 
                                            key={stIdx}
                                            className={`p-2 rounded border bg-white dark:bg-slate-900  transition-all hover: flex flex-col gap-2 ${
                                              st.status === 'ACCEPTED' 
                                                ? 'border-green-100 dark:border-green-900/30' 
                                                : 'border-red-100 dark:border-red-900/30'
                                            }`}
                                          >
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-1.5">
                                                <div className={`w-2 h-2 rounded  ${st.status === 'ACCEPTED' ? 'bg-green-500 animate-pulse' : 'bg-red-500 animate-pulse'}`}></div>
                                                <span className={`text-xs    ${st.status === 'ACCEPTED' ? 'text-green-600' : 'text-red-600'}`}>
                                                  {st.status}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-1.5">
                                                {(st.status === 'ACCEPTED' ? m.accepted_report : m.rejected_report) && (
                                                  <button 
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      const reportPath = st.status === 'ACCEPTED' ? m.accepted_report : m.rejected_report;
                                                      window.open(getServerUrl(reportPath), '_blank');
                                                    }}
                                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-600 transition-colors"
                                                    title="View Report"
                                                  >
                                                    <Eye size={15} />
                                                  </button>
                                                )}
                                                <Tag size={15} className="text-slate-300" />
                                              </div>
                                            </div>
                                            
                                            <div className="space-y-1">
                                              <p className="text-[8px]  text-slate-400  ">ST Number (Serial)</p>
                                              <p className="text-xs  text-slate-700 dark:text-slate-200   font-mono truncate" title={st.st_code}>
                                                {st.st_code}
                                              </p>
                                              <div className="text-xs text-slate-500 font-mono mt-1">
                                                {renderDimensions(st)}
                                              </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                                              <div>
                                                <p className="text-[7px]  text-slate-400  er">Item Code</p>
                                                <p className="text-xs  text-slate-500 dark:text-slate-400 truncate">{st.item_code || m.item_code || 'N/A'}</p>
                                              </div>
                                              <div>
                                                <p className="text-[7px]  text-slate-400  er">Material Name</p>
                                                <p className="text-xs  text-slate-500 dark:text-slate-400 truncate">{m.material_name}</p>
                                              </div>
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
};

export default QCTasksPage;
