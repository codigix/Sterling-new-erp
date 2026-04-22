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
  Info,
  RefreshCw
} from "lucide-react";
import { showError, showSuccess } from "../../utils/toastUtils";
import { renderDimensions } from "../../utils/dimensionUtils";
import Swal from "sweetalert2";
import DataTable from "../../components/ui/DataTable/DataTable";

const ReportDetailTable = ({ report }) => {
  const detailColumns = [
    {
      key: "material_name",
      label: "Material Info",
      render: (value, m) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
            <Package size={14} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-900 dark:text-white">{m.material_name}</p>
            <p className="text-[10px] text-slate-400">{m.item_code} • {m.item_group}</p>
          </div>
        </div>
      )
    },
    {
      key: "received_qty",
      label: "Received",
      align: "center",
      render: (value, m) => <span className="text-xs text-slate-600 dark:text-slate-400">{value} {m.unit}</span>
    },
    {
      key: "result",
      label: "Result",
      align: "center",
      render: (value, m) => (
        <div className="flex items-center justify-center gap-2">
          <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded border border-emerald-100 dark:border-emerald-800 text-[9px] font-medium flex items-center gap-1">
            <CheckCircle size={10} /> {m.accepted_qty} Accepted
          </span>
          {m.rejected_qty > 0 && (
            <span className="px-2 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded border border-red-100 dark:border-red-800 text-[9px] font-medium flex items-center gap-1">
              <AlertTriangle size={10} /> {m.rejected_qty} Rejected
            </span>
          )}
        </div>
      )
    }
  ];

  const renderSTNumbers = (m) => {
    if (!m.st_numbers || m.st_numbers.length === 0) return null;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-2 bg-slate-50/50 dark:bg-slate-800/50 rounded">
        {m.st_numbers.map((st, stIdx) => (
          <div key={stIdx} className="p-3 rounded border bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-2 transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold ${st.status === 'ACCEPTED' ? 'text-emerald-600' : 'text-red-600'}`}>
                {st.status}
              </span>
              {(st.status === 'ACCEPTED' ? m.accepted_report : m.rejected_report) && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const reportPath = st.status === 'ACCEPTED' ? m.accepted_report : m.rejected_report;
                    window.open(getServerUrl(reportPath), '_blank');
                  }}
                  className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-600 rounded transition-colors"
                >
                  <Eye size={14} />
                </button>
              )}
            </div>
            <div className="space-y-0.5">
              <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">ST Code</p>
              <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">{st.st_code}</p>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-mono mt-1 font-medium bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded w-fit">{renderDimensions(st)}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 space-y-4">
      <div className="bg-white dark:bg-slate-800 border p-2 border-slate-200 dark:border-slate-700 rounded overflow-hidden">
        <DataTable
          title="Material Inspection Details"
          titleIcon={<Package size={14} className="text-emerald-600" />}
          columns={detailColumns}
          data={report.materials || []}
          showSearch={false}
          renderRowDetail={renderSTNumbers}
          hover={true}
          striped={false}
        />
      </div>
    </div>
  );
};

const QCTasksPage = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
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
        setReports(reports.filter(r => r.id !== id));
        showSuccess("Report deleted");
      } catch (error) {
        showError("Failed to delete report");
      }
    }
  };

  const columns = [
    {
      header: "Report Info",
      accessor: "grn_number",
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded">
            <CheckCircle size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs  text-slate-900">{val}</span>
              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[8px]  uppercase">{row.inspection_type}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Finalized Report</p>
          </div>
        </div>
      )
    },
    {
      header: "Vendor",
      accessor: "vendor_name",
      render: (val) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <User size={12} className="text-slate-400" />
          <span>{val}</span>
        </div>
      )
    },
    {
      header: "Project",
      accessor: "project_name",
      render: (val) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 ">
          <Package size={12} className="text-blue-500" />
          <span>{val}</span>
        </div>
      )
    },
    {
      header: "Date",
      accessor: "report_date",
      className: "text-center",
      render: (val) => (
        <div className="flex flex-col items-center">
          <span className="text-xs text-slate-700">{new Date(val).toLocaleDateString()}</span>
          <span className="text-[9px] text-slate-400 flex items-center gap-1"><Calendar size={10} /> Created</span>
        </div>
      )
    },
    {
      header: "Actions",
      accessor: "id",
      className: "text-right",
      render: (_, report) => (
        <div className="flex justify-end gap-1.5">
          {!report.is_sent_to_inventory ? (
            <button 
              onClick={(e) => handleSendToInventory(e, report.id)}
              disabled={sendingReport === report.id}
              className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-[10px] hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              {sendingReport === report.id ? <RefreshCw size={12} className="animate-spin" /> : <ExternalLink size={12} />}
              Send
            </button>
          ) : (
            <div className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-[10px]  border border-emerald-100 flex items-center gap-1">
              <CheckCircle size={10} /> Sent
            </div>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); handleDeleteReport(report.id); }}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-lg  text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="text-emerald-600" size={18} />
            Quality Inspection Reports
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            History of all finalized quality inspections
          </p>
        </div>
        <button onClick={() => fetchReports()} className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-500 hover:text-emerald-600 transition-all shadow-sm">
          <RefreshCw size={16} />
        </button>
      </div>

      <DataTable 
        columns={columns}
        data={reports}
        loading={loading}
        searchPlaceholder="Search reports, GRN, project or vendor..."
        expandableRow={(row) => <ReportDetailTable report={row} />}
        filters={[
          {
            label: "Type",
            column: "inspection_type",
            options: [
              { label: "ALL TYPES", value: "" },
              { label: "INHOUSE", value: "Inhouse" },
              { label: "OUTSOURCE", value: "Outsource" }
            ]
          },
          {
            label: "Inventory Status",
            column: "is_sent_to_inventory",
            options: [
              { label: "ALL", value: "" },
              { label: "SENT", value: true },
              { label: "PENDING", value: false }
            ]
          }
        ]}
      />
    </div>
  );
};

export default QCTasksPage;
