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
    <div className="space-y-2 p-4">
      {/* Header Info */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
            <Layers size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs  text-indigo-600 dark:text-indigo-400  ">Inventory</span>
              <span className="text-slate-300 dark:text-slate-500">›</span>
              <span className="text-xs  text-slate-500 dark:text-slate-400  ">Stock Management</span>
            </div>
            <h1 className="text-xl  text-slate-900 dark:text-white ">
              Stock Entries
            </h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Manage and track all material movements
            </p>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded  text-xs   transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-3"
        >
          <Plus size={18} />
          Create Entry
        </button>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 my-5 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700 ">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs  text-slate-400   mb-1">{stat.title}</p>
                <h3 className="text-xl  text-slate-900 dark:text-white leading-tight">{stat.value}</h3>
              </div>
              <div className={`p-2 rounded bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-600 dark:text-${stat.color}-400`}>
                <stat.icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters Section */}
      <div className="">
        <div className=" my-4 border-b border-slate-50 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/30 dark:bg-slate-900/30">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search by ID, Project, or Supplier..."
              className="w-full pl-12 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all "
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <label className="text-xs  text-slate-400  ">Type:</label>
              <select 
                className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs  text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 "
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
                <th className="p-2 text-xs  text-slate-400   w-12 text-center"></th>
                <th className="p-2 text-xs  text-slate-400  ">Entry Details</th>
                <th className="p-2 text-xs  text-slate-400  ">Project / Context</th>
                <th className="p-2 text-xs  text-slate-400   text-center">Status</th>
                <th className="p-2 text-xs  text-slate-400   text-center">Items</th>
                <th className="p-2 text-xs  text-slate-400   text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {filteredEntries.map((entry) => {
                const items = Array.isArray(entry.items) ? entry.items : [];
                const isExpanded = expandedEntry === entry.id;

                return (
                  <React.Fragment key={entry.id}>
                    <tr className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors ${isExpanded ? 'bg-indigo-50/20 dark:bg-indigo-900/10' : ''}`}>
                      <td className="p-2 text-center">
                        <button 
                          onClick={() => { setExpandedEntry(isExpanded ? null : entry.id); setExpandedItem(null); }}
                          className={`p-1 rounded transition-all ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                      <td className="p-2">
                        <div className="space-y-1">
                          <p className="text-xs  text-slate-900 dark:text-white  ">{entry.entry_no}</p>
                          <div className="flex items-center gap-2">
                            <Calendar size={12} className="text-slate-400" />
                            <p className="text-xs  text-slate-500 ">
                              {new Date(entry.entry_date || entry.created_at).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-start gap-4">
                          <div className="p-2 rounded bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 flex-shrink-0">
                            <Zap size={15} />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs  text-slate-900 dark:text-white   leading-tight line-clamp-2">
                              {entry.project_name || "GENERAL STOCK"}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs  text-slate-400 ">Vendor:</span>
                              <span className="text-xs  text-indigo-600   bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                {entry.vendor_name || "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        <span className="p-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded text-xs     shadow-emerald-500/10">
                          {entry.status || 'SUBMITTED'}
                        </span>
                      </td>
                      <td className="p-2 text-center  text-slate-900 dark:text-white">
                        <div className="flex items-center justify-center gap-2">
                           <span className="text-xs">{items.length}</span>
                           <Package size={14} className="text-slate-400" />
                        </div>
                      </td>
                      <td className="p-2 text-right">
                        <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                          <MoreVertical size={18} />
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expandable Item Breakdown */}
                    {isExpanded && (
                      <tr>
                        <td colSpan="7" className="p-2 bg-slate-50/50 dark:bg-slate-900/50">
                          <div className="p-2 border-l-4 border-indigo-500 bg-white dark:bg-slate-800 my-4 rounded-r-2xl  animate-in slide-in-from-top-4 duration-300">
                             <div className="flex items-center justify-between my-2">
                                <h4 className="text-xs  text-slate-400   flex items-center gap-2">
                                  <Boxes size={14} /> Itemized Stock Receipt
                                </h4>
                                <div className="text-xs  text-slate-500 bg-slate-100 p-1 rounded ">
                                  {items.length} materials included in this entry
                                </div>
                             </div>
                             
                             <div className="overflow-hidden rounded border border-slate-100 dark:border-slate-700">
                               <table className="w-full text-left text-xs">
                                 <thead>
                                   <tr className="bg-slate-50 dark:bg-slate-900/50">
                                     <th className="p-2  text-slate-400   w-16">#</th>
                                     <th className="p-2  text-slate-400  ">Item Code</th>
                                     <th className="p-2  text-slate-400  ">Material Name</th>
                                     <th className="p-2  text-slate-400  ">Dimensions</th>
                                     <th className="p-2  text-slate-400   text-center">Qty / UOM</th>
                                     <th className="p-2  text-slate-400   text-right">Serial Tags</th>
                                   </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-50 dark:divide-slate-700 font-medium">
                                   {items.map((item, i) => {
                                     const isItemExpanded = expandedItem === i;
                                     const renderDimensions = (it, fallback = null) => {
                                       const dims = [];
                                       const l = Number(it.length_mm || it.length || (fallback?.length_mm || fallback?.length || 0));
                                       const w = Number(it.width_mm || it.width || (fallback?.width_mm || fallback?.width || 0));
                                       const t = Number(it.thickness_mm || it.thickness || (fallback?.thickness_mm || fallback?.thickness || 0));
                                       const d = Number(it.diameter_mm || it.diameter || (fallback?.diameter_mm || fallback?.diameter || 0));
                                       const od = Number(it.outer_diameter_mm || it.outer_diameter || (fallback?.outer_diameter_mm || fallback?.outer_diameter || 0));
                                       const h = Number(it.height_mm || it.height || (fallback?.height_mm || fallback?.height || 0));

                                       if (l) dims.push(`L: ${l}`);
                                       if (w) dims.push(`W: ${w}`);
                                       if (t) dims.push(`T: ${t}`);
                                       if (d) dims.push(`Dia: ${d}`);
                                       if (od) dims.push(`OD: ${od}`);
                                       if (h) dims.push(`H: ${h}`);
                                       return dims.length > 0 ? dims.join(" × ") : "-";
                                     };

                                     return (
                                       <React.Fragment key={i}>
                                         <tr 
                                           className={`hover:bg-slate-50/30 dark:hover:bg-slate-900/30 cursor-pointer transition-colors ${isItemExpanded ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}
                                           onClick={() => setExpandedItem(isItemExpanded ? null : i)}
                                         >
                                           <td className="p-2 text-slate-400 ">{i + 1}</td>
                                           <td className="p-2  text-indigo-600  ">
                                             {item.item_code}
                                           </td>
                                           <td className="p-2  text-slate-700 dark:text-slate-300  ">
                                             {item.item_name}
                                           </td>
                                           <td className="p-2 text-slate-500 dark:text-slate-400 text-[10px]">
                                             {renderDimensions(item)}
                                           </td>
                                           <td className="p-2 text-center">
                                             <div className="flex flex-col items-center">
                                                <span className=" text-slate-900 dark:text-white">{item.quantity}</span>
                                                <span className="text-xs  text-slate-400 ">{item.uom}</span>
                                             </div>
                                           </td>
                                           <td className="p-2 text-right">
                                             <div className="flex flex-wrap justify-end gap-1">
                                                {item.serials && item.serials.length > 0 ? (
                                                  item.serials.slice(0, 3).map((s, si) => (
                                                    <span key={si} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded text-xs   er border border-indigo-100 dark:border-indigo-800">
                                                      {s.serial_number}
                                                    </span>
                                                  ))
                                                ) : (
                                                  <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-900/30 text-slate-400 rounded text-xs   er border border-slate-100 dark:border-slate-800">
                                                    NO SERIALS
                                                  </span>
                                                )}
                                                {item.serials && item.serials.length > 3 && (
                                                  <span className="text-xs  text-slate-400 mt-1">+{item.serials.length - 3} more</span>
                                                )}
                                             </div>
                                           </td>
                                         </tr>
                                         {isItemExpanded && item.serials && item.serials.length > 0 && (
                                           <tr className="bg-slate-50/50 dark:bg-slate-900/20">
                                             <td colSpan="5" className="p-2">
                                               <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded  overflow-hidden">
                                                 <table className="w-full text-left border-collapse">
                                                   <thead>
                                                     <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                                       <th className="p-2 text-xs  text-slate-400   w-12 text-center">#</th>
                                                       <th className="p-2 text-xs  text-slate-400  ">Item Code</th>
                                                       <th className="p-2 text-xs  text-slate-400  ">Dimensions</th>
                                                       <th className="p-2 text-xs  text-slate-400  ">Name</th>
                                                       <th className="p-2 text-xs  text-indigo-400   text-right">ST Code</th>
                                                     </tr>
                                                   </thead>
                                                   <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                                     {item.serials.map((stObj, sIdx) => {
                                                       const stCode = typeof stObj === 'string' ? stObj : stObj.serial_number;
                                                       const itemCodePerPiece = stCode.replace(/^ST-/, "");
                                                       
                                                       return (
                                                         <tr key={sIdx} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                                           <td className="p-2 text-xs  text-slate-400 text-center">{sIdx + 1}</td>
                                                           <td className="p-2 text-xs  text-slate-700 dark:text-slate-300  ">{itemCodePerPiece}</td>
                                                           <td className="p-2 text-[10px] text-slate-500  ">
                                                             {renderDimensions(stObj, item)}
                                                           </td>
                                                           <td className="p-2 text-xs  text-slate-500 dark:text-slate-400  ">{item.item_name}</td>
                                                           <td className="p-2 text-xs  text-indigo-600   text-right">{stCode}</td>
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
                               <div className="mt-6 p-2 bg-amber-50/30 border border-amber-100/50 rounded">
                                  <p className="text-xs  text-amber-600   mb-1">Transaction Remarks</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{entry.remarks}</p>
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
                  <td colSpan="7" className="p-2 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-400">
                      <div className="p-2 rounded  bg-slate-50 flex items-center justify-center">
                        <Package size={15} className="opacity-20" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm   ">No stock entries found</p>
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

