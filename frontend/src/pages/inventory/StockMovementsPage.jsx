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
            serials: item.serials || [],
            length: item.length_mm || item.length,
            width: item.width_mm || item.width,
            thickness: item.thickness_mm || item.thickness,
            diameter: item.diameter_mm || item.diameter,
            outer_diameter: item.outer_diameter_mm || item.outer_diameter,
            height: item.height_mm || item.height,
            density: item.density
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
        <p className="text-xs  text-slate-400  ">Syncing Ledger Records...</p>
      </div>
    );
  }

  const stats = [
    { label: "Aggregate Volume", value: movements.reduce((acc, m) => acc + Number(m.quantity), 0).toLocaleString(), icon: Activity, color: "blue" },
    { label: "Receipts (IN)", value: movements.filter(m => m.type === 'IN').length, icon: ArrowDownLeft, color: "emerald" },
    { label: "Issues (OUT)", value: movements.filter(m => m.type === 'OUT').length, icon: ArrowUpRight, color: "red" },
  ];

  return (
   <>
    <div className="p-4">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded bg-slate-900 flex items-center justify-center text-white  shadow-slate-200 dark:shadow-none">
            <TrendingUp size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs  text-slate-500  ">Inventory</span>
              <span className="text-slate-300 dark:text-slate-500">›</span>
              <span className="text-xs  text-slate-900 dark:text-slate-400  ">Stock Ledger</span>
            </div>
            <h1 className="text-xl  text-slate-900 dark:text-white ">
              Material Movements
            </h1>
            <p className="text-xs  text-slate-500 dark:text-slate-400">
              Complete audit trail of stock ins and outs with project context
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded  text-xs   transition-all  shadow-indigo-500/20 flex items-center gap-3"
          >
            <Plus size={15} /> Add Entry
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3  my-5 gap-2">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-800  flex items-center gap-4">
            <div className={`p-2 rounded bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-600`}>
               <stat.icon size={15} />
            </div>
            <div>
              <p className="text-xs mb-2  text-slate-400   mb-0.5">{stat.label}</p>
              <h3 className="text-xl  text-slate-900 dark:text-white leading-none ">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Filters Card */}
      <div className="my-5">
        <div className="flex flex-col lg:flex-row items-end gap-2">
          <div className="flex-1 w-full space-y-2">
            <label className="text-xs mb-2  text-slate-400   ml-1">Search Parameters</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search by code, material, project, or reference..."
                className="w-full pl-12 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs  focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="w-full lg:w-48 space-y-2">
            <label className="text-xs mb-2  text-slate-400   ml-1">Date Range</label>
            <div className="relative">
              <input
                type="date"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs  outline-none"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 w-full lg:w-auto">
            <button className="flex-1 lg:flex-none flex items-center justify-center gap-3 p-2.5 bg-slate-900 dark:bg-slate-700 text-white rounded  text-xs   hover:bg-slate-800 transition-all  shadow-slate-900/10">
              <Filter size={15} /> Apply Filter
            </button>
            <button 
              onClick={fetchStockMovements}
              className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-500 hover:text-blue-600 transition-all hover:"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-800  overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <th className="p-2 text-xs mb-2  text-slate-400   w-12 text-center"></th>
                <th className="p-2 text-xs mb-2  text-slate-400  ">Movement Log</th>
                <th className="p-2 text-xs mb-2  text-slate-400  ">Material Identity</th>
                <th className="p-2 text-xs mb-2  text-slate-400  ">Dimensions</th>
                <th className="p-2 text-xs mb-2  text-slate-400  ">Project & Vendor Context</th>
                <th className="p-2 text-xs mb-2  text-slate-400   text-center">Type</th>
                <th className="p-2 text-xs mb-2  text-slate-400   text-right">Quantity</th>
                <th className="p-2 text-xs mb-2  text-slate-400  ">Reference</th>
                <th className="p-2 text-xs mb-2  text-slate-400   text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredMovements.map((m) => {
                const isExpanded = expandedMovement === m.id;
                const renderDimensions = (it, fallback = null) => {
                  const dims = [];
                  const l = Number(it.length || (fallback?.length || 0));
                  const w = Number(it.width || (fallback?.width || 0));
                  const t = Number(it.thickness || (fallback?.thickness || 0));
                  const d = Number(it.diameter || (fallback?.diameter || 0));
                  const od = Number(it.outer_diameter || (fallback?.outer_diameter || 0));
                  const h = Number(it.height || (fallback?.height || 0));

                  if (l) dims.push(`L: ${l}`);
                  if (w) dims.push(`W: ${w}`);
                  if (t) dims.push(`T: ${t}`);
                  if (d) dims.push(`Dia: ${d}`);
                  if (od) dims.push(`OD: ${od}`);
                  if (h) dims.push(`H: ${h}`);
                  return dims.length > 0 ? dims.join(" × ") : "-";
                };

                return (
                  <React.Fragment key={m.id}>
                    <tr className={`group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors ${isExpanded ? 'bg-indigo-50/20 dark:bg-indigo-900/10' : ''}`}>
                      <td className="p-2 text-center">
                        <button 
                          onClick={() => setExpandedMovement(isExpanded ? null : m.id)}
                          className={`p-1 rounded transition-all ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                      <td className="p-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar size={12} className="text-slate-400" />
                            <p className="text-xs  text-slate-900 dark:text-white  ">{m.date}</p>
                          </div>
                          <p className="text-xs  text-slate-400  ">{m.reference_type}</p>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="space-y-1">
                          <p className="text-xs  text-slate-900 dark:text-white   line-clamp-1">{m.material_name}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs  text-blue-600 bg-blue-50 p-1 rounded border border-blue-100 font-mono">
                              {m.item_code}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-slate-500 dark:text-slate-400 text-xs">
                        {renderDimensions(m)}
                      </td>
                      <td className="p-2">
                        <div className="">
                          <div className="flex items-center gap-2">
                            <ShieldCheck size={14} className="text-indigo-500" />
                            <p className=" text-slate-900 dark:text-white text-xs mb-2   leading-tight line-clamp-1">
                              {m.project_name || "GENERAL PROJECT STOCK"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ">
                             <Zap size={10} className="text-slate-300" />
                             <p className="text-xs mb-2  text-slate-400   truncate max-w-[150px]">
                               {m.vendor_name || "N/A"}
                             </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        <span className={`p-1 rounded  text-xs mb-2   border ${
                          m.type === 'IN' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : 'bg-red-50 text-red-600 border-red-100'
                        }`}>
                          {m.type === 'IN' ? 'Receipt (IN)' : 'Issue (OUT)'}
                        </span>
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex flex gap-1 items-end">
                          <span className={`text-xs   ${m.type === 'IN' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {m.type === 'IN' ? '+' : '-'}{Number(m.quantity).toLocaleString(undefined, { minimumFractionDigits: 3 })}
                          </span>
                          <span className="text-xs  text-slate-400  ">{m.uom}</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="space-y-1">
                          <p className="text-xs mb-2  text-indigo-600   bg-indigo-50 p-1 rounded border border-indigo-100 w-fit">
                             {m.reference_no}
                          </p>
                          <p className="text-xs mb-2 text-slate-400 italic  truncate max-w-[150px] ml-1">
                            {m.remarks}
                          </p>
                        </div>
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex justify-end gap-2  group-hover:opacity-100 transition-opacity">
                          <button className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Serial Detail Breakdown */}
                    {isExpanded && (
                      <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                        <td colSpan="8" className="p-2">
                          <div className="bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700  overflow-hidden animate-in slide-in-from-top-4 duration-300">
                             <div className="p-2 border-b border-slate-50 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                                <h4 className="text-xs mb-2  text-slate-400   flex items-center gap-2">
                                  <Boxes size={14} /> Tracking Serial Numbers (ST Codes)
                                </h4>
                                <div className="text-xs mb-2  text-slate-500 bg-white dark:bg-slate-900 px-3 py-1 rounded  border border-slate-100 dark:border-slate-700">
                                  {m.serials?.length || 0} items moved in this transaction
                                </div>
                             </div>
                             
                             <div className="overflow-hidden">
                               <table className="w-full text-left text-xs">
                                 <thead>
                                   <tr className="bg-slate-50/30 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-700">
                                     <th className="p-2  text-slate-400   w-16 text-center">#</th>
                                     <th className="p-2  text-slate-400  ">Item Code</th>
                                     <th className="p-2  text-slate-400  ">Item Name</th>
                                     <th className="p-2  text-slate-400  ">Dimensions</th>
                                     <th className="p-2  text-indigo-500   text-right">ST Number</th>
                                   </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-50 dark:divide-slate-700 ">
                                   {m.serials && m.serials.length > 0 ? (
                                     m.serials.map((st, sIdx) => (
                                       <tr key={sIdx} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors">
                                         <td className="p-2 text-slate-400  text-center">{sIdx + 1}</td>
                                         <td className="p-2  text-slate-700 dark:text-slate-300  ">
                                           {st.serial_number.replace(/^ST-/, "")}
                                         </td>
                                         <td className="p-2 text-slate-500 dark:text-slate-400  ">
                                           {m.material_name}
                                         </td>
                                         <td className="p-2 text-slate-500 dark:text-slate-400 text-xs">
                                           {renderDimensions(st, m)}
                                         </td>
                                         <td className="p-2 text-right">
                                           <span className="p-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded text-xs mb-2    border border-indigo-100 dark:border-indigo-800">
                                             {st.serial_number}
                                           </span>
                                         </td>
                                       </tr>
                                     ))
                                   ) : (
                                     <tr>
                                       <td colSpan="4" className="p-4 text-center text-slate-400    text-xs mb-2">
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
                        <p className="text-sm   ">No movements recorded</p>
                        <p className="text-xs ">Synchronize ledger to see live transactions</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      
    </div>
    <CreateStockEntryModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onEntryCreated={fetchStockMovements}
      />
   </>
  );
};

export default StockMovementsPage;

