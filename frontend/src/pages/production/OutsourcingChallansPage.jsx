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
  Loader2,
  Calendar,
  Download
} from "lucide-react";
import Card from "../../components/ui/Card";
import DataTable from "../../components/ui/DataTable/DataTable";
import SearchableSelect from "../../components/ui/SearchableSelect";
import axios from "../../utils/api";
import { toast } from "react-toastify";
import { exportChallanToPDF } from "../../utils/challanPdfExport";
import ViewOutwardChallanModal from "../../components/production/ViewOutwardChallanModal";
import ViewInwardChallanModal from "../../components/production/ViewInwardChallanModal";
import CreateInwardChallanModal from "../../components/production/CreateInwardChallanModal";

const OutsourcingChallansPage = ({ isAccountantView = false }) => {
  const [activeTab, setActiveTab] = useState("outward");
  const [selectedProject, setSelectedProject] = useState("all");
  const [loading, setLoading] = useState(false);
  const [outwardChallans, setOutwardChallans] = useState([]);
  const [inwardChallans, setInwardChallans] = useState([]);
  const [projects, setProjects] = useState([]);

  // Modal State
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isInwardViewModalOpen, setIsInwardViewModalOpen] = useState(false);
  const [isCreateInwardModalOpen, setIsCreateInwardModalOpen] = useState(false);
  const [selectedChallanId, setSelectedChallanId] = useState(null);
  const [selectedOutwardChallan, setSelectedOutwardChallan] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [outwardRes, inwardRes, projectsRes] = await Promise.all([
        axios.get("/production/outward-challans"),
        axios.get("/production/inward-challans"),
        axios.get("/production/root-cards")
      ]);

      if (outwardRes.data.success) {
        setOutwardChallans(outwardRes.data.challans || []);
      }
      if (inwardRes.data.success) {
        setInwardChallans(inwardRes.data.challans || []);
      }
      if (projectsRes.data.success) {
        setProjects(projectsRes.data.rootCards || []);
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

  const handleDownload = async (row) => {
    try {
      setDownloading(true);
      const response = await axios.get(`/production/outward-challans/${row.id}`);
      if (response.data.success) {
        exportChallanToPDF(response.data.challan, response.data.items || []);
        toast.success("Downloading challan...");
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  const outwardColumns = [
    {
      key: "challan_no",
      label: "Challan Info",
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 dark:text-white">{row.challan_no}</span>
          <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
            <Calendar size={10} /> {new Date(row.challan_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      )
    },
    {
      key: "project_name",
      label: "Project / Ref",
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-900 dark:text-white">{val || "N/A"}</span>
        </div>
      )
    },
    {
      key: "operation_name",
      label: "Operation",
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded w-fit">{val}</span>
          {row.supply_order_no && (
            <span className="text-[10px] text-slate-500 mt-1">SO: {row.supply_order_no}</span>
          )}
        </div>
      )
    },
    {
      key: "vendor_name",
      label: "Vendor",
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{row.vendor_name}</span>
          <span className="text-[10px] text-slate-400 truncate max-w-[150px]">{row.vendor_address || "No address"}</span>
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (val, row) => (
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
          val === "SUBMITTED" ? "bg-blue-50 text-blue-600 border-blue-100" : 
          val === "DRAFT" ? "bg-slate-50 text-slate-600 border-slate-100" :
          "bg-emerald-50 text-emerald-600 border-emerald-100"
        }`}>{val}</span>
      )
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (val, row) => (
        <div className="flex items-center justify-end gap-1">
          <button 
            onClick={() => {
              setSelectedChallanId(row.id);
              setIsViewModalOpen(true);
            }}
            className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" 
            title="View Details"
          >
            <Eye size={16} />
          </button>
          <button 
            onClick={() => handleDownload(row)}
            disabled={downloading}
            className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors disabled:opacity-50" 
            title="Download PDF"
          >
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          </button>
          {!isAccountantView && row.status !== "RECEIVED" && (
            <button 
              onClick={() => {
                setSelectedOutwardChallan(row);
                setIsCreateInwardModalOpen(true);
              }}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" 
              title="Create Inward Challan"
            >
              <Truck size={16} />
            </button>
          )}
          {!isAccountantView && (
            <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Delete">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )
    }
  ];

  const inwardColumns = [
    {
      key: "challan_no",
      label: "Challan Info",
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 dark:text-white">{row.challan_no}</span>
          <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
            <Calendar size={10} /> {new Date(row.challan_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      )
    },
    {
      key: "outward_challan_no",
      label: "Ref Outward",
      render: (val) => (
        <span className="text-xs font-semibold text-indigo-600">{val || "N/A"}</span>
      )
    },
    {
      key: "project_name",
      label: "Project",
      render: (val) => (
        <span className="text-sm font-bold text-slate-900 dark:text-white">{val || "N/A"}</span>
      )
    },
    {
      key: "vendor_name",
      label: "Vendor",
      render: (val) => (
        <span className="text-xs text-slate-700 dark:text-slate-300">{val}</span>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (val) => (
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
          val === "SUBMITTED" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
          "bg-slate-50 text-slate-600 border-slate-100"
        }`}>{val}</span>
      )
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (val, row) => (
        <div className="flex items-center justify-end gap-1">
          <button 
            onClick={() => {
              setSelectedChallanId(row.id);
              setIsInwardViewModalOpen(true);
            }}
            className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" 
            title="View Details"
          >
            <Eye size={16} />
          </button>
        </div>
      )
    }
  ];

  const filteredChallans = (activeTab === "outward" ? outwardChallans : inwardChallans).filter(challan => {
    return selectedProject === "all" || challan.root_card_id === selectedProject;
  });

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
          <div className="flex-[2]">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Project</label>
            <SearchableSelect
              options={[
                { value: "all", label: "All Projects" },
                ...projects.map(p => ({ value: p.id, label: p.project_name, subLabel: p.id }))
              ]}
              value={selectedProject}
              onChange={(val) => setSelectedProject(val)}
              placeholder="All Projects"
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setSelectedProject("all");
              }}
              className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-6 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700"
            >
              Reset Filters
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
              {outwardChallans.filter(c => selectedProject === "all" || c.root_card_id === selectedProject).length}
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
              {inwardChallans.filter(c => selectedProject === "all" || c.root_card_id === selectedProject).length}
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
            data={filteredChallans}
            emptyMessage={`No ${activeTab} challans found`}
          />
        )}
      </Card>

      <ViewOutwardChallanModal 
        isOpen={isViewModalOpen}
        onClose={() => {
           setIsViewModalOpen(false);
           setSelectedChallanId(null);
        }}
        challanId={selectedChallanId}
      />

      <ViewInwardChallanModal
        isOpen={isInwardViewModalOpen}
        onClose={() => {
           setIsInwardViewModalOpen(false);
           setSelectedChallanId(null);
        }}
        challanId={selectedChallanId}
      />

      <CreateInwardChallanModal
        isOpen={isCreateInwardModalOpen}
        onClose={() => {
          setIsCreateInwardModalOpen(false);
          setSelectedOutwardChallan(null);
        }}
        outwardChallan={selectedOutwardChallan}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default OutsourcingChallansPage;
