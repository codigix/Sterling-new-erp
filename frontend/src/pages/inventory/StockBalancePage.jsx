import React, { useState, useEffect } from "react";
import axios from "../../utils/api";
import { renderDimensions } from "../../utils/dimensionUtils";
import DataTable from "../../components/ui/DataTable/DataTable";
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

const SerialDetailTable = ({ item }) => {
  if (!item.serials || item.serials.length === 0) {
    return (
      <div className="p-4 text-center text-slate-400 text-xs">
        No individual pieces tracking found for this item
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700 overflow-hidden animate-in slide-in-from-top-4 duration-300">
      <DataTable
        title="Itemized Pieces (Available)"
        titleIcon={<Boxes size={14} />}
        titleExtra={
          <div className="text-[10px] text-slate-500 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-700">
            {item.serials.length} units in stock
          </div>
        }
        data={item.serials}
        columns={[
          {
            key: "serial_number_short",
            label: "Item Code",
            render: (_, st) => st.serial_number.replace(/^ST-/, "")
          },
          {
            key: "item_name",
            label: "Item Name",
            render: () => item.name
          },
          {
            key: "dimensions",
            label: "Dimensions",
            render: (_, st) => (
              <div className="text-xs text-blue-600 font-mono">
                {renderDimensions(st)}
              </div>
            )
          },
          {
            key: "weight",
            label: "Weight",
            className: "text-center",
            render: (_, st) => {
              const pieceWeight = st.unit_weight || st.total_weight || item.unit_weight || 0;
              return `${Number(pieceWeight).toFixed(3)} Kg`;
            }
          },
          {
            key: "serial_number",
            label: "ST Number",
            className: "text-right",
            render: (val) => (
              <span className="p-1 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 rounded text-xs border border-cyan-100 dark:border-cyan-800">
                {val}
              </span>
            )
          }
        ]}
      />
    </div>
  );
};

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

        // If main item is missing dimensions but has serials, try to pick from first serial
        const firstSerial = item.serials && item.serials.length > 0 ? item.serials[0] : {};
        
        const getDim = (field, altField) => {
          const val = item[field] || item[altField] || firstSerial[field] || firstSerial[altField] || 0;
          return Number(val);
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
          item_group: (item.item_group || item.itemGroup || item.category || "").toUpperCase(),
          unit_weight: item.unit_weight || 0,
          total_weight: item.total_weight || 0,
          length: getDim('length', 'length_mm'),
          width: getDim('width', 'width_mm'),
          thickness: getDim('thickness', 'thickness_mm'),
          diameter: getDim('diameter', 'diameter_mm'),
          outer_diameter: getDim('outer_diameter', 'outer_diameter_mm'),
          height: getDim('height', 'height_mm'),
          side_s: getDim('side_s', 'sideS'),
          side1: getDim('side1', 'sideS1'),
          side2: getDim('side2', 'sideS2'),
          web_thickness: getDim('web_thickness', 'tw'),
          flange_thickness: getDim('flange_thickness', 'tf'),
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
      <DataTable
        title="Inventory Ledger"
        titleIcon={<Warehouse size={15} />}
        titleExtra={
          <div className="flex items-center gap-2 ml-4">
            <button onClick={fetchMaterials} className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-500 hover:text-cyan-600 transition-all">
              <RefreshCw size={14} />
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white rounded text-xs hover:bg-slate-800 transition-all shadow-sm">
              <Download size={14} /> Export Data
            </button>
          </div>
        }
        filters={[
          {
            key: "item_group",
            label: "Category",
            options: Array.from(new Set(stockData.map(item => item.item_group).filter(Boolean))).map(cat => ({ label: cat, value: cat }))
          }
        ]}
        data={stockData}
        columns={[
              {
                key: "name",
                label: "Item name",
                render: (_, item) => (
                  <div className="space-y-1">
                    <p className="text-xs  text-slate-900 dark:text-white   line-clamp-2 leading-tight">
                      {item.name}
                    </p>
                    <div className="text-xs text-blue-600 font-mono">
                      {renderDimensions(item)}
                    </div>
                  </div>
                )
              },
              {
                key: "quantity",
                label: "Stock Balance",
                className: "text-right",
                render: (val, item) => (
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded  ${val <= item.reorderLevel ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                      <span className={`text-xs  ${val <= item.reorderLevel ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
                        {val.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                      </span>
                    </div>
                    {val <= item.reorderLevel && (
                      <span className="text-xs  text-red-500  er">Below Threshold</span>
                    )}
                  </div>
                )
              },
              {
                key: "total_weight",
                label: "Weight (Kg)",
                className: "text-center",
                render: (_, item) => (
                  <div className="flex flex-col items-center">
                     <span className="text-xs  text-slate-900 dark:text-white">
                        {Number(item.total_weight || 0).toFixed(3)} Kg
                     </span>
                     <span className="text-xs text-slate-400">
                        Unit: {Number(item.unit_weight || 0).toFixed(3)}
                     </span>
                  </div>
                )
              },
              {
                key: "unit",
                label: "Unit",
                className: "text-center",
                render: (val) => <span className="text-xs  text-slate-400  ">{val}</span>
              },
              {
                key: "lastUpdated",
                label: "Last Update",
                className: "text-center",
                render: (val) => <p className="text-xs  text-slate-500 dark:text-slate-400">{val}</p>
              },
              {
                key: "actions",
                label: "Actions",
                className: "text-right",
                render: (_, item) => (
                  <div className="flex justify-end gap-2">
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
                )
              }
            ]}
            renderRowDetail={(item) => (
              <div className="p-2 bg-slate-50/50 dark:bg-slate-900/50">
                <SerialDetailTable item={item} />
              </div>
            )}
            emptyMessage="No stock found. Verify your filters or search terms"
          />
        </div>
      );
    };

export default StockBalancePage;

