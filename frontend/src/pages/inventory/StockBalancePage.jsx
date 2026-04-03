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
          length_mm: item.length_mm || item.length,
          width_mm: item.width_mm || item.width,
          thickness_mm: item.thickness_mm || item.thickness,
          diameter_mm: item.diameter_mm || item.diameter,
          outer_diameter_mm: item.outer_diameter_mm || item.outer_diameter || item.outerDiameter,
          height_mm: item.height_mm || item.height,
          length: Number(item.length_mm || item.length || 0),
          width: Number(item.width_mm || item.width || 0),
          thickness: Number(item.thickness_mm || item.thickness || 0),
          diameter: Number(item.diameter_mm || item.diameter || 0),
          outer_diameter: Number(item.outer_diameter_mm || item.outer_diameter || item.outerDiameter || 0),
          height: Number(item.height_mm || item.height || 0),
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
        <p className="text-xs  text-slate-400  ">Calculating Live Inventory...</p>
      </div>
    );
  }

  const totalItems = stockData.length;
  const totalBalance = stockData.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockItems = stockData.filter(item => item.quantity < item.reorderLevel || item.quantity === 0).length;

  return (
    <div className="space-y-2 p-4 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded bg-cyan-600 flex items-center justify-center text-white shadow-lg shadow-cyan-200 dark:shadow-none">
            <Warehouse size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs  text-cyan-600 dark:text-cyan-400  ">Inventory</span>
              <span className="text-slate-300 dark:text-slate-500">›</span>
              <span className="text-xs  text-slate-500 dark:text-slate-400  ">Stock Balance</span>
            </div>
            <h1 className="text-md text-slate-900 dark:text-white ">
              Inventory Ledger
            </h1>
            <p className="text-xs  text-slate-500 dark:text-slate-400">
              Real-time stock levels and material tracking
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchMaterials} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-500 hover:text-cyan-600 transition-all hover:">
            <RefreshCw size={15} />
          </button>
          <button className="flex items-center gap-2 p-2 bg-slate-900 dark:bg-slate-700 text-white rounded  text-xs   hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10">
            <Download size={16} /> Export Data
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-800  flex items-center justify-between group hover:border-cyan-200 transition-all duration-300">
          <div>
            <p className="text-xs  text-slate-400   mb-2">Total Materials</p>
            <h3 className="text-xl  text-slate-900 dark:text-white leading-none ">{totalItems}</h3>
          </div>
          <div className="p-4 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded group-hover:scale-110 transition-transform">
            <Package size={15} />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-800  flex items-center justify-between group hover:border-emerald-200 transition-all duration-300">
          <div>
            <p className="text-xs  text-slate-400   mb-2">Aggregate Balance</p>
            <h3 className="text-xl  text-slate-900 dark:text-white leading-none ">{totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded group-hover:scale-110 transition-transform">
            <Calculator size={15} />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-800  flex items-center justify-between group hover:border-red-200 transition-all duration-300">
          <div>
            <p className="text-xs  text-slate-400   mb-2">Low Stock Alerts</p>
            <h3 className="text-xl  text-red-600 leading-none ">{lowStockItems}</h3>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded group-hover:scale-110 transition-transform animate-pulse">
            <AlertTriangle size={15} />
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="">
        {/* Table Controls */}
        <div className=" border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-4 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search by material description..."
                className="w-full pl-12 pr-4 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs  focus:ring-2 focus:ring-cyan-500 outline-none  transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs  text-slate-400  ">Filter:</label>
              <select className="px-6 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs  text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-cyan-500 ">
                <option>ALL MATERIALS</option>
                <option>PLATES & BLOCKS</option>
                <option>ROUND BARS</option>
                <option>PIPES & FITTINGS</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto my-5">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <th className="p-2 text-xs  text-slate-400   text-center"></th>
                <th className="p-2 text-xs  text-slate-400  ">
                  <div className="flex items-center gap-2 cursor-pointer hover:text-cyan-600 transition-colors">
                    Item name <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="p-2 text-xs  text-slate-400   text-right">
                  Stock Balance
                </th>
                <th className="p-2 text-xs  text-slate-400   text-center">
                  Unit
                </th>
                <th className="p-2 text-xs  text-slate-400   text-center">
                  Last Update
                </th>
                <th className="p-2 text-xs  text-slate-400   text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredData.map((item) => {
    const isExpanded = expandedItem === item.id;
    const renderDimensions = (it, fallback = null) => {
      const dims = [];
      const l = Number(it.length_mm || it.length || (fallback?.length_mm || fallback?.length || 0));
      const w = Number(it.width_mm || it.width || (fallback?.width_mm || fallback?.width || 0));
      const t = Number(it.thickness_mm || it.thickness || (fallback?.thickness_mm || fallback?.thickness || 0));
      const d = Number(it.diameter_mm || it.diameter || (fallback?.diameter_mm || fallback?.diameter || 0));
      const od = Number(it.outer_diameter_mm || it.outer_diameter || it.outerDiameter || (fallback?.outer_diameter_mm || fallback?.outer_diameter || fallback?.outerDiameter || 0));
      const h = Number(it.height_mm || it.height || (fallback?.height_mm || fallback?.height || 0));

      if (l) dims.push(`L:${l}`);
      if (w) dims.push(`W:${w}`);
      if (t) dims.push(`T:${t}`);
      if (d) dims.push(`D:${d}`);
      if (od) dims.push(`OD:${od}`);
      if (h) dims.push(`H:${h}`);
      return dims.length > 0 ? dims.join(" ") : "-";
    };

    return (
      <React.Fragment key={item.id}>
        <tr className={`group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors ${isExpanded ? 'bg-cyan-50/20 dark:bg-cyan-900/10' : ''}`}>
          <td className="p-2 text-center">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setExpandedItem(isExpanded ? null : item.id);
              }}
              className={`p-1 rounded transition-all ${isExpanded ? 'bg-cyan-100 text-cyan-600' : 'bg-slate-100 text-slate-400'}`}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </td>
          <td className="p-2">
            <div className="space-y-1">
              <p className="text-xs  text-slate-900 dark:text-white   line-clamp-2 leading-tight">
                {item.name}
              </p>
              <div className="text-[10px] text-blue-600 font-mono">
                {renderDimensions(item)}
              </div>
            </div>
          </td>
                      <td className="p-2 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded  ${item.quantity <= item.reorderLevel ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                            <span className={`text-xs  ${item.quantity <= item.reorderLevel ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
                              {item.quantity.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                            </span>
                          </div>
                          {item.quantity <= item.reorderLevel && (
                            <span className="text-xs  text-red-500  er">Below Threshold</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        <span className="text-xs  text-slate-400  ">{item.unit}</span>
                      </td>
                      <td className="p-2 text-center">
                        <p className="text-xs  text-slate-500 dark:text-slate-400">{item.lastUpdated}</p>
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex justify-end gap-2  group-hover:opacity-100 transition-opacity">
                          <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                            <MoreVertical size={15} />
                          </button>
                          <button 
                            onClick={() => handleDeleteMaterial(item.id)}
                            className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expandable Serial Breakdown */}
                    {isExpanded && (
                      <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                        <td colSpan="7" className="p-2">
                          <div className="bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700  overflow-hidden animate-in slide-in-from-top-4 duration-300">
                             <div className="p-2 border-b border-slate-50 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                                <h4 className="text-xs  text-slate-400   flex items-center gap-2">
                                  <Boxes size={14} /> Itemized Pieces (Available)
                                </h4>
                                <div className="text-xs  text-slate-500 bg-white dark:bg-slate-900 px-3 py-1 rounded  border border-slate-100 dark:border-slate-700">
                                  {item.serials?.length || 0} units in stock
                                </div>
                             </div>
                             
                             <div className="overflow-hidden">
                               <table className="w-full text-left text-xs">
                                 <thead>
                                   <tr className="bg-slate-50/30 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-700">
                                     <th className="p-2  text-slate-400   text-center">#</th>
                                     <th className="p-2  text-slate-400  ">Item Code</th>
                                     <th className="p-2  text-slate-400  ">Item Name</th>
                                     <th className="p-2  text-slate-400  ">Dimensions</th>
                                     <th className="p-2  text-cyan-500   text-right">ST Number</th>
                                   </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-50 dark:divide-slate-700 ">
                                   {item.serials && item.serials.length > 0 ? (
                                     item.serials.map((st, sIdx) => (
                                       <tr key={sIdx} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors">
                                         <td className="p-2 text-slate-400  text-center">{sIdx + 1}</td>
                                         <td className="p-2  text-slate-700 dark:text-slate-300  ">
                                           {st.serial_number.replace(/^ST-/, "")}
                                         </td>
                                         <td className="p-2 text-slate-500 dark:text-slate-400  ">
                                           {item.name}
                                         </td>
                                         <td className="p-2">
                                           <div className="text-[10px] text-blue-600 font-mono">
                                             {renderDimensions(st, item)}
                                           </div>
                                         </td>
                                         <td className="p-2 text-right">
                                           <span className="p-1 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 rounded text-xs    border border-cyan-100 dark:border-cyan-800">
                                             {st.serial_number}
                                           </span>
                                         </td>
                                       </tr>
                                     ))
                                   ) : (
                                     <tr>
                                       <td colSpan="5" className="p-2 text-center text-slate-400    text-xs">
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
            <div className="p-5 text-center">
              <div className="flex flex-col items-center gap-4 text-slate-400">
                <div className="p-2 rounded  bg-slate-50 flex items-center justify-center">
                   <AlertTriangle size={15} className="opacity-20" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm   ">No stock found</p>
                  <p className="text-xs ">Verify your filters or search terms</p>
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

