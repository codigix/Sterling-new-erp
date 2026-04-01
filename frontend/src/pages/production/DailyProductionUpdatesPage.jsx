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
  Target
} from "lucide-react";

const DailyProductionUpdatesPage = () => {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const fetchUpdates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get("/production/updates");
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-sm text-blue-600">
            <History size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Production Updates</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Real-time floor execution tracking</p>
          </div>
        </div>
        <button 
          onClick={fetchUpdates}
          className="px-6 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
          Refresh Live Data
        </button>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="SEARCH BY PROJECT, ROOT CARD, OPERATOR..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded text-[10px] font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative w-full md:w-48">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="date" 
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded text-[10px] font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-blue-500"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          {(searchTerm || dateFilter) && (
            <button 
              onClick={() => {setSearchTerm(""); setDateFilter("");}}
              className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Updates Table */}
        <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Project / Root Card</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Work Date</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Operation</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Operator</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Output</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <Loader2 size={24} className="animate-spin text-blue-600 mx-auto mb-2" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fetching floor updates...</p>
                    </td>
                  </tr>
                ) : filteredUpdates.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">No production updates found</td>
                  </tr>
                ) : (
                  filteredUpdates.map((update) => (
                    <tr key={update.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded">
                            <Target size={14} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter truncate max-w-[200px]">{update.project_name || "N/A"}</p>
                            <span className="text-[8px] font-bold text-slate-400 uppercase">{update.root_card_id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={12} className="text-slate-400" />
                          <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">
                            {new Date(update.work_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded border border-blue-100 dark:border-blue-900/30">
                          {update.operation_name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">
                            {update.operator_name?.charAt(0)}
                          </div>
                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase truncate max-w-[120px]">{update.operator_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-[11px] font-black text-slate-900 dark:text-white tracking-tighter">{update.qty_completed} <span className="text-[8px] text-slate-400">PCS</span></span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase">{update.actual_hours} HRS</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <span className={`px-2.5 py-1 rounded border text-[9px] font-black uppercase tracking-widest ${getStatusColor(update.status)}`}>
                            {update.status}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyProductionUpdatesPage;
