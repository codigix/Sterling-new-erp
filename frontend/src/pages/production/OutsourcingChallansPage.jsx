import React, { useState, useEffect, useCallback } from "react";
import { 
  Filter, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  MoreVertical, 
  Plus,
  Maximize2,
  Trash2,
  Edit2,
  Eye,
  Truck,
  RotateCcw,
  Loader2
} from "lucide-react";
import Card from "../../components/ui/Card";
import DataTable from "../../components/ui/DataTable/DataTable";
import SearchableSelect from "../../components/ui/SearchableSelect";
import axios from "../../utils/api";
import { toast } from "react-toastify";

const OutsourcingChallansPage = () => {
  const [activeTab, setActiveTab] = useState("outward");
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedOperation, setSelectedOperation] = useState("all");
  const [loading, setLoading] = useState(false);
  const [outwardChallans, setOutwardChallans] = useState([]);
  const [inwardChallans, setInwardChallans] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get("/production/outward-challans");
      if (response.data.success) {
        // For now, only outward challans are implemented in the backend
        setOutwardChallans(response.data.challans || []);
      }
    } catch (error) {
      console.error("Error fetching challans:", error);
      toast.error("Failed to load challans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const outwardColumns = [
    {
      key: "challan_no",
      label: "Challan Info",
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-900 dark:text-white">{row.challan_no}</span>
          <span className="text-xs text-slate-500 flex items-center gap-1 mt-1">
            <RotateCcw size={12} /> {new Date(row.challan_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      )
    },
    {
      key: "operation_name",
      label: "Operation",
      render: (val, row) => (
        <span className="text-slate-700 dark:text-slate-300 font-medium">{val}</span>
      )
    },
    {
      key: "vendor_name",
      label: "Vendor",
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="text-slate-700 dark:text-slate-300">{row.vendor_name}</span>
          <span className="text-xs text-slate-500">ID: {row.vendor_id || "N/A"}</span>
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (val, row) => (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded w-fit ${
          val === "SUBMITTED" ? "bg-blue-50 text-blue-600" : 
          val === "DRAFT" ? "bg-slate-100 text-slate-600" :
          "bg-emerald-50 text-emerald-600"
        }`}>{val}</span>
      )
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (val, row) => (
        <div className="flex items-center justify-end gap-2">
          <button className="p-1 text-indigo-600 hover:bg-indigo-50 rounded" title="View Details">
            <Eye size={18} />
          </button>
          <button className="p-1 text-slate-400 hover:bg-slate-50 rounded" title="Print/Download">
            <Maximize2 size={16} />
          </button>
        </div>
      )
    }
  ];

  const inwardColumns = [
    {
      key: "id",
      label: "Challan Info",
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-900 dark:text-white">{row.id}</span>
          <span className="text-xs text-slate-500 flex items-center gap-1 mt-1">
            <RotateCcw size={12} /> {row.date}
          </span>
        </div>
      )
    },
    // ... rest of columns can remain as placeholders for now
  ];

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Outsourcing Challans
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage material movement for external processing</p>
        </div>
        <button 
          onClick={fetchData}
          className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RotateCcw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <Card className="mb-6">
        <div className="p-4 flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Operation</label>
            <SearchableSelect
              options={[{ value: "all", label: "All Operations" }]}
              value={selectedOperation}
              onChange={(val) => setSelectedOperation(val)}
              placeholder="All Operations"
            />
          </div>
          <div className="flex gap-2">
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20">
              <Search size={18} />
              Apply
            </button>
            <button className="text-slate-500 px-4 py-2 hover:bg-slate-100 rounded-lg transition-colors">
              Reset
            </button>
          </div>
        </div>
      </Card>

      <div className="mb-6">
        <div className="flex items-center gap-8 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab("outward")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 transition-colors relative ${
              activeTab === "outward" 
                ? "text-indigo-600" 
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <ArrowUpRight size={18} className={activeTab === "outward" ? "text-indigo-600" : "text-slate-400"} />
            Outward Challans
            <span className={`px-2 py-0.5 rounded text-[10px] ${
              activeTab === "outward" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
            }`}>
              {outwardChallans.length}
            </span>
            {activeTab === "outward" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("inward")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 transition-colors relative ${
              activeTab === "inward" 
                ? "text-emerald-600" 
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <ArrowDownLeft size={18} className={activeTab === "inward" ? "text-emerald-600" : "text-slate-400"} />
            Inward Challans
            <span className={`px-2 py-0.5 rounded text-[10px] ${
              activeTab === "inward" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
            }`}>
              {inwardChallans.length}
            </span>
            {activeTab === "inward" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-t-full"></div>
            )}
          </button>
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
            <p className="text-xs text-slate-400">Loading challans...</p>
          </div>
        ) : (
          <DataTable
            columns={activeTab === "outward" ? outwardColumns : inwardColumns}
            data={activeTab === "outward" ? outwardChallans : inwardChallans}
            emptyMessage={`No ${activeTab} challans found`}
          />
        )}
      </Card>
    </div>
  );
};

export default OutsourcingChallansPage;
