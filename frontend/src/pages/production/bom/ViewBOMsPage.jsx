import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  Search, 
  Eye, 
  Download, 
  Trash2, 
  AlertCircle, 
  Plus, 
  Edit2, 
  FileText, 
  Send, 
  TrendingUp,
  Filter,
  MoreVertical,
  ClipboardList
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "../../../utils/api";
import Swal from "sweetalert2";
import Badge from "../../../components/ui/Badge";
import DataTable from "../../../components/ui/DataTable/DataTable";
import Card, { CardContent } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import SearchableSelect from "../../../components/ui/SearchableSelect";
import MaterialRequestModal from "./MaterialRequestModal";

const ViewBOMsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rootCardIdFromUrl = searchParams.get("rootCardId");
  const taskIdFromUrl = searchParams.get("taskId");
  const taskTitleFromUrl = searchParams.get("taskTitle") || "";
  const isSendToAdminTask = taskTitleFromUrl.toLowerCase().includes("send bom");

  const [rootCardFilter, setRootCardFilter] = useState(null);
  const [boms, setBoms] = useState([]);
  const [rootCards, setRootCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedBOM, setSelectedBOM] = useState(null);

  useEffect(() => {
    if (rootCardIdFromUrl) {
      setRootCardFilter(rootCardIdFromUrl);
    }
  }, [rootCardIdFromUrl]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bomRes, rcRes] = await Promise.all([
        axios.get("/engineering/bom/comprehensive"),
        axios.get("/root-cards", {
          params: { assignedOnly: true }
        })
      ]);
      setBoms(bomRes.data.boms || []);
      setRootCards(rcRes.data.rootCards || rcRes.data || []);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to load BOMs or Root Cards");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (bomId) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete BOM",
      text: "Are you sure you want to delete this comprehensive BOM? This action cannot be undone.",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`/engineering/bom/comprehensive/${bomId}`);
      setBoms(boms.filter(b => b.id !== bomId));
      Swal.fire({
        icon: "success",
        title: "Deleted Successfully",
        text: "BOM has been deleted.",
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err) {
      console.error("Failed to delete BOM:", err);
      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text: "Could not delete BOM. Please try again.",
      });
    }
  };
  
  const handleSendToAdmin = async (bomId) => {
    const result = await Swal.fire({
      icon: "question",
      title: "Send BOM to Admin",
      text: "This will set the BOM status to 'active' and notify the admin. Are you sure?",
      showCancelButton: true,
      confirmButtonColor: "#3b82f6",
      confirmButtonText: "Yes, Send",
    });

    if (!result.isConfirmed) return;

    try {
      await axios.patch(`/engineering/bom/comprehensive/${bomId}/status`, {
        status: "active"
      });
      
      // Update local state
      setBoms(boms.map(b => b.id === bomId ? { ...b, status: 'active' } : b));
      
      // If we have a taskId from the URL, try to complete it
      if (taskIdFromUrl) {
        try {
          await axios.patch(`/department/portal/tasks/${taskIdFromUrl}`, {
            status: "completed"
          });
        } catch (taskErr) {
          console.error("Failed to complete task:", taskErr);
        }
      }

      Swal.fire({
        icon: "success",
        title: "Sent Successfully",
        text: "BOM has been sent to admin.",
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err) {
      console.error("Failed to send BOM:", err);
      Swal.fire({
        icon: "error",
        title: "Failed to Send",
        text: "Could not send BOM to admin. Please try again.",
      });
    }
  };

  const handleMaterialRequest = async (bomId) => {
    try {
      setLoading(true);
      const response = await axios.get(`/engineering/bom/comprehensive/${bomId}`);
      setSelectedBOM(response.data.bom || response.data);
      setIsRequestModalOpen(true);
    } catch (err) {
      console.error("Failed to fetch BOM details for request:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load BOM details. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredBOMs = useMemo(() => {
    if (!isSendToAdminTask && (!rootCardFilter || rootCardFilter === "")) return boms;

    return boms.filter((bom) => {
      // If it's the "Send to Admin" task, show all BOMs for this specific root card
      if (isSendToAdminTask) {
        return String(bom.rootCardId) === String(rootCardIdFromUrl);
      }

      const matchesRootCard = rootCardFilter && String(bom.rootCardId) === String(rootCardFilter);
      
      return matchesRootCard;
    });
  }, [boms, rootCardFilter, isSendToAdminTask, rootCardIdFromUrl]);

  const rootCardOptions = useMemo(() => {
    const options = (Array.isArray(rootCards) ? rootCards : []).map(rc => ({
      label: rc.project_name || rc.title || 'N/A',
      value: String(rc.id)
    }));
    return [{ label: "All Projects / Root Cards", value: "" }, ...options];
  }, [rootCards]);

  const stats = useMemo(() => {
    const total = boms.length;
    const active = boms.filter(b => b.status === 'active').length;
    const draft = boms.filter(b => b.status === 'draft').length;
    const totalCost = boms.reduce((acc, bom) => acc + (parseFloat(bom.totalCost) || 0), 0);

    return [
      { label: "Total BOMs", value: total, icon: FileText, color: "blue" },
      { label: "Active BOMs", value: active, icon: Send, color: "green" },
      { label: "Draft BOMs", value: draft, icon: AlertCircle, color: "amber" },
      { label: "Total Cost", value: `₹${totalCost.toLocaleString()}`, icon: TrendingUp, color: "purple" },
    ];
  }, [boms]);

  const rootCardMap = useMemo(() => {
    const map = {};
    (Array.isArray(rootCards) ? rootCards : []).forEach(rc => {
      map[rc.id] = rc;
    });
    return map;
  }, [rootCards]);

  const columns = [
    {
      key: "rootCardId",
      label: "PROJECT / ROOT CARD",
      render: (val) => {
        const rc = rootCardMap[val];
        return (
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 text-xs truncate max-w-[150px]" title={rc?.project_name}>
              {rc?.project_name || 'N/A'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {rc?.title || rc?.id || 'N/A'}
            </span>
          </div>
        );
      }
    },
    {
      key: "bomNumber",
      label: "BOM NUMBER",
      render: (val, row) => {
        const baseNumber = val.includes('-V') ? val.split('-V')[0] : val;
        return (
          <span className="font-bold text-blue-600 cursor-pointer hover:underline" onClick={() => navigate(`/department/production/bom/view/${row.id}`)}>
            {baseNumber}
          </span>
        );
      }
    },
    {
      key: "bomNumber",
      label: "REVISION",
      render: (val) => {
        const parts = val.split('-V');
        return (
          <Badge variant="secondary" className="font-mono">
            {parts.length > 1 ? `V${parts[1]}` : 'V1'}
          </Badge>
        );
      }
    },
    {
      key: "totalCost",
      label: "TOTAL COST",
      render: (val) => (
        <span className="font-bold text-slate-900">
          ₹{(parseFloat(val) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      key: "status",
      label: "STATUS",
      render: (val) => (
        <Badge 
          variant={
            val === 'active' ? 'success' : 
            val === 'approved' ? 'primary' : 
            val === 'request_sent' ? 'info' : 
            'warning'
          }
          className="capitalize text-[10px]"
        >
          {val?.replace('_', ' ')}
        </Badge>
      )
    },
    {
      key: "isActive",
      label: "ACTIVE",
      render: (val) => (
        <div className="flex items-center justify-center">
          {val ? (
            <Badge 
              variant="success"
              className="px-3 py-1 bg-emerald-100 text-emerald-700 border-emerald-200 animate-pulse-slow flex items-center gap-1.5"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              Active
            </Badge>
          ) : (
            <Badge 
              variant="secondary"
              className="px-3 py-1 bg-slate-100 text-slate-500 border-slate-200 opacity-60"
            >
              Inactive
            </Badge>
          )}
        </div>
      )
    },
    {
      key: "actions",
      label: "ACTIONS",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate(`/department/production/bom/view/${row.id}`)}
            className="p-1.5 hover:bg-blue-50 rounded-md text-blue-600 transition-colors"
            title="View Details"
          >
            <Eye size={16} />
          </button>
          <button 
            onClick={() => handleMaterialRequest(row.id)}
            className="p-1.5 hover:bg-blue-50 rounded-md text-blue-600 transition-colors"
            title="Send Material Request"
          >
            <Send size={16} />
          </button>
          <button 
            onClick={() => navigate(`/department/production/bom/create?bomId=${row.id}`)}
            className="p-1.5 hover:bg-slate-100 rounded-md text-slate-600 transition-colors"
            title="Edit BOM"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={() => handleDelete(row.id)}
            className="p-1.5 hover:bg-red-50 rounded-md text-red-600 transition-colors"
            title="Delete BOM"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 space-y-2 bg-slate-50/50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Bill of Materials Revisions
          </h2>
          <p className="text-slate-500 text-xs">
            Showing all BOM versions and active status. Use the filter to select a specific project.
          </p>
        </div>
        {!isSendToAdminTask && (
          <Button 
            variant="primary" 
            icon={Plus} 
            onClick={() => navigate("/department/production/bom/create")}
          >
            Create New BOM
          </Button>
        )}
      </div>

      {isSendToAdminTask && filteredBOMs.length === 0 && !loading && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="text-amber-600" size={20} />
            <p className="text-amber-800 text-sm">
              No **Approved Finished Good BOMs** found for this project. Please ensure the Finished Good BOM is created and approved before sending it to the admin.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      {!isSendToAdminTask && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <Card key={idx} className="border-none shadow-sm overflow-hidden relative">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-${stat.color}-50 text-${stat.color}-600`}>
                  <stat.icon size={24} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                  <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                </div>
              </CardContent>
              <div className={`absolute top-0 left-0 w-1 h-full bg-${stat.color}-500`} />
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      {!isSendToAdminTask && (
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex-1 max-w-md">
              <SearchableSelect
                label="Filter by Root Card"
                options={rootCardOptions}
                value={rootCardFilter}
                onChange={(val) => setRootCardFilter(val)}
                placeholder="Select Root Card..."
                containerClassName="mt-0"
                icon={<ClipboardList size={16} />}
              />
            </div>
            
            <div className="flex items-center gap-2 mt-6">
              {rootCardFilter && (
                <Button 
                  variant="ghost" 
                  className="text-xs h-9 px-2 text-slate-500 hover:text-red-600"
                  onClick={() => setRootCardFilter(null)}
                >
                  CLEAR
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card className={`border-none shadow-sm overflow-hidden ${!rootCardFilter && isSendToAdminTask ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
        <CardContent className="p-0">
          <DataTable 
            columns={columns}
            data={filteredBOMs}
            loading={loading}
            emptyMessage={
              isSendToAdminTask ? "No Approved Finished Good BOMs available to send." : "No Bill of Materials found."
            }
          />
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded bg-red-50 border border-red-200">
          <AlertCircle size={20} className="text-red-600" />
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {selectedBOM && (
        <MaterialRequestModal
          isOpen={isRequestModalOpen}
          onClose={() => {
            setIsRequestModalOpen(false);
            setSelectedBOM(null);
            fetchData(); // Refresh list to see status change
          }}
          bom={selectedBOM}
        />
      )}
    </div>
  );
};

export default ViewBOMsPage;
