import React, { useState, useEffect } from "react";
import axios from "../../utils/api";
import DataTable from "../../components/ui/DataTable/DataTable";
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
import { renderDimensions } from "../../utils/dimensionUtils";

const MovementSerialTable = ({ movement }) => {
  if (!movement.serials || movement.serials.length === 0) {
    return (
      <div className="p-4 text-center text-slate-400 text-xs">
        No individual serial tracking records for this movement
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700 overflow-hidden animate-in slide-in-from-top-4 duration-300">
      <DataTable
        title="Tracking Serial Numbers (ST Codes)"
        titleIcon={<Boxes size={14} />}
        titleExtra={
          <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded border border-slate-100 dark:border-slate-700">
            {movement.serials.length} items moved
          </div>
        }
        data={movement.serials}
        columns={[
          {
            key: "serial_short",
            label: "Item Code",
            render: (_, st) => st.serial_number.replace(/^ST-/, "")
          },
          {
            key: "material_name",
            label: "Material Name",
            render: () => movement.material_name
          },
          {
            key: "dimensions",
            label: "Dimensions",
            render: (_, st) => (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {renderDimensions(st)}
              </div>
            )
          },
          {
            key: "serial_number",
            label: "ST Number",
            className: "text-right",
            render: (val) => (
              <span className="p-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded text-xs border border-indigo-100 dark:border-indigo-800">
                {val}
              </span>
            )
          }
        ]}
      />
    </div>
  );
};

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
            item_group: item.item_group,
            length: item.length,
            width: item.width,
            thickness: item.thickness,
            diameter: item.diameter,
            outer_diameter: item.outer_diameter,
            height: item.height,
            web_thickness: item.web_thickness,
            flange_thickness: item.flange_thickness,
            side_s: item.side_s,
            side_s1: item.side_s1,
            side_s2: item.side_s2,
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
      <DataTable
        title="Material Movements"
        titleIcon={<Activity size={15} />}
        titleExtra={
          <div className="flex items-center gap-2 ml-4">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-all shadow-sm flex items-center gap-2 text-xs"
            >
              <Plus size={14} /> Add Entry
            </button>
          </div>
        }
        filters={[
          {
            key: "type",
            label: "Movement Type",
            options: [
              { label: "Receipt (IN)", value: "IN" },
              { label: "Issue (OUT)", value: "OUT" },
            ]
          },
          {
             key: "project_name",
             label: "Project",
             options: Array.from(new Set(movements.map(m => m.project_name).filter(Boolean))).map(p => ({ label: p, value: p }))
          }
        ]}
        data={movements}
        columns={[
          {
            key: "date",
            label: "Movement Log",
            render: (val, m) => (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar size={12} className="text-slate-400" />
                  <p className="text-xs text-slate-900 dark:text-white ">{val}</p>
                </div>
                <p className="text-xs text-slate-400">{m.reference_type}</p>
              </div>
            )
          },
          {
            key: "material_name",
            label: "Material Identity",
            render: (val, m) => (
              <div className="space-y-1">
                <p className="text-xs text-slate-900 dark:text-white  line-clamp-1">{val}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-blue-600 bg-blue-50 p-1 rounded border border-blue-100 font-mono">
                    {m.item_code}
                  </span>
                </div>
              </div>
            )
          },
          {
            key: "dimensions",
            label: "Dimensions",
            render: (_, m) => (
              <div className="text-slate-500 dark:text-slate-400 text-xs">
                {renderDimensions(m)}
              </div>
            )
          },
          {
            key: "project_name",
            label: "Project & Vendor Context",
            render: (val, m) => (
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-indigo-500" />
                  <p className="text-slate-900 dark:text-white text-xs leading-tight line-clamp-1">
                    {val || "GENERAL PROJECT STOCK"}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Zap size={10} className="text-slate-300" />
                  <p className="text-xs text-slate-400 truncate max-w-[150px]">
                    {m.vendor_name || "N/A"}
                  </p>
                </div>
              </div>
            )
          },
          {
            key: "type",
            label: "Type",
            className: "text-center",
            render: (val) => (
              <span className={`px-2 py-0.5 rounded-full text-[10px]  border ${
                val === 'IN' 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                  : 'bg-red-50 text-red-600 border-red-100'
              }`}>
                {val === 'IN' ? 'Receipt (IN)' : 'Issue (OUT)'}
              </span>
            )
          },
          {
            key: "quantity",
            label: "Quantity",
            className: "text-right",
            render: (val, m) => (
              <div className="flex gap-1 items-end justify-end">
                <span className={`text-xs  ${m.type === 'IN' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {m.type === 'IN' ? '+' : '-'}{Number(val).toLocaleString(undefined, { minimumFractionDigits: 3 })}
                </span>
                <span className="text-[10px] text-slate-400 uppercase">{m.uom}</span>
              </div>
            )
          },
          {
            key: "reference_no",
            label: "Reference",
            render: (val, m) => (
              <div className="space-y-1">
                <p className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 w-fit ">
                  {val}
                </p>
                {m.remarks && (
                  <p className="text-[10px] text-slate-400 italic truncate max-w-[150px]">
                    {m.remarks}
                  </p>
                )}
              </div>
            )
          },
          {
            key: "actions",
            label: "Actions",
            className: "text-right",
            render: () => (
              <div className="flex justify-end gap-2">
                <button className="p-1.5 text-slate-400 hover:text-red-600 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            )
          }
        ]}
        renderRowDetail={(m) => <MovementSerialTable movement={m} />}
        searchPlaceholder="Search by code, material, project, or reference..."
      />

      
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

