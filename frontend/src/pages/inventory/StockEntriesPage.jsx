import React, { useState, useEffect } from "react";
import axios from "../../utils/api";
import CreateStockEntryModal from "./CreateStockEntryModal";
import {
  Package,
  Search,
  Plus,
  ArrowRight,
  TrendingUp,
  Boxes,
  IndianRupee,
  Clock,
  MoreVertical,
  Filter,
  ChevronDown,
  ChevronUp,
  Warehouse,
  Calendar,
  Layers,
  Zap,
} from "lucide-react";

const StockEntriesPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("all");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState(null);
  const [expandedItem, setExpandedItem] = useState(null);

  useEffect(() => {
    fetchStockEntries();
  }, []);

  const fetchStockEntries = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/inventory/stock-entries");
      setEntries(response.data.movements || []);
    } catch (error) {
      console.error("Error fetching stock entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { title: "TOTAL MOVEMENTS", value: entries.length, icon: TrendingUp, color: "blue" },
    { title: "TOTAL THROUGHPUT", value: entries.reduce((acc, entry) => acc + (entry.items?.length || 0), 0), icon: Boxes, color: "indigo" },
    { title: "INVENTORY VALUE", value: "₹0.02L", icon: IndianRupee, color: "emerald" },
    { title: "PENDING DRAFTS", value: "0", icon: Clock, color: "amber" },
  ];

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = 
      (entry.entry_no || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.project_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.vendor_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || entry.entry_type.toLowerCase().includes(selectedType.toLowerCase());
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
            <Layers size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Inventory</span>
              <span className="text-slate-300 dark:text-slate-600">›</span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Stock Management</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Stock Entries
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Manage and track all material movements
            </p>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-3"
        >
          <Plus size={18} />
          Create Entry
        </button>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.title}</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{stat.value}</h3>
              </div>
              <div className={`p-2.5 rounded-xl bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-600 dark:text-${stat.color}-400`}>
                <stat.icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/30 dark:bg-slate-900/30">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by ID, Project, or Supplier..."
              className="w-full pl-12 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type:</label>
              <select 
                className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="all">ALL TYPES</option>
                <option value="receipt">RECEIPT</option>
                <option value="issue">ISSUE</option>
                <option value="transfer">TRANSFER</option>
              </select>
            </div>
          </div>
        </div>

        {/* Entries Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-12 text-center"></th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entry Details</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Project / Context</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Items</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {filteredEntries.map((entry) => {
                const items = Array.isArray(entry.items) ? entry.items : [];
                const isExpanded = expandedEntry === entry.id;

                return (
                  <React.Fragment key={entry.id}>
                    <tr className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors ${isExpanded ? 'bg-indigo-50/20 dark:bg-indigo-900/10' : ''}`}>
                      <td className="px-8 py-6 text-center">
                        <button 
                          onClick={() => { setExpandedEntry(isExpanded ? null : entry.id); setExpandedItem(null); }}
                          className={`p-1.5 rounded-lg transition-all ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                      <td className="px-4 py-6">
                        <div className="space-y-1">
                          <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{entry.entry_no}</p>
                          <div className="flex items-center gap-2">
                            <Calendar size={12} className="text-slate-400" />
                            <p className="text-[10px] font-bold text-slate-500 uppercase">
                              {new Date(entry.entry_date || entry.created_at).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 flex-shrink-0">
                            <Zap size={20} />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight line-clamp-2">
                              {entry.project_name || "GENERAL STOCK"}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Vendor:</span>
                              <span className="text-[9px] font-black text-indigo-600 uppercase tracking-tight bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                {entry.vendor_name || "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm shadow-emerald-500/10">
                          {entry.status || 'SUBMITTED'}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-center font-black text-slate-900 dark:text-white">
                        <div className="flex items-center justify-center gap-2">
                           <span className="text-sm">{items.length}</span>
                           <Package size={14} className="text-slate-400" />
                        </div>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                          <MoreVertical size={18} />
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expandable Item Breakdown */}
                    {isExpanded && (
                      <tr>
                        <td colSpan="7" className="px-8 py-0 bg-slate-50/50 dark:bg-slate-900/50">
                          <div className="py-8 px-4 border-l-4 border-indigo-500 bg-white dark:bg-slate-800 my-4 rounded-r-2xl shadow-sm animate-in slide-in-from-top-4 duration-300">
                             <div className="flex items-center justify-between mb-6">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                  <Boxes size={14} /> Itemized Stock Receipt
                                </h4>
                                <div className="text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                                  {items.length} materials included in this entry
                                </div>
                             </div>
                             
                             <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-700">
                               <table className="w-full text-left text-xs">
                                 <thead>
                                   <tr className="bg-slate-50 dark:bg-slate-900/50">
                                     <th className="px-6 py-3 font-black text-slate-400 uppercase tracking-widest w-16">#</th>
                                     <th className="px-6 py-3 font-black text-slate-400 uppercase tracking-widest">Item Code</th>
                                     <th className="px-6 py-3 font-black text-slate-400 uppercase tracking-widest">Material Name</th>
                                     <th className="px-6 py-3 font-black text-slate-400 uppercase tracking-widest text-center">Qty / UOM</th>
                                     <th className="px-6 py-3 font-black text-slate-400 uppercase tracking-widest text-right">Serial Tags</th>
                                   </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-50 dark:divide-slate-700 font-medium">
                                   {items.map((item, i) => {
                                     const isItemExpanded = expandedItem === i;
                                     return (
                                       <React.Fragment key={i}>
                                         <tr 
                                           className={`hover:bg-slate-50/30 dark:hover:bg-slate-900/30 cursor-pointer transition-colors ${isItemExpanded ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}
                                           onClick={() => setExpandedItem(isItemExpanded ? null : i)}
                                         >
                                           <td className="px-6 py-4 text-slate-400 font-bold">{i + 1}</td>
                                           <td className="px-6 py-4 font-black text-indigo-600 uppercase tracking-tight">
                                             {item.item_code}
                                           </td>
                                           <td className="px-6 py-4 font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">
                                             {item.item_name}
                                           </td>
                                           <td className="px-6 py-4 text-center">
                                             <div className="flex flex-col items-center">
                                                <span className="font-black text-slate-900 dark:text-white">{item.quantity}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">{item.uom}</span>
                                             </div>
                                           </td>
                                           <td className="px-6 py-4 text-right">
                                             <div className="flex flex-wrap justify-end gap-1">
                                                {item.serials && item.serials.length > 0 ? (
                                                  item.serials.slice(0, 3).map((s, si) => (
                                                    <span key={si} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded text-[8px] font-black uppercase tracking-tighter border border-indigo-100 dark:border-indigo-800">
                                                      {s.serial_number}
                                                    </span>
                                                  ))
                                                ) : (
                                                  <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-900/30 text-slate-400 rounded text-[8px] font-black uppercase tracking-tighter border border-slate-100 dark:border-slate-800">
                                                    NO SERIALS
                                                  </span>
                                                )}
                                                {item.serials && item.serials.length > 3 && (
                                                  <span className="text-[8px] font-black text-slate-400 mt-1">+{item.serials.length - 3} more</span>
                                                )}
                                             </div>
                                           </td>
                                         </tr>
                                         {isItemExpanded && item.serials && item.serials.length > 0 && (
                                           <tr className="bg-slate-50/50 dark:bg-slate-900/20">
                                             <td colSpan="5" className="px-12 py-4">
                                               <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
                                                 <table className="w-full text-left border-collapse">
                                                   <thead>
                                                     <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                                       <th className="px-4 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest w-12 text-center">#</th>
                                                       <th className="px-4 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">Item Code</th>
                                                       <th className="px-4 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                                                       <th className="px-4 py-2 text-[8px] font-black text-indigo-400 uppercase tracking-widest text-right">ST Code</th>
                                                     </tr>
                                                   </thead>
                                                   <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                                     {item.serials.map((stObj, sIdx) => {
                                                       const stCode = typeof stObj === 'string' ? stObj : stObj.serial_number;
                                                       const itemCodePerPiece = stCode.replace(/^ST-/, "");
                                                       
                                                       return (
                                                         <tr key={sIdx} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                                           <td className="px-4 py-2 text-[10px] font-bold text-slate-400 text-center">{sIdx + 1}</td>
                                                           <td className="px-4 py-2 text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">{itemCodePerPiece}</td>
                                                           <td className="px-4 py-2 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">{item.item_name}</td>
                                                           <td className="px-4 py-2 text-[10px] font-black text-indigo-600 uppercase tracking-tight text-right">{stCode}</td>
                                                         </tr>
                                                       );
                                                     })}
                                                   </tbody>
                                                 </table>
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
                             
                             {entry.remarks && (
                               <div className="mt-6 p-4 bg-amber-50/30 border border-amber-100/50 rounded-xl">
                                  <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Transaction Remarks</p>
                                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{entry.remarks}</p>
                               </div>
                             )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-400">
                      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                        <Package size={32} className="opacity-20" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-black uppercase tracking-widest">No stock entries found</p>
                        <p className="text-xs font-medium">Try adjusting your search or filter settings</p>
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
        onEntryCreated={fetchStockEntries}
      />
    </div>
  );
};

export default StockEntriesPage;

