import React, { useState, useEffect } from "react";
import axios from "../../utils/api";
import {
  Package,
  Search,
  Filter,
  Download,
  Trash2,
  Loader,
  Calculator,
  AlertTriangle,
  ArrowUpDown,
  Warehouse,
  ShieldCheck,
  RefreshCw,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Boxes,
} from "lucide-react";

import toastUtils from "../../utils/toastUtils";

const StockBalancePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedItem, setExpandedItem] = useState(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/inventory/materials?onlyWithStock=true");
      const materials = response.data.materials || [];

      const formattedData = materials.map((item) => {
        // Safe date formatting
        const formatDate = (dateValue) => {
          if (!dateValue || dateValue === "0000-00-00" || dateValue.startsWith("0000")) return "N/A";
          const d = new Date(dateValue);
          return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString("en-GB");
        };

        return {
          id: item.id,
          name: String(item.itemName || item.item_name || item.description || item.name || "N/A").trim() || "N/A",
          code: String(item.itemCode || item.item_code || item.item_no || item.code || "N/A").trim() || "N/A",
          category: item.category || "Uncategorized",
          quantity: Number(item.total_stock !== undefined ? item.total_stock : (item.quantity !== undefined ? item.quantity : 0)) || 0,
          unit: item.unit || item.uom || "Nos",
          reorderLevel: Number(item.reorderLevel || item.reorder_level) || 0,
          lastUpdated: formatDate(item.updatedAt || item.createdAt || item.last_updated),
          type: item.material_type || item.category || "RAW_MATERIAL",
          project_name: item.project_name,
          vendor_name: item.vendor_name,
          serials: item.serials || []
        };
      });

      setStockData(formattedData);
    } catch (error) {
      console.error("Error fetching materials:", error);
      toastUtils.error("Failed to load stock balance");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMaterial = async (id) => {
    try {
      await axios.delete(`/inventory/materials/${id}`);
      toastUtils.success("Material record removed");
      fetchMaterials();
    } catch (error) {
      toastUtils.error("Failed to delete material");
    }
  };

  const filteredData = stockData.filter((item) => {
    const matchesSearch =
      (item.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.project_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <RefreshCw size={40} className="text-cyan-600 animate-spin" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Calculating Live Inventory...</p>
      </div>
    );
  }

  const totalItems = stockData.length;
  const totalBalance = stockData.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockItems = stockData.filter(item => item.quantity < item.reorderLevel || item.quantity === 0).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-600 flex items-center justify-center text-white shadow-lg shadow-cyan-200 dark:shadow-none">
            <Warehouse size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">Inventory</span>
              <span className="text-slate-300 dark:text-slate-600">›</span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Stock Balance</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Inventory Ledger
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Real-time stock levels and material tracking
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchMaterials} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-cyan-600 transition-all hover:shadow-md">
            <RefreshCw size={18} />
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10">
            <Download size={16} /> Export Data
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-cyan-200 transition-all duration-300">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Materials</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white leading-none tracking-tight">{totalItems}</h3>
          </div>
          <div className="p-4 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-2xl group-hover:scale-110 transition-transform">
            <Package size={28} />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-all duration-300">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Aggregate Balance</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white leading-none tracking-tight">{totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl group-hover:scale-110 transition-transform">
            <Calculator size={28} />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-red-200 transition-all duration-300">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Low Stock Alerts</p>
            <h3 className="text-3xl font-black text-red-600 leading-none tracking-tight">{lowStockItems}</h3>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl group-hover:scale-110 transition-transform animate-pulse">
            <AlertTriangle size={28} />
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Table Controls */}
        <div className="p-8 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search by material description..."
                className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-cyan-500 outline-none shadow-sm transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter:</label>
              <select className="px-6 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-cyan-500 shadow-sm">
                <option>ALL MATERIALS</option>
                <option>PLATES & BLOCKS</option>
                <option>ROUND BARS</option>
                <option>PIPES & FITTINGS</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-12 text-center"></th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <div className="flex items-center gap-2 cursor-pointer hover:text-cyan-600 transition-colors">
                    Item name <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                  Stock Balance
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                  Unit
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                  Last Update
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredData.map((item) => {
                const isExpanded = expandedItem === item.id;
                return (
                  <React.Fragment key={item.id}>
                    <tr className={`group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors ${isExpanded ? 'bg-cyan-50/20 dark:bg-cyan-900/10' : ''}`}>
                      <td className="px-6 py-6 text-center">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedItem(isExpanded ? null : item.id);
                          }}
                          className={`p-1.5 rounded-lg transition-all ${isExpanded ? 'bg-cyan-100 text-cyan-600' : 'bg-slate-100 text-slate-400'}`}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight line-clamp-2 leading-tight">
                          {item.name}
                        </p>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${item.quantity <= item.reorderLevel ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                            <span className={`text-lg font-black tracking-tight ${item.quantity <= item.reorderLevel ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
                              {item.quantity.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                            </span>
                          </div>
                          {item.quantity <= item.reorderLevel && (
                            <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter">Below Threshold</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{item.unit}</span>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{item.lastUpdated}</p>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                            <MoreVertical size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteMaterial(item.id)}
                            className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expandable Serial Breakdown */}
                    {isExpanded && (
                      <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                        <td colSpan="7" className="px-12 py-8">
                          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden animate-in slide-in-from-top-4 duration-300">
                             <div className="px-8 py-4 border-b border-slate-50 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                  <Boxes size={14} /> Itemized Pieces (Available)
                                </h4>
                                <div className="text-[10px] font-bold text-slate-500 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700">
                                  {item.serials?.length || 0} units in stock
                                </div>
                             </div>
                             
                             <div className="overflow-hidden">
                               <table className="w-full text-left text-xs">
                                 <thead>
                                   <tr className="bg-slate-50/30 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-700">
                                     <th className="px-8 py-3 font-black text-slate-400 uppercase tracking-widest w-16 text-center">#</th>
                                     <th className="px-6 py-3 font-black text-slate-400 uppercase tracking-widest">Item Code</th>
                                     <th className="px-6 py-3 font-black text-slate-400 uppercase tracking-widest">Item Name</th>
                                     <th className="px-6 py-3 font-black text-cyan-500 uppercase tracking-widest text-right">ST Number</th>
                                   </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-50 dark:divide-slate-700 font-medium">
                                   {item.serials && item.serials.length > 0 ? (
                                     item.serials.map((st, sIdx) => (
                                       <tr key={sIdx} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors">
                                         <td className="px-8 py-4 text-slate-400 font-bold text-center">{sIdx + 1}</td>
                                         <td className="px-6 py-4 font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">
                                           {st.serial_number.replace(/^ST-/, "")}
                                         </td>
                                         <td className="px-6 py-4 text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                                           {item.name}
                                         </td>
                                         <td className="px-6 py-4 text-right">
                                           <span className="px-2.5 py-1 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 rounded-lg text-[10px] font-black uppercase tracking-tight border border-cyan-100 dark:border-cyan-800">
                                             {st.serial_number}
                                           </span>
                                         </td>
                                       </tr>
                                     ))
                                   ) : (
                                     <tr>
                                       <td colSpan="4" className="px-8 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                         No individual pieces tracking found for this item
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
            </tbody>
          </table>
          {filteredData.length === 0 && (
            <div className="py-24 text-center">
              <div className="flex flex-col items-center gap-4 text-slate-400">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                   <AlertTriangle size={32} className="opacity-20" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black uppercase tracking-widest">No stock found</p>
                  <p className="text-xs font-medium">Verify your filters or search terms</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockBalancePage;

