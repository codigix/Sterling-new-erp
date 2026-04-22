import React, { useState, useEffect, useCallback } from "react";
import axios from "../../utils/api";
import { 
  Search, 
  Calendar, 
  Loader2, 
  History, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Package,
  User,
  Activity,
  Filter,
  X,
  Target,
  Trash2
} from "lucide-react";
import { toast } from "react-toastify";
import DataTable from "../../components/ui/DataTable/DataTable";

const DailyProductionUpdatesPage = () => {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const fetchUpdates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get("/production/updates");
      console.log("Production Updates Data:", response.data);
      if (response.data.success) {
        setUpdates(response.data.updates);
      }
    } catch (error) {
      console.error("Error fetching production updates:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUpdates();
  }, [fetchUpdates]);

  const filteredUpdates = updates.filter(update => {
    const updateDate = update.work_date ? update.work_date.split('T')[0] : "";
    const matchesSearch = searchTerm === "" || 
      update.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      update.root_card_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      update.operator_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      update.operation_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = dateFilter === "" || updateDate === dateFilter;
    
    return matchesSearch && matchesDate;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30';
      case 'In Progress': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30';
      case 'Partially Completed': return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30';
      case 'Delayed': return 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/30';
      default: return 'text-slate-600 bg-slate-50 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-2 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
         
          <div>
            <h1 className="text-2xl  text-slate-900 dark:text-white  ">Production Updates</h1>
            <p className="text-xs  text-slate-500   mt-1">Real-time floor execution tracking</p>
          </div>
        </div>
        <button 
          onClick={fetchUpdates}
          className=" bg-white dark:bg-slate-900 rounded text-xs    hover:bg-slate-50 transition-all flex items-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
          Refresh Live Data
        </button>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full border border-slate-200 rounded">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input 
              type="text" 
              placeholder="Search project, root card, operator......" 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded text-xs    outline-none focus:ring-1 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative w-full md:w-48 border border-slate-200 rounded">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="date" 
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded text-xs    outline-none focus:ring-1 focus:ring-blue-500"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          {(searchTerm || dateFilter) && (
            <button 
              onClick={() => {setSearchTerm(""); setDateFilter("");}}
              className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Updates Table */}
        <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800  overflow-hidden">
          <DataTable
            data={filteredUpdates}
            loading={loading}
            columns={[
              {
                header: "Project / Root Card",
                accessorKey: "project_name",
                cell: (info) => (
                  <div className="flex items-start gap-3">
                    <div className="mt-1 p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded">
                      <Target size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs  text-slate-900 dark:text-white   truncate max-w-[200px] ">{info.getValue() || "N/A"}</p>
                      <p className="text-[10px] text-slate-400 mb-1">{info.row.original.root_card_id}</p>
                      
                      {/* Operation Sequence Display */}
                      {info.row.original.project_operations?.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {info.row.original.project_operations.map((op, idx) => (
                            <React.Fragment key={idx}>
                              <div className="flex items-center gap-1 group relative">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-sm border  ${
                                  op.status === 'Completed' 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30' 
                                    : op.status === 'In Progress'
                                    ? 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30 animate-pulse'
                                    : 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-800/50 dark:text-slate-500 dark:border-slate-800'
                                }`}>
                                  {op.name}
                                </span>
                                {idx < info.row.original.project_operations.length - 1 && (
                                  <div className="w-2 h-[1px] bg-slate-200 dark:bg-slate-800" />
                                )}
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[9px] text-slate-300 italic">No project operations tracked</span>
                      )}
                    </div>
                  </div>
                )
              },
              {
                header: "Work Date",
                accessorKey: "work_date",
                cell: (info) => (
                  <div className="flex items-center gap-2">
                    <Calendar size={12} className="text-slate-400" />
                    <span className="text-xs  text-slate-700 dark:text-slate-300 ">
                      {new Date(info.getValue()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                )
              },
              {
                header: "Operation",
                accessorKey: "operation_name",
                cell: (info) => (
                  <span className="text-xs  text-blue-600 dark:text-blue-400   bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded border border-blue-100 dark:border-blue-900/30">
                    {info.getValue()}
                  </span>
                )
              },
              {
                header: "Operator",
                accessorKey: "operator_name",
                cell: (info) => (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-xs  text-slate-500 ">
                      {info.getValue()?.charAt(0)}
                    </div>
                    <span className="text-xs  text-slate-700 dark:text-slate-300  truncate max-w-[120px]">{info.getValue()}</span>
                  </div>
                )
              },
              {
                header: "Status",
                accessorKey: "status",
                headerClass: "text-center",
                cell: (info) => (
                  <div className="flex justify-center">
                    <span className={`px-2.5 py-1 rounded border text-xs    ${getStatusColor(info.getValue())}`}>
                      {info.getValue()}
                    </span>
                  </div>
                )
              }
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default DailyProductionUpdatesPage;
