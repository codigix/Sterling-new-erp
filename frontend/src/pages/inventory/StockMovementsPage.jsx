import React, { useState, useEffect } from "react";
import axios from "../../utils/api";
import {
  Search,
  Calendar,
  Filter,
  RefreshCw,
  Plus,
  ArrowRight,
  Trash2,
  FileText,
  Loader,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Zap,
  ChevronDown,
  ChevronUp,
  Boxes,
} from "lucide-react";
import CreateStockEntryModal from "./CreateStockEntryModal";

import toastUtils from "../../utils/toastUtils";

const StockMovementsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedMovement, setExpandedMovement] = useState(null);

  useEffect(() => {
    fetchStockMovements();
  }, []);

  const fetchStockMovements = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/inventory/stock-entries");
      // Transform stock entries into ledger movements
      const entries = response.data.movements || [];
      const ledgerMovements = [];

      entries.forEach(entry => {
        const items = Array.isArray(entry.items) ? entry.items : (typeof entry.items === 'string' ? JSON.parse(entry.items) : (entry.items || []));
        items.forEach(item => {
          ledgerMovements.push({
            id: `${entry.id}-${item.id || item.item_code}`,
            item_code: item.item_code || item.material_code || "N/A",
            material_name: item.item_name || item.material_name || "N/A",
            material_type: "RAW_MATERIAL", 
            date: entry.entry_date ? new Date(entry.entry_date).toLocaleDateString("en-GB") : "N/A",
            type: entry.entry_type === 'Material Receipt' ? 'IN' : 'OUT',
            quantity: item.quantity,
            uom: item.unit || item.uom || "Nos",
            balance: 0, 
            reference_no: entry.entry_no,
            reference_type: "STOCK_ENTRY",
            project_name: entry.project_name,
            vendor_name: entry.vendor_name,
            remarks: entry.remarks || `${entry.entry_type} for ${item.item_code}`,
            serials: item.serials || []
          });
        });
      });

      setMovements(ledgerMovements);
    } catch (error) {
      console.error("Error fetching stock movements:", error);
      toastUtils.error("Failed to load stock movements");
    } finally {
      setLoading(false);
    }
  };

  const filteredMovements = movements.filter((m) => {
    const matchesSearch = 
      (m.item_code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.material_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.project_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.reference_no || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <RefreshCw size={40} className="text-blue-600 animate-spin" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Syncing Ledger Records...</p>
      </div>
    );
  }

  const stats = [
    { label: "Aggregate Volume", value: movements.reduce((acc, m) => acc + Number(m.quantity), 0).toLocaleString(), icon: Activity, color: "blue" },
    { label: "Receipts (IN)", value: movements.filter(m => m.type === 'IN').length, icon: ArrowDownLeft, color: "emerald" },
    { label: "Issues (OUT)", value: movements.filter(m => m.type === 'OUT').length, icon: ArrowUpRight, color: "red" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-200 dark:shadow-none">
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Inventory</span>
              <span className="text-slate-300 dark:text-slate-600">›</span>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-400 uppercase tracking-widest">Stock Ledger</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Material Movements
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Complete audit trail of stock ins and outs with project context
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-3"
          >
            <Plus size={18} /> Add Entry
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-600`}>
               <stat.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{stat.label}</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none tracking-tight">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Filters Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row items-end gap-6">
          <div className="flex-1 w-full space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Search Parameters</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search by code, material, project, or reference..."
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="w-full lg:w-48 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date Range</label>
            <div className="relative">
              <input
                type="date"
                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold outline-none"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 w-full lg:w-auto">
            <button className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-8 py-3.5 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10">
              <Filter size={16} /> Apply Filter
            </button>
            <button 
              onClick={fetchStockMovements}
              className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500 hover:text-blue-600 transition-all hover:shadow-md"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-12 text-center"></th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Movement Log</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Material Identity</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Project & Vendor Context</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Type</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Quantity</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredMovements.map((m) => {
                const isExpanded = expandedMovement === m.id;
                return (
                  <React.Fragment key={m.id}>
                    <tr className={`group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors ${isExpanded ? 'bg-indigo-50/20 dark:bg-indigo-900/10' : ''}`}>
                      <td className="px-6 py-6 text-center">
                        <button 
                          onClick={() => setExpandedMovement(isExpanded ? null : m.id)}
                          className={`p-1.5 rounded transition-all ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar size={12} className="text-slate-400" />
                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{m.date}</p>
                          </div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{m.reference_type}</p>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="space-y-1">
                          <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight line-clamp-1">{m.material_name}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 font-mono">
                              {m.item_code}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <ShieldCheck size={14} className="text-indigo-500" />
                            <p className="font-black text-slate-900 dark:text-white text-[10px] uppercase tracking-tight leading-tight line-clamp-1">
                              {m.project_name || "GENERAL PROJECT STOCK"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-5">
                             <Zap size={10} className="text-slate-300" />
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[150px]">
                               {m.vendor_name || "N/A"}
                             </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <span className={`px-3 py-1.5 rounded font-black text-[10px] uppercase tracking-widest border ${
                          m.type === 'IN' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : 'bg-red-50 text-red-600 border-red-100'
                        }`}>
                          {m.type === 'IN' ? 'Receipt (IN)' : 'Issue (OUT)'}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`text-sm font-black tracking-tight ${m.type === 'IN' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {m.type === 'IN' ? '+' : '-'}{Number(m.quantity).toLocaleString(undefined, { minimumFractionDigits: 3 })}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{m.uom}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-tight bg-indigo-50 px-2 py-1 rounded border border-indigo-100 w-fit">
                             {m.reference_no}
                          </p>
                          <p className="text-[10px] text-slate-400 italic font-medium truncate max-w-[150px] ml-1">
                            {m.remarks}
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Serial Detail Breakdown */}
                    {isExpanded && (
                      <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                        <td colSpan="8" className="px-12 py-8">
                          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden animate-in slide-in-from-top-4 duration-300">
                             <div className="px-8 py-4 border-b border-slate-50 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                  <Boxes size={14} /> Tracking Serial Numbers (ST Codes)
                                </h4>
                                <div className="text-[10px] font-bold text-slate-500 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700">
                                  {m.serials?.length || 0} items moved in this transaction
                                </div>
                             </div>
                             
                             <div className="overflow-hidden">
                               <table className="w-full text-left text-xs">
                                 <thead>
                                   <tr className="bg-slate-50/30 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-700">
                                     <th className="px-8 py-3 font-black text-slate-400 uppercase tracking-widest w-16 text-center">#</th>
                                     <th className="px-6 py-3 font-black text-slate-400 uppercase tracking-widest">Item Code</th>
                                     <th className="px-6 py-3 font-black text-slate-400 uppercase tracking-widest">Item Name</th>
                                     <th className="px-6 py-3 font-black text-indigo-500 uppercase tracking-widest text-right">ST Number</th>
                                   </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-50 dark:divide-slate-700 font-medium">
                                   {m.serials && m.serials.length > 0 ? (
                                     m.serials.map((st, sIdx) => (
                                       <tr key={sIdx} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors">
                                         <td className="px-8 py-4 text-slate-400 font-bold text-center">{sIdx + 1}</td>
                                         <td className="p-2 font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">
                                           {st.serial_number.replace(/^ST-/, "")}
                                         </td>
                                         <td className="p-2 text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                                           {m.material_name}
                                         </td>
                                         <td className="p-2 text-right">
                                           <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded text-[10px] font-black uppercase tracking-tight border border-indigo-100 dark:border-indigo-800">
                                             {st.serial_number}
                                           </span>
                                         </td>
                                       </tr>
                                     ))
                                   ) : (
                                     <tr>
                                       <td colSpan="4" className="px-8 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                         No individual serial tracking records for this movement
                                       </td>
                                     </tr>
                                   )}
                                 </tbody>
                               </table>
                             </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filteredMovements.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-400">
                      <FileText size={48} className="opacity-10" />
                      <div className="space-y-1">
                        <p className="text-sm font-black uppercase tracking-widest">No movements recorded</p>
                        <p className="text-xs font-medium">Synchronize ledger to see live transactions</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateStockEntryModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onEntryCreated={fetchStockMovements}
      />
    </div>
  );
};

export default StockMovementsPage;

